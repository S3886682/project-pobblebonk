"""
evaluate.py — Check model accuracy against Testing Audio

Usage:
    python evaluate.py

Output:
    Console table: file, truth, prediction, confidence, pass/fail
    reports/evaluation_<timestamp>.json — saved for future comparison

Ground truth is inferred from filename: "09 Green Tree Frog.mp3" -> "Green Tree Frog"
"""

import json
import os
import re
import warnings
from datetime import datetime

import joblib
import librosa
import numpy as np

from config import HOP_LENGTH, N_FFT, N_MFCC, SAMPLE_RATE, WIN_SEC
from features import extract_features

warnings.filterwarnings("ignore")

TESTING_DIR = "Testing Audio"
MODEL_DIR   = "models"
REPORTS_DIR = "reports"

WIN_SAMPLES  = int(WIN_SEC * SAMPLE_RATE)
STEP_SAMPLES = int(WIN_SAMPLES * 0.67)


def predict_file(pipeline, path):
    y, _ = librosa.load(path, sr=SAMPLE_RATE, mono=True)
    preds, confs = [], []
    for start in range(0, len(y) - WIN_SAMPLES + 1, STEP_SAMPLES):
        feat  = extract_features(y[start:start + WIN_SAMPLES]).reshape(1, -1)
        proba = pipeline.predict_proba(feat)[0]
        label = pipeline.classes_[proba.argmax()]
        if label != "Background":
            preds.append(label)
            confs.append(float(proba.max()))
    if not preds:
        return "Unknown", 0.0
    final    = max(set(preds), key=preds.count)
    avg_conf = float(np.mean([c for p, c in zip(preds, confs) if p == final]))
    return final, avg_conf


def main():
    os.makedirs(REPORTS_DIR, exist_ok=True)

    model_path = os.path.join(MODEL_DIR, "model.pkl")
    if not os.path.exists(model_path):
        print(f"No model found at {model_path}. Run train.py first.")
        return

    pipeline   = joblib.load(model_path)
    test_files = sorted(f for f in os.listdir(TESTING_DIR) if f.lower().endswith(".mp3"))

    results, correct = [], 0
    W = (42, 32, 32)
    print(f"\n{'File':<{W[0]}} {'Truth':<{W[1]}} {'Predicted':<{W[2]}} {'Conf':>6}")
    print("-" * (sum(W) + 10))

    for fname in test_files:
        truth            = re.sub(r"^\d+\s*", "", os.path.splitext(fname)[0]).strip()
        predicted, conf  = predict_file(pipeline, os.path.join(TESTING_DIR, fname))
        is_correct       = truth.lower() == predicted.lower()
        correct         += int(is_correct)
        print(f"{fname:<{W[0]}} {truth:<{W[1]}} {predicted:<{W[2]}} {conf:>5.1%}  {'PASS' if is_correct else 'FAIL'}")
        results.append({"file": fname, "truth": truth, "predicted": predicted,
                        "confidence": round(conf, 4), "correct": is_correct})

    accuracy = correct / len(results) if results else 0
    print("-" * (sum(W) + 10))
    print(f"\nAccuracy: {correct}/{len(results)}  ({accuracy:.1%})\n")

    report = {
        "timestamp": datetime.now().isoformat(),
        "model":     model_path,
        "config":    {"sample_rate": SAMPLE_RATE, "n_mfcc": N_MFCC, "n_fft": N_FFT,
                      "hop_length": HOP_LENGTH, "window_duration": WIN_SEC,
                      "window_step": round(WIN_SEC * 0.67, 4)},
        "summary":   {"total": len(results), "correct": correct, "accuracy": round(accuracy, 4)},
        "results":   results,
    }
    report_path = os.path.join(REPORTS_DIR, f"evaluation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"Report saved to {report_path}")


if __name__ == "__main__":
    main()
