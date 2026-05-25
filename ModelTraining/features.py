"""
features.py — Shared feature extraction and data loading

Imported by train.py and evaluate.py
All parameters come from config.py.
"""

import os
import random
import warnings

import librosa
import numpy as np
from scipy.fft import dct as scipy_dct

from config import AUG_NOISE_LVL, HOP_LENGTH, N_FFT, N_MFCC, SAMPLE_RATE, WIN_SEC

warnings.filterwarnings("ignore")

TRAINING_DIR   = os.path.join("datasets", "updated", "Training Audio")
BACKGROUND_DIR = "Background Audio"

WIN_SAMPLES = int(SAMPLE_RATE * WIN_SEC)

# Mel filterbank built once at import time — matches Meyda's createMelFilterBank:
#   HTK mel scale (1125*ln(1+f/700)), fmin=0, unnormalized triangular filters
# Meyda's mel band loop runs j < bufferSize/2 (1024 bins, not 1025),
# so we truncate the librosa filterbank to the first N_FFT//2 columns.
_N_BINS  = N_FFT // 2   # 1024
_N_MELS  = 128
_MEL_FB  = librosa.filters.mel(sr=SAMPLE_RATE, n_fft=N_FFT, n_mels=_N_MELS,
                               fmin=0.0, htk=True, norm=None)[:, :_N_BINS]


def _meyda_mfcc(y, sr, n_fft, hop_length, n_mfcc):
    """MFCC frames matching Meyda.js exactly.

    Pipeline:
      ampSpectrum² → mel filterbank (HTK, fmin=0, unnorm) → log(x+1) → unnorm DCT-II
    Returns shape (n_mfcc, n_frames).
    """
    n_bins = n_fft // 2

    # Reuse the module-level filterbank when params match config; rebuild otherwise.
    if sr == SAMPLE_RATE and n_fft == N_FFT and n_bins == _N_BINS:
        mel_fb = _MEL_FB
    else:
        mel_fb = librosa.filters.mel(sr=sr, n_fft=n_fft, n_mels=_N_MELS,
                                     fmin=0.0, htk=True, norm=None)[:, :n_bins]

    # center=False: Meyda iterates i=0, hop, 2*hop, ... while i+fftSize<=len
    D   = librosa.stft(y, n_fft=n_fft, hop_length=hop_length, window='hann', center=False)
    amp = np.abs(D)                          # (n_fft//2+1, n_frames)
    pow_spec = amp[:n_bins, :] ** 2          # (1024, n_frames) — first 1024 bins only

    mel_energy = mel_fb @ pow_spec           # (128, n_frames)
    mel_log    = np.log(mel_energy + 1.0)    # Meyda: Math.log(x + 1)

    # Unnormalized DCT-II: 2 * sum(x[n] * cos(pi/N * (n+0.5) * k))
    mfcc = scipy_dct(mel_log, type=2, norm=None, axis=0)[:n_mfcc, :]
    return mfcc


def extract_features(y, n_mfcc=N_MFCC, n_fft=N_FFT, hop_length=HOP_LENGTH, sr=SAMPLE_RATE):
    """MFCC + delta + delta-delta + spectral contrast + centroid (mean & std each).

    MFCC computation matches Meyda.js so on-device inference uses the same feature
    space as training. Delta width=9 (half-width 4) matches classifierService.js D=4.
    """
    mfcc   = _meyda_mfcc(y, sr, n_fft, hop_length, n_mfcc)
    delta1 = librosa.feature.delta(mfcc, order=1, width=9)
    delta2 = librosa.feature.delta(mfcc, order=2, width=9)

    # Compute STFT once for contrast + centroid (center=False, amplitude spectrum)
    D = librosa.stft(y, n_fft=n_fft, hop_length=hop_length, window='hann', center=False)
    S = np.abs(D)   # amplitude spectrum (n_fft//2+1, n_frames)

    contrast = librosa.feature.spectral_contrast(S=S, sr=sr, n_fft=n_fft,
                                                 n_bands=6, fmin=200.0)
    centroid = librosa.feature.spectral_centroid(S=S, sr=sr)

    feats = []
    for m in [mfcc, delta1, delta2, contrast, centroid]:
        feats.append(np.mean(m, axis=1))
        feats.append(np.std(m, axis=1))
    return np.hstack(feats)


def load_segment(path, sr=SAMPLE_RATE, win_sec=WIN_SEC):
    """Load a fixed-length window from a random position in the file.
    For short clips this is effectively the whole file.
    For long recordings this ensures the full recording contributes,
    not just the first WIN_SEC seconds."""
    samples = int(sr * win_sec)
    y_full, _ = librosa.load(path, sr=sr)
    if len(y_full) <= samples:
        return np.pad(y_full, (0, samples - len(y_full)))
    start = np.random.randint(0, len(y_full) - samples)
    return y_full[start:start + samples]


def augment_time(y):
    rate = np.random.uniform(0.9, 1.1)
    y_st = librosa.effects.time_stretch(y, rate=rate)
    return (np.pad(y_st, (0, len(y) - len(y_st))) if len(y_st) < len(y) else y_st)[:len(y)]


def augment_pitch(y, sr=SAMPLE_RATE):
    steps = np.random.uniform(-2, 2)
    return librosa.effects.pitch_shift(y, sr=sr, n_steps=steps)[:len(y)]


def augment_noise(y, background_files):
    if not background_files:
        return y
    noise = load_segment(random.choice(background_files))
    return y + AUG_NOISE_LVL * noise


def build_dataset(**kwargs):
    """Load all training WAVs with 4x augmentation. Accepts optional overrides
    for n_mfcc, n_fft, hop_length, sr, win_sec, aug_noise_lvl to support sweep.py."""
    sr             = kwargs.get("sr",            SAMPLE_RATE)
    win_sec        = kwargs.get("win_sec",        WIN_SEC)
    n_mfcc         = kwargs.get("n_mfcc",         N_MFCC)
    n_fft          = kwargs.get("n_fft",          N_FFT)
    hop_len        = kwargs.get("hop_length",     HOP_LENGTH)
    aug_noise_lvl  = kwargs.get("aug_noise_lvl",  AUG_NOISE_LVL)

    np.random.seed(42)
    random.seed(42)

    background_files = []
    if os.path.isdir(BACKGROUND_DIR):
        background_files = [
            os.path.join(BACKGROUND_DIR, f)
            for f in os.listdir(BACKGROUND_DIR) if f.lower().endswith(".wav")
        ]

    X, y = [], []
    for species in sorted(os.listdir(TRAINING_DIR)):
        spath = os.path.join(TRAINING_DIR, species)
        if not os.path.isdir(spath):
            continue
        for fname in sorted(os.listdir(spath)):
            if not fname.lower().endswith((".wav", ".mp3")):
                continue
            try:
                seg = load_segment(os.path.join(spath, fname), sr=sr, win_sec=win_sec)
            except Exception:
                continue
            noise_aug = seg + aug_noise_lvl * load_segment(random.choice(background_files), sr=sr, win_sec=win_sec) if background_files else seg
            for aug in [seg, augment_time(seg), augment_pitch(seg, sr), noise_aug]:
                X.append(extract_features(aug, n_mfcc=n_mfcc, n_fft=n_fft, hop_length=hop_len, sr=sr))
                y.append(species)

    for path in background_files:
        try:
            seg = load_segment(path, sr=sr, win_sec=win_sec)
            X.append(extract_features(seg, n_mfcc=n_mfcc, n_fft=n_fft, hop_length=hop_len, sr=sr))
            y.append("Background")
        except Exception:
            continue

    return np.array(X), np.array(y)
