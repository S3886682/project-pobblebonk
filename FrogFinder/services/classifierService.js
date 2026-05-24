import { useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useAudioRecorder, AudioModule } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { Buffer } from 'buffer';
import Meyda from 'meyda';


class ClassifierService {
  SR = 32000;
  WIN_SAMPLES = Math.round(this.SR * 0.3);     // 9600
  STRIDE_SAMPLES = Math.round(this.SR * 0.2);  // 6400
  N_MFCC = 40;
  FFT_SIZE = 2048;
  HOP_SIZE = 512;
  _meydaLogged = false;

  constructor() {
    this.model = require('./svm_model.json');
  }

  rbfKernel(x, y, gamma) {
    let norm = 0;
    for (let i = 0; i < x.length; i++) { const d = x[i] - y[i]; norm += d * d; }
    return Math.exp(-gamma * norm);
  }

  colMean(matrix) {
    if (!matrix.length) return [];
    const k = matrix[0].length;
    const mean = new Array(k).fill(0);
    for (const row of matrix) for (let j = 0; j < k; j++) mean[j] += row[j];
    return mean.map(v => v / matrix.length);
  }

  colStd(matrix, mean) {
    if (!matrix.length) return new Array(mean.length).fill(0);
    const variance = new Array(mean.length).fill(0);
    for (const row of matrix) for (let j = 0; j < mean.length; j++) { const d = row[j] - mean[j]; variance[j] += d * d; }
    return variance.map(v => Math.sqrt(v / matrix.length));
  }

  predict(features) {
    const scaled = features.map((v, i) => (v - this.model.scaler_mean[i]) / this.model.scaler_scale[i]);
    const nClasses = this.model.classes.length;
    const votes = new Array(nClasses).fill(0);
    const margins = new Array(nClasses).fill(0);

    // Precompute kernel values for all support vectors once
    const kernelVals = this.model.support_vectors.map(sv => this.rbfKernel(scaled, sv, this.model.gamma));

    // Build SV class start indices from n_support
    const svStart = new Array(nClasses).fill(0);
    for (let c = 1; c < nClasses; c++) svStart[c] = svStart[c - 1] + this.model.n_support[c - 1];

    // OVO: one binary classifier per pair (i, j), i < j
    let pairIdx = 0;
    for (let i = 0; i < nClasses; i++) {
      for (let j = i + 1; j < nClasses; j++) {
        let sum = this.model.intercept[pairIdx];

        // SVs belonging to class i: dual_coef row is j-1
        for (let s = 0; s < this.model.n_support[i]; s++) {
          sum += this.model.dual_coef[j - 1][svStart[i] + s] * kernelVals[svStart[i] + s];
        }
        // SVs belonging to class j: dual_coef row is i
        for (let s = 0; s < this.model.n_support[j]; s++) {
          sum += this.model.dual_coef[i][svStart[j] + s] * kernelVals[svStart[j] + s];
        }

        if (sum > 0) {
          votes[i]++;
          margins[i] += Math.abs(sum);
        } else {
          votes[j]++;
          margins[j] += Math.abs(sum);
        }
        pairIdx++;
      }
    }

    const winnerIdx = votes.indexOf(Math.max(...votes));
    // Confidence = fraction of pairwise votes won by the winner (each class faces n-1 opponents)
    //const confidence = votes[winnerIdx] / (nClasses - 1);
    const totalMargin = margins.reduce((a, b) => a + b, 0);
    const confidence = margins[winnerIdx] / totalMargin;
    return { label: this.model.classes[winnerIdx], confidence };
  }

  computeDelta(matrix) {
    const D = 4;
    const norm = 2 * (D * (D + 1) * (2 * D + 1)) / 6; // = 60
    const n = matrix.length;
    const k = matrix[0].length;
    return matrix.map((_, i) => {
      const d = new Array(k).fill(0);
      for (let w = 1; w <= D; w++) {
        const prev = matrix[Math.max(0, i - w)];
        const next = matrix[Math.min(n - 1, i + w)];
        for (let j = 0; j < k; j++) d[j] += w * (next[j] - prev[j]);
      }
      return d.map(v => v / norm);
    });
  }

  computeContrastFrames(segment) {
    const nBands = 6;
    const quantile = 0.02;
    // Octave band edges in Hz: [0, 200, 400, 800, 1600, 3200, 6400, 12800, SR/2]
    const edgesHz = [0];
    for (let b = 0; b <= nBands; b++) edgesHz.push(200 * Math.pow(2, b));
    edgesHz.push(this.SR / 2);

    const frames = [];
    for (let i = 0; i + this.FFT_SIZE <= segment.length; i += this.HOP_SIZE) {
      const frame = segment.slice(i, i + this.FFT_SIZE);
      const power = Meyda.extract('powerSpectrum', frame);
      if (!power) { frames.push(new Array(nBands + 1).fill(0)); continue; }
      const mags = power.map(Math.sqrt);
      const nBins = mags.length;
      const edgesBins = edgesHz.map(f => Math.min(nBins, Math.round(f * this.FFT_SIZE / this.SR)));

      const contrast = [];
      for (let b = 0; b <= nBands; b++) {
        const band = Array.from(mags.slice(edgesBins[b], edgesBins[b + 1])).sort((a, b) => a - b);
        if (!band.length) { contrast.push(0); continue; }
        const nQ = Math.max(1, Math.round(quantile * band.length));
        const valley = band.slice(0, nQ).reduce((s, v) => s + v, 0) / nQ;
        const peak = band.slice(-nQ).reduce((s, v) => s + v, 0) / nQ;
        contrast.push(10 * Math.log10((peak + 1e-10) / (valley + 1e-10)));
      }
      frames.push(contrast);
    }
    return frames;
  }

  //let _meydaLogged = false;
  extractFeatures(segment) {
    Meyda.sampleRate = this.SR;
    Meyda.numberOfMFCCCoefficients = this.N_MFCC;
    //Meyda.numberOfMelBands = this.N_MFCC;
    //Meyda.bufferSize = this.FFT_SIZE;
    //Meyda.windowingFunction = 'hanning';
    //here b

    const mfccFrames = [];
    const centroidFrames = [];
    for (let i = 0; i + this.FFT_SIZE <= segment.length; i += this.HOP_SIZE) {
      const frame = segment.slice(i, i + this.FFT_SIZE);
      const mfcc = Meyda.extract('mfcc', frame);
      const centroid = Meyda.extract('spectralCentroid', frame);
      if (!this._meydaLogged && mfcc) {
        console.log('[MEYDA] numberOfMelBands:', Meyda.numberOfMelBands);
        console.log('[MEYDA] numberOfMFCCCoefficients:', Meyda.numberOfMFCCCoefficients);
        console.log('[MEYDA] mfcc.length:', mfcc.length);
        console.log('[MEYDA] mfcc type:', Object.prototype.toString.call(mfcc));
        this._meydaLogged = true;
      }
      if (mfcc) mfccFrames.push(Array.from(mfcc));
      centroidFrames.push([centroid ?? 0]);
    }

    const delta1 = this.computeDelta(mfccFrames);
    const delta2 = this.computeDelta(delta1);
    const contrastFrames = this.computeContrastFrames(segment);

    const mfccMean = this.colMean(mfccFrames);   const mfccStd = this.colStd(mfccFrames, mfccMean);
    const d1Mean = this.colMean(delta1);         const d1Std = this.colStd(delta1, d1Mean);
    const d2Mean = this.colMean(delta2);         const d2Std = this.colStd(delta2, d2Mean);
    const contMean = this.colMean(contrastFrames); const contStd = this.colStd(contrastFrames, contMean);
    const centMean = this.colMean(centroidFrames); const centStd = this.colStd(centroidFrames, centMean);

    // Matches server.py hstack order: mfcc, d1, d2, contrast, centroid × (mean, std)
    return [
      ...mfccMean, ...mfccStd,
      ...d1Mean,   ...d1Std,
      ...d2Mean,   ...d2Std,
      ...contMean, ...contStd,
      ...centMean, ...centStd,
    ];
  }

  majorityVote(preds) {
    // preds is [{label, confidence}, ...]
    // confidence = window agreement: fraction of windows that voted for the winner
    const filtered = preds.filter(p => p.label !== 'Background');
    if (!filtered.length) {
      // All windows said Background — confidence = fraction of total that agreed
      return { label: 'Background', confidence: preds.length / preds.length };
    }
    const counts = {};
    for (const { label } of filtered) {
      counts[label] = (counts[label] || 0) + 1;
    }
    const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    // Window agreement: how many non-background windows chose the winner
    return { label: winner, confidence: counts[winner] / filtered.length };
  }

  processAudio = async (uri, setStatus, setProgress) => {
    setStatus('Reading file...');
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
    const bytes = Buffer.from(base64, 'base64');

    setStatus('Decoding PCM...');
    let dataOffset = -1, fileSr = this.SR, bitsPerSample = 16, numChannels = 1;
    try {
      let pos = 12;
      while (pos + 8 <= bytes.length) {
        const chunkId   = bytes.toString('ascii', pos, pos + 4);
        const chunkSize = bytes.readUInt32LE(pos + 4);
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
    } catch (_) {}

    if (dataOffset < 0) throw new Error('Could not parse WAV header');
    if (bitsPerSample !== 16) throw new Error(`Unsupported bit depth (${bitsPerSample}-bit). Please use 16-bit WAV.`);

    const bytesPerSample = bitsPerSample / 8;
    const nSamplesTotal  = Math.floor((bytes.length - dataOffset) / (bytesPerSample * numChannels));
    const monoData = new Float32Array(nSamplesTotal);
    for (let i = 0; i < nSamplesTotal; i++) {
      const offset = dataOffset + i * bytesPerSample * numChannels;
      monoData[i] = bytes.readInt16LE(offset) / 32768;
    }

    let audioData = monoData;
    if (fileSr !== this.SR) {
      setStatus(`Resampling from ${fileSr} Hz to ${this.SR} Hz...`);
      console.log(`[WAV] Resampling from ${fileSr} Hz → ${this.SR} Hz`);
      const ratio = fileSr / this.SR;
      const newLen = Math.round(monoData.length / ratio);
      audioData = new Float32Array(newLen);
      for (let i = 0; i < newLen; i++) {
        const pos  = i * ratio;
        const idx  = Math.floor(pos);
        const frac = pos - idx;
        const a    = monoData[Math.min(idx,     monoData.length - 1)];
        const b    = monoData[Math.min(idx + 1, monoData.length - 1)];
        audioData[i] = a + frac * (b - a);
      }
    }
    console.log(`[WAV] dataOffset=${dataOffset} sr=${fileSr} bits=${bitsPerSample} ch=${numChannels} samples=${audioData.length}`);

    setStatus('Classifying...');
    const totalWindows = Math.max(0, Math.floor((audioData.length - this.WIN_SAMPLES) / this.STRIDE_SAMPLES) + 1);
    setProgress(0);

    const windowPredictions = [];
    let firstFeatures = null;
    let windowIdx = 0;

    for (let start = 0; start + this.WIN_SAMPLES <= audioData.length; start += this.STRIDE_SAMPLES) {
      const segment = audioData.slice(start, start + this.WIN_SAMPLES);
      const features = this.extractFeatures(segment);

      if (!firstFeatures) {
        firstFeatures = features;
        const scaled = features.map((v, i) => (v - this.model.scaler_mean[i]) / this.model.scaler_scale[i]);
        const kernelVals = this.model.support_vectors.map(sv => this.rbfKernel(scaled, sv, this.model.gamma));
        const maxK = Math.max(...kernelVals);
        const meanK = kernelVals.reduce((a, b) => a + b, 0) / kernelVals.length;
        console.log('[FEATURES] count:', features.length);
        console.log('[FEATURES] first 10 raw:', features.slice(0, 10));
        console.log('[FEATURES] first 10 scaled:', scaled.slice(0, 10));
        console.log('[KERNEL] max:', maxK, 'mean:', meanK);
        console.log('[KERNEL] non-zero count:', kernelVals.filter(v => v > 1e-10).length, '/', kernelVals.length);
      }

      windowPredictions.push(this.predict(features));
      windowIdx++;
      setProgress(windowIdx / totalWindows);
      if (windowIdx % 5 === 0) await new Promise(r => setTimeout(r, 0));
    }

    console.log('[PREDICT] window predictions:', windowPredictions);

    if (!windowPredictions.length) throw new Error('Audio too short to classify');

    const { label, confidence } = this.majorityVote(windowPredictions);
    return { label, confidence, windowCount: windowPredictions.length };
  };

  

  

  
}
export const classifierService = new ClassifierService();





