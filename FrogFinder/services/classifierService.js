/*
 * Purpose: Core audio classification pipeline — reads a WAV file, decodes
 *          16-bit PCM, resamples to 32 kHz, extracts MFCC and spectral-contrast
 *          features per 1-second window, and runs an on-device SVM to identify
 *          the Australian frog species present in the recording.
 * Inputs:  processAudio(uri, setStatus, setProgress, onWaveformReady) where uri
 *          is a local audio file path; the callbacks receive live UI updates.
 * Outputs: { label, confidence, all, windowCount, windows, waveformSamples,
 *            frogBuckets, frogLabels, audioDuration }
 */
import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';
import Meyda from 'meyda';

// ---------------------------------------------------------------------------
// Audio / model constants — must match config.py + export_model_json.py
// ---------------------------------------------------------------------------
const SR             = 32000;
const RMS_SILENCE_THRESHOLD = 0.008; // ~-42 dBFS — skips near-silence without cutting quiet frog calls
const WIN_SAMPLES    = Math.round(SR * 1.0);    // 32000 — 1 s window
const STRIDE_SAMPLES = Math.round(SR * 0.67);   // 21440 — 67 % step (matches evaluate.py, ~25 % fewer windows)
const N_MFCC         = 30;
const FFT_SIZE       = 2048;
const HOP_SIZE       = 256;
const N_BANDS        = 6;
const QUANTILE       = 0.02;

// ---------------------------------------------------------------------------
// Spectral contrast band edges — computed once at module load.
// Matches librosa.feature.spectral_contrast(n_bands=6, fmin=200):
//   edges = [0, 200, 400, 800, 1600, 3200, 6400, SR/2]  (8 values → 7 bands)
// ---------------------------------------------------------------------------
const N_BINS    = FFT_SIZE / 2 + 1;
const edgesHz   = [0];
for (let b = 0; b < N_BANDS; b++) edgesHz.push(200 * Math.pow(2, b));
edgesHz.push(SR / 2);
const EDGES_BINS = edgesHz.map(f => Math.min(N_BINS, Math.round(f * FFT_SIZE / SR)));

// ---------------------------------------------------------------------------
// Matrix helpers — Float64Array accumulators reduce GC pressure
// ---------------------------------------------------------------------------
function colMean(matrix) {
  if (!matrix.length) return [];
  const k   = matrix[0].length;
  const acc = new Float64Array(k);
  for (const row of matrix) for (let j = 0; j < k; j++) acc[j] += row[j];
  return Array.from(acc, v => v / matrix.length);
}

function colStd(matrix, mean) {
  if (!matrix.length) return new Array(mean.length).fill(0);
  const k   = mean.length;
  const acc = new Float64Array(k);
  for (const row of matrix) for (let j = 0; j < k; j++) { const d = row[j] - mean[j]; acc[j] += d * d; }
  return Array.from(acc, v => Math.sqrt(v / matrix.length));
}

function computeDelta(matrix) {
  if (!matrix.length) return [];
  const D = 4, norm = 60; // norm = 2 * sum(w^2 for w=1..4) = 60
  const n = matrix.length, k = matrix[0].length;
  return matrix.map((_, i) => {
    const d = new Float64Array(k);
    for (let w = 1; w <= D; w++) {
      const prev = matrix[Math.max(0, i - w)];
      const next = matrix[Math.min(n - 1, i + w)];
      for (let j = 0; j < k; j++) d[j] += w * (next[j] - prev[j]);
    }
    return Array.from(d, v => v / norm);
  });
}

function contrastFromMags(mags) {
  const contrast = [];
  for (let b = 0; b <= N_BANDS; b++) {
    const band = Array.from(mags.slice(EDGES_BINS[b], EDGES_BINS[b + 1])).sort((a, b) => a - b);
    if (!band.length) { contrast.push(0); continue; }
    const nQ    = Math.max(1, Math.round(QUANTILE * band.length));
    const valley = band.slice(0, nQ).reduce((s, v) => s + v, 0) / nQ;
    const peak   = band.slice(-nQ).reduce((s, v) => s + v, 0) / nQ;
    contrast.push(10 * Math.log10((peak + 1e-10) / (valley + 1e-10)));
  }
  return contrast;
}

// ---------------------------------------------------------------------------
// Feature extraction — single Meyda call per hop shares one FFT across
// mfcc, spectralCentroid, and powerSpectrum (~3x fewer FFTs vs separate calls)
// ---------------------------------------------------------------------------
function extractFeatures(segment) {
  Meyda.sampleRate  = SR;
  Meyda.bufferSize  = FFT_SIZE;  // default is 512 — must match the frames we pass

  const mfccFrames     = [];
  const centroidFrames = [];
  const contrastFrames = [];

  for (let i = 0; i + FFT_SIZE <= segment.length; i += HOP_SIZE) {
    const frame  = segment.slice(i, i + FFT_SIZE);
    const result = Meyda.extract(['spectralCentroid', 'powerSpectrum'], frame);

    if (result?.powerSpectrum) {
      const mel    = applyMelFilterbank(result.powerSpectrum);
      const melLog = Array.from(mel, e => Math.log(e + 1));
      mfccFrames.push(Array.from(mfccDCT(melLog)));
    }
    centroidFrames.push([result?.spectralCentroid ?? 0]);
    contrastFrames.push(
      result?.powerSpectrum
        ? contrastFromMags(result.powerSpectrum.map(Math.sqrt))
        : new Array(N_BANDS + 1).fill(0)
    );
  }

  const delta1 = computeDelta(mfccFrames);
  const delta2 = computeDelta(delta1);

  const mfccMean = colMean(mfccFrames);    const mfccStd = colStd(mfccFrames, mfccMean);
  const d1Mean   = colMean(delta1);         const d1Std   = colStd(delta1, d1Mean);
  const d2Mean   = colMean(delta2);         const d2Std   = colStd(delta2, d2Mean);
  const contMean = colMean(contrastFrames); const contStd = colStd(contrastFrames, contMean);
  const centMean = colMean(centroidFrames); const centStd = colStd(centroidFrames, centMean);

  return [
    ...mfccMean, ...mfccStd,
    ...d1Mean,   ...d1Std,
    ...d2Mean,   ...d2Std,
    ...contMean, ...contStd,
    ...centMean, ...centStd,
  ];
}

// ---------------------------------------------------------------------------
// SVM — precompute per-model caches once at load time for faster inference
// ---------------------------------------------------------------------------
const MODEL = require('./svm_model.json');

const N_MELS = 128;
const MEL_FB = MODEL.mel_filterbank.map(([start, weights]) => ({
  start,
  weights: new Float64Array(weights),
}));

function applyMelFilterbank(powerSpectrum) {
  const mel = new Float64Array(N_MELS);
  for (let m = 0; m < N_MELS; m++) {
    const { start, weights } = MEL_FB[m];
    let energy = 0;
    for (let k = 0; k < weights.length; k++) energy += weights[k] * powerSpectrum[start + k];
    mel[m] = energy;
  }
  return mel;
}

function mfccDCT(melLog) {
  const N   = melLog.length;
  const out = new Float64Array(N_MFCC);
  for (let k = 0; k < N_MFCC; k++) {
    let sum = 0;
    const c = Math.PI / N * k;
    for (let n = 0; n < N; n++) sum += melLog[n] * Math.cos(c * (n + 0.5));
    out[k] = 2 * sum;
  }
  return out;
}


function buildCache(model) {
  const nClasses = model.classes.length;
  const svStart  = new Array(nClasses).fill(0);
  for (let c = 1; c < nClasses; c++) svStart[c] = svStart[c - 1] + model.n_support[c - 1];

  // Precompute ||sv||^2 so the RBF kernel uses ||x-sv||^2 = ||x||^2 - 2x·sv + ||sv||^2
  // instead of computing d = x-sv element-wise (avoids O(n*d) extra memory per call)
  const svNormSq = model.support_vectors.map(sv => {
    let s = 0; for (let i = 0; i < sv.length; i++) s += sv[i] * sv[i]; return s;
  });
  const svArrays = model.support_vectors.map(sv => new Float64Array(sv));
  const dualCoef = model.dual_coef.map(row => new Float64Array(row));
  return { nClasses, svStart, svNormSq, svArrays, dualCoef };
}

const CACHE = buildCache(MODEL);

function predict(features) {
  const { nClasses, svStart, svNormSq, svArrays, dualCoef } = CACHE;
  const n      = features.length;
  const scaled = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    scaled[i] = (features[i] - MODEL.scaler_mean[i]) / MODEL.scaler_scale[i];
  }

  let xNormSq = 0;
  for (let i = 0; i < n; i++) xNormSq += scaled[i] * scaled[i];

  const kernelVals = svArrays.map((sv, k) => {
    let dot = 0;
    for (let i = 0; i < n; i++) dot += scaled[i] * sv[i];
    return Math.exp(-MODEL.gamma * (xNormSq - 2 * dot + svNormSq[k]));
  });

  const votes   = new Array(nClasses).fill(0);
  const decVals = [];
  let pairIdx = 0;

  for (let i = 0; i < nClasses; i++) {
    for (let j = i + 1; j < nClasses; j++) {
      let sum = MODEL.intercept[pairIdx];
      for (let s = 0; s < MODEL.n_support[i]; s++)
        sum += dualCoef[j - 1][svStart[i] + s] * kernelVals[svStart[i] + s];
      for (let s = 0; s < MODEL.n_support[j]; s++)
        sum += dualCoef[i][svStart[j] + s] * kernelVals[svStart[j] + s];

      decVals.push(sum);
      if (sum > 0) votes[i]++;
      else         votes[j]++;
      pairIdx++;
    }
  }

  const winnerIdx = votes.indexOf(Math.max(...votes));

  if (MODEL.prob_a && MODEL.prob_b) {
    // Mean pairwise Platt probability for the vote winner — avg P(winner beats j) across all 36 matchups.
    // Avoids Wu et al. multiclass coupling, which can give low probability when vote/Platt winners disagree.
    let pairSum = 0, idx = 0;
    for (let i = 0; i < nClasses; i++) {
      for (let j = i + 1; j < nClasses; j++) {
        const raw = 1 / (1 + Math.exp(MODEL.prob_a[idx] * decVals[idx] + MODEL.prob_b[idx]));
        const rij = Math.min(Math.max(raw, 1e-7), 1 - 1e-7);
        if (i === winnerIdx) pairSum += rij;
        else if (j === winnerIdx) pairSum += 1 - rij;
        idx++;
      }
    }
    return { label: MODEL.classes[winnerIdx], confidence: pairSum / (nClasses - 1) };
  }

  return { label: MODEL.classes[winnerIdx], confidence: votes[winnerIdx] / (nClasses - 1) };
}

// Winner by vote count (consistent with per-window display).
// Confidence = sum of per-window Platt for that label / total windows (including background).
// Background windows contribute 0, naturally penalising species that win few windows.
function majorityVote(preds) {
  const filtered = preds.filter(p => p.label !== 'Background');
  if (!filtered.length) return { label: 'No frog found', confidence: 0, all: [] };

  const counts  = {};
  const confSum = {};
  for (const { label, confidence } of filtered) {
    counts[label]  = (counts[label]  || 0) + 1;
    confSum[label] = (confSum[label] || 0) + confidence;
  }

  const n      = preds.length; // denominator includes background windows
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const all    = sorted.map(([label]) => ({ label, confidence: confSum[label] / n })).slice(0, 5);
  return { label: sorted[0][0], confidence: all[0].confidence, all };
}

// ---------------------------------------------------------------------------
// WAV decoding
// ---------------------------------------------------------------------------
function parseWav(bytes) {
  let dataOffset = -1, fileSr = SR, bitsPerSample = 16, numChannels = 1;
  if (bytes.length < 12) return { dataOffset: -1, fileSr, bitsPerSample, numChannels };
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE')
    return { dataOffset: -2, fileSr, bitsPerSample, numChannels };

  let pos = 12;
  while (pos + 8 <= bytes.length) {
    const chunkId   = bytes.toString('ascii', pos, pos + 4);
    const chunkSize = bytes.readUInt32LE(pos + 4);
    if (chunkSize > bytes.length) break;
    if (chunkId === 'fmt ') {
      numChannels   = bytes.readUInt16LE(pos + 10);
      fileSr        = bytes.readUInt32LE(pos + 12);
      bitsPerSample = bytes.readUInt16LE(pos + 22);
    } else if (chunkId === 'data') {
      dataOffset = pos + 8;
      break;
    }
    pos += 8 + chunkSize + (chunkSize % 2);
  }
  return { dataOffset, fileSr, bitsPerSample, numChannels };
}

function decodePcm(bytes, dataOffset, numChannels) {
  const nSamples = Math.floor((bytes.length - dataOffset) / (2 * numChannels));
  const out = new Float32Array(nSamples);
  for (let i = 0; i < nSamples; i++)
    out[i] = bytes.readInt16LE(dataOffset + i * 2 * numChannels) / 32768;
  return out;
}

function resample(mono, fileSr, targetSr) {
  if (fileSr === targetSr) return mono;
  const ratio  = fileSr / targetSr;
  const newLen = Math.round(mono.length / ratio);
  const out    = new Float32Array(newLen);
  for (let i = 0; i < newLen; i++) {
    const pos  = i * ratio;
    const idx  = Math.floor(pos);
    const frac = pos - idx;
    const a    = mono[Math.min(idx,     mono.length - 1)];
    const b    = mono[Math.min(idx + 1, mono.length - 1)];
    out[i] = a + frac * (b - a);
  }
  return out;
}

// ---------------------------------------------------------------------------
// ClassifierService
// ---------------------------------------------------------------------------
class ClassifierService {
  _cancelled = false;

  cancelProcessing() { this._cancelled = true; }

  processAudio = async (uri, setStatus, setProgress, onWaveformReady) => {
    this._cancelled = false;

    const filename = uri.split('/').pop();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\./i.test(filename);
    const displayName = isUuid ? `Recording ${new Date().toLocaleTimeString()}` : filename;
    console.log(`[INPUT] ${displayName}`);
    setStatus('Reading file...');
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
    const bytes  = Buffer.from(base64, 'base64');

    setStatus('Decoding PCM...');
    const { dataOffset, fileSr, bitsPerSample, numChannels } = parseWav(bytes);

    if (dataOffset === -2) throw new Error('Audio must be a WAV file. On Android, please use the file picker to select a WAV recording.');
    if (dataOffset < 0)   throw new Error('WAV file has no audio data chunk. File may be corrupt.');
    if (bitsPerSample !== 16) throw new Error(`Unsupported bit depth (${bitsPerSample}-bit). Please use 16-bit WAV.`);

    const mono      = decodePcm(bytes, dataOffset, numChannels);
    const audioData = resample(mono, fileSr, SR);
    if (fileSr !== SR) setStatus(`Resampling ${fileSr} Hz → ${SR} Hz...`);
    console.log(`[AUDIO] sr=${fileSr} samples=${audioData.length}`);

    // Build waveform thumbnail (80 RMS buckets for display)
    const WAVE_POINTS = 80;
    const bucketSize  = Math.floor(audioData.length / WAVE_POINTS);
    const rawWave     = [];
    for (let i = 0; i < WAVE_POINTS; i++) {
      let sumSq = 0;
      const off = i * bucketSize;
      for (let j = off; j < off + bucketSize && j < audioData.length; j++) sumSq += audioData[j] * audioData[j];
      rawWave.push(Math.sqrt(sumSq / bucketSize));
    }
    const wavePeak        = Math.max(...rawWave, 0.001);
    const waveformSamples = rawWave.map(s => s / wavePeak);
    onWaveformReady?.(waveformSamples); // expose before window loop so UI can shade during analysis

    setStatus('Classifying...');
    const totalWindows = Math.max(0, Math.floor((audioData.length - WIN_SAMPLES) / STRIDE_SAMPLES) + 1);
    setProgress(0);
    await new Promise(r => setTimeout(r, 0)); // flush 0% render before first blocking window

    const windowPredictions = [];
    const windowStartTimes  = [];
    const labelCounts       = {};
    let windowIdx = 0;

    for (let start = 0; start + WIN_SAMPLES <= audioData.length; start += STRIDE_SAMPLES) {
      if (this._cancelled) throw new Error('Classification cancelled');

      const window = audioData.slice(start, start + WIN_SAMPLES);

      // RMS pre-filter — skip feature extraction + SVM for silent windows
      let sumSq = 0;
      for (let k = 0; k < window.length; k++) sumSq += window[k] * window[k];
      const rms = Math.sqrt(sumSq / window.length);

      const pred = rms < RMS_SILENCE_THRESHOLD
        ? { label: 'Background', confidence: 1 }
        : predict(extractFeatures(window));

      windowPredictions.push(pred);
      windowStartTimes.push(start / SR);
      windowIdx++;

      if (pred.label !== 'Background')
        labelCounts[pred.label] = (labelCounts[pred.label] || 0) + 1;

      // Early stopping — when the leader's margin over 2nd place exceeds the
      // number of remaining windows, no other species can possibly win.
      const remaining = totalWindows - windowIdx;
      const sorted    = Object.values(labelCounts).sort((a, b) => b - a);
      if (sorted.length >= 1 && sorted[0] - (sorted[1] ?? 0) > remaining) break;

      // Ticker status every 5 windows
      if (windowIdx % 5 === 0) {
        const leading = Object.entries(labelCounts).sort(([, a], [, b]) => b - a)[0];
        setStatus(leading
          ? `${leading[0]} · ${windowIdx}/${totalWindows}`
          : `Background · ${windowIdx}/${totalWindows}`
        );
      }

      // Yield every window so the native animation thread can render bar frames
      setProgress(windowIdx / totalWindows);
      await new Promise(r => setTimeout(r, 0));
    }

    setProgress(1);
    if (!windowPredictions.length) throw new Error('Audio too short to classify');

    const { label, confidence, all } = majorityVote(windowPredictions);
    const voteSummary = Object.entries(
      windowPredictions.reduce((acc, p) => { acc[p.label] = (acc[p.label] || 0) + 1; return acc; }, {})
    ).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([l, c]) => `${l}:${c}`).join(', ');
    console.log(`[CLASSIFY] ${windowPredictions.length} windows | result: ${label} (${(confidence * 100).toFixed(0)}%) | votes: ${voteSummary}`);

    const winDuration = WIN_SAMPLES / SR;
    const totalSec    = audioData.length / SR;
    const windows = windowPredictions.map((pred, i) => ({
      startSec:   windowStartTimes[i],
      endSec:     windowStartTimes[i] + winDuration,
      label:      pred.label,
      confidence: pred.confidence,
    }));

    // Map window predictions to waveform buckets for coloured display
    const frogBuckets = new Array(WAVE_POINTS).fill(false);
    const frogLabels  = new Array(WAVE_POINTS).fill(null);
    windowPredictions.forEach((pred, idx) => {
      if (pred.label !== 'Background') {
        const bi = Math.min(WAVE_POINTS - 1, Math.floor(windowStartTimes[idx] / totalSec * WAVE_POINTS));
        frogBuckets[bi] = true;
        if (!frogLabels[bi]) frogLabels[bi] = pred.label;
      }
    });

    return { label, confidence, all: all ?? [], windowCount: windowPredictions.length, windows, waveformSamples, frogBuckets, frogLabels, audioDuration: totalSec };
  };
}

export const classifierService = new ClassifierService();
