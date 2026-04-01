"""
train.py — Train the SVM frog classifier

Usage:
    python train.py

Output:
    models/model.pkl          — trained model pipeline (scaler + SVM)
    models/label_classes.json — list of species names the model knows

Audio sources:
    Training Audio/<Species Name>/*.wav  — one folder per species
    Background Audio/*.wav               — loaded as "Background" class

Each WAV is windowed to WIN_SEC, then augmented 4x:
    original, time-stretch, pitch-shift, background-noise mix

GridSearchCV finds the best SVM C and gamma automatically.

To change parameters, edit config.py then re-run this script.
Do NOT modify Testing Audio — that folder is reserved for evaluation only.
"""

import os
import json
import random
import warnings

import joblib
import librosa
import numpy as np
from sklearn.metrics import classification_report
from sklearn.model_selection import GridSearchCV, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

from config import (
    AUG_NOISE_LVL, HOP_LENGTH, N_FFT, N_MFCC,
    SAMPLE_RATE, TEST_SPLIT, WIN_SEC,
)

warnings.filterwarnings("ignore")

TRAINING_DIR   = "Training Audio"
BACKGROUND_DIR = "Background Audio"
MODEL_DIR      = "models"

WIN_SAMPLES = int(SAMPLE_RATE * WIN_SEC)


def load_segment(path):
    y, _ = librosa.load(path, sr=SAMPLE_RATE, duration=WIN_SEC)
    if len(y) < WIN_SAMPLES:
        y = np.pad(y, (0, WIN_SAMPLES - len(y)))
    return y


def augment_time(y):
    rate = np.random.uniform(0.9, 1.1)
    y_st = librosa.effects.time_stretch(y, rate=rate)
    if len(y_st) < len(y):
        y_st = np.pad(y_st, (0, len(y) - len(y_st)))
    return y_st[:len(y)]


def augment_pitch(y):
    steps = np.random.uniform(-2, 2)
    return librosa.effects.pitch_shift(y, sr=SAMPLE_RATE, n_steps=steps)[:len(y)]


def augment_noise(y, background_files):
    if not background_files:
        return y
    noise = load_segment(random.choice(background_files))
    return y + AUG_NOISE_LVL * noise


def extract_features(y):
    """
    616-feature vector:
      MFCC (N_MFCC) + delta + delta-delta + spectral contrast (7) + centroid (1)
      × mean and std = (100+100+100+7+1) × 2 = 616
    """
    mfcc     = librosa.feature.mfcc(y=y, sr=SAMPLE_RATE, n_mfcc=N_MFCC, n_fft=N_FFT, hop_length=HOP_LENGTH)
    delta1   = librosa.feature.delta(mfcc, order=1)
    delta2   = librosa.feature.delta(mfcc, order=2)
    contrast = librosa.feature.spectral_contrast(y=y, sr=SAMPLE_RATE, n_fft=N_FFT, hop_length=HOP_LENGTH)
    centroid = librosa.feature.spectral_centroid(y=y, sr=SAMPLE_RATE, n_fft=N_FFT, hop_length=HOP_LENGTH)
    feats = []
    for m in [mfcc, delta1, delta2, contrast, centroid]:
        feats.append(np.mean(m, axis=1))
        feats.append(np.std(m, axis=1))
    return np.hstack(feats)


def main():
    os.makedirs(MODEL_DIR, exist_ok=True)

    background_files = []
    if os.path.isdir(BACKGROUND_DIR):
        background_files = [
            os.path.join(BACKGROUND_DIR, f)
            for f in os.listdir(BACKGROUND_DIR)
            if f.lower().endswith(".wav")
        ]

    X, y = [], []

    print("Loading + augmenting frog calls...")
    for species in sorted(os.listdir(TRAINING_DIR)):
        spath = os.path.join(TRAINING_DIR, species)
        if not os.path.isdir(spath):
            continue
        print(f"  {species}")
        for fname in os.listdir(spath):
            if not fname.lower().endswith(".wav"):
                continue
            fpath = os.path.join(spath, fname)
            try:
                seg = load_segment(fpath)
            except Exception as e:
                print(f"    [SKIP] {fname}: {e}")
                continue
            X.append(extract_features(seg));                      y.append(species)
            X.append(extract_features(augment_time(seg)));        y.append(species)
            X.append(extract_features(augment_pitch(seg)));       y.append(species)
            X.append(extract_features(augment_noise(seg, background_files))); y.append(species)

    print("Loading background noise as 'Background' class...")
    for path in background_files:
        try:
            seg = load_segment(path)
            X.append(extract_features(seg))
            y.append("Background")
        except Exception as e:
            print(f"  [SKIP] {os.path.basename(path)}: {e}")

    X = np.array(X)
    y = np.array(y)
    print(f"\nSamples: {len(y)}, features: {X.shape[1]}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SPLIT, stratify=y, random_state=42
    )

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("svc",    SVC(kernel="rbf", probability=True)),
    ])
    param_grid = {
        "svc__C":     [0.1, 1, 10],
        "svc__gamma": ["scale", "auto", 0.01],
    }

    print("Running grid search (this will take a while)...")
    grid = GridSearchCV(pipeline, param_grid, cv=5, n_jobs=-1, verbose=1, scoring="f1_macro")
    grid.fit(X_train, y_train)

    print(f"Best params: {grid.best_params_}")
    best_clf = grid.best_estimator_

    print("\nValidation report:")
    print(classification_report(y_test, best_clf.predict(X_test)))

    model_path  = os.path.join(MODEL_DIR, "model.pkl")
    labels_path = os.path.join(MODEL_DIR, "label_classes.json")

    joblib.dump(best_clf, model_path)
    with open(labels_path, "w") as f:
        json.dump(sorted(set(y)), f, indent=2)

    print(f"Model saved:  {model_path}")
    print(f"Classes saved: {labels_path}")


if __name__ == "__main__":
    main()
