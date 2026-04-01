"""
evaluate.py — Check model accuracy against Testing Audio

Usage:
    python evaluate.py

Output:
    Console table with per-file: truth, prediction, confidence, pass/fail
    Console summary: overall accuracy
    reports/evaluation_<timestamp>.json — saved report for future comparison

Audio source: Testing Audio/*.mp3
Model source: models/model.pkl

Ground truth is inferred from the filename:
    "09 Green Tree Frog.mp3" → "Green Tree Frog"
"""

import json
import os
import re
import warnings
from datetime import datetime

import joblib
import librosa
import numpy as np

from config import (
    HOP_LENGTH, N_FFT, N_MFCC, SAMPLE_RATE, WIN_SEC,
)

warnings.filterwarnings("ignore")

TESTING_DIR  = "Testing Audio"
MODEL_DIR    = "models"
REPORTS_DIR  = "reports"

# Sliding window — match training window size and stride
WINDOW_DURATION      = WIN_SEC
WINDOW_STEP          = WIN_SEC * 0.67   # ~0.2s stride, same as old test script
CONFIDENCE_THRESHOLD = 0.0


def extract_features(y):
    """616-feature vector matching train.py exactly."""
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


def species_from_filename(fname):
    """Strip numeric prefix: '09 Green Tree Frog.mp3' → 'Green Tree Frog'"""
    name = os.path.splitext(fname)[0]
    return re.sub(r"^\d+\s*", "", name).strip()


def predict_file(pipeline, path):
    """
    Slide a window over the audio file and take the mode prediction.
    Returns (predicted_species, avg_confidence_for_that_species).
    """
    y, _ = librosa.load(path, sr=SAMPLE_RATE, mono=True)

    win_samples  = int(WINDOW_DURATION * SAMPLE_RATE)
    step_samples = int(WINDOW_STEP * SAMPLE_RATE)

    predictions, confidences = [], []

    for start in range(0, len(y) - win_samples + 1, step_samples):
        window = y[start : start + win_samples]
        feat   = extract_features(window).reshape(1, -1)
        proba  = pipeline.predict_proba(feat)[0]
        conf   = float(proba.max())
        label  = pipeline.classes_[proba.argmax()]

        if conf >= CONFIDENCE_THRESHOLD and label != "Background":
            predictions.append(label)
            confidences.append(conf)

    if not predictions:
        return "Unknown", 0.0

    final    = max(set(predictions), key=predictions.count)
    avg_conf = float(np.mean([c for p, c in zip(predictions, confidences) if p == final]))
    return final, avg_conf


def main():
    os.makedirs(REPORTS_DIR, exist_ok=True)

    model_path = os.path.join(MODEL_DIR, "model.pkl")
    if not os.path.exists(model_path):
        print(f"No model found at {model_path}. Run train.py first.")
        return

    pipeline   = joblib.load(model_path)
    test_files = sorted(f for f in os.listdir(TESTING_DIR) if f.lower().endswith(".mp3"))

    if not test_files:
        print(f"No .mp3 files found in {TESTING_DIR}/")
        return

    results = []
    correct = 0

    col_file  = 40
    col_truth = 30
    col_pred  = 30
    total_width = col_file + col_truth + col_pred + 10

    print(f"\n{'File':<{col_file}} {'Truth':<{col_truth}} {'Predicted':<{col_pred}} {'Conf':>6}  ")
    print("-" * total_width)

    for fname in test_files:
        truth               = species_from_filename(fname)
        predicted, conf     = predict_file(pipeline, os.path.join(TESTING_DIR, fname))
        is_correct          = truth.lower() == predicted.lower()
        correct            += int(is_correct)
        status              = "PASS" if is_correct else "FAIL"

        print(
            f"{fname:<{col_file}} "
            f"{truth:<{col_truth}} "
            f"{predicted:<{col_pred}} "
            f"{conf:>5.1%}  {status}"
        )

        results.append({
            "file":       fname,
            "truth":      truth,
            "predicted":  predicted,
            "confidence": round(conf, 4),
            "correct":    is_correct,
        })

    accuracy = correct / len(results) if results else 0

    print("-" * total_width)
    print(f"\nAccuracy: {correct}/{len(results)}  ({accuracy:.1%})\n")

    report = {
        "timestamp": datetime.now().isoformat(),
        "model":     model_path,
        "config": {
            "sample_rate":     SAMPLE_RATE,
            "n_mfcc":          N_MFCC,
            "n_fft":           N_FFT,
            "hop_length":      HOP_LENGTH,
            "window_duration": WINDOW_DURATION,
            "window_step":     WINDOW_STEP,
        },
        "summary": {
            "total":    len(results),
            "correct":  correct,
            "accuracy": round(accuracy, 4),
        },
        "results": results,
    }

    timestamp   = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_path = os.path.join(REPORTS_DIR, f"evaluation_{timestamp}.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"Report saved to {report_path}")


if __name__ == "__main__":
    main()
