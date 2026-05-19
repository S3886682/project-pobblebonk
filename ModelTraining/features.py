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

from config import AUG_NOISE_LVL, HOP_LENGTH, N_FFT, N_MFCC, SAMPLE_RATE, WIN_SEC

warnings.filterwarnings("ignore")

TRAINING_DIR   = os.path.join("datasets", "updated", "Training Audio")
BACKGROUND_DIR = "Background Audio"

WIN_SAMPLES = int(SAMPLE_RATE * WIN_SEC)


def extract_features(y, n_mfcc=N_MFCC, n_fft=N_FFT, hop_length=HOP_LENGTH, sr=SAMPLE_RATE):
    """MFCC + delta + delta-delta + spectral contrast + centroid (mean & std each)."""
    mfcc     = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=n_mfcc, n_fft=n_fft, hop_length=hop_length)
    delta1   = librosa.feature.delta(mfcc, order=1)
    delta2   = librosa.feature.delta(mfcc, order=2)
    contrast = librosa.feature.spectral_contrast(y=y, sr=sr, n_fft=n_fft, hop_length=hop_length)
    centroid = librosa.feature.spectral_centroid(y=y, sr=sr, n_fft=n_fft, hop_length=hop_length)
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
        for fname in os.listdir(spath):
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
