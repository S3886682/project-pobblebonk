"""
sweep.py — Parameter sweep for audio feature + SVM settings.

Tests individual parameter variations against the baseline, then optionally
runs promising combinations. Uses a fixed SVM (C=10, gamma="scale") so each
run is fast. Once you've found the best audio settings, run train.py with
those values in config.py for a full GridSearchCV-tuned model.

Usage:
    python sweep.py              # individual param variations only
    python sweep.py --combo      # also run combo experiments
    python sweep.py --svm        # also sweep SVM C / gamma grid
"""

import argparse
import json
import os
import re
import sys
import warnings
from datetime import datetime
from pathlib import Path

import joblib
import librosa
import numpy as np
from sklearn.metrics import f1_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

sys.path.insert(0, str(Path(__file__).parent))
from features import build_dataset, extract_features

warnings.filterwarnings("ignore")

TESTING_DIR = os.path.join("datasets", "updated", "Testing Audio")
REPORTS_DIR = "reports"

# ── Baseline ───────────────────────────────────────────────────────────────────
BASELINE = dict(sr=32000, win_sec=1.0, n_mfcc=20, n_fft=2048, hop_length=256, aug_noise_lvl=0.3)

# ── Individual parameter variations ───────────────────────────────────────────
SINGLES = [
    ("win_sec=0.3",       dict(win_sec=0.3)),
    ("win_sec=0.7",       dict(win_sec=0.7)),
    ("win_sec=1.0",       dict(win_sec=1.0)),
    ("n_mfcc=13",         dict(n_mfcc=13)),
    ("n_mfcc=30",         dict(n_mfcc=30)),
    ("n_mfcc=40",         dict(n_mfcc=40)),
    ("n_fft=1024",        dict(n_fft=1024)),
    ("n_fft=4096",        dict(n_fft=4096)),
    ("hop=256",           dict(hop_length=256)),
    ("hop=1024",          dict(hop_length=1024)),
    ("noise=0.0",         dict(aug_noise_lvl=0.0)),
    ("noise=0.1",         dict(aug_noise_lvl=0.1)),
    ("noise=0.5",         dict(aug_noise_lvl=0.5)),
]

# ── Combo experiments (--combo / --quick flag) ────────────────────────────────
# Informed by sweep results: win_sec=1.0 (94.4%) and n_fft=1024 (88.9%) were top singles.
COMBOS = [
    ("win1.0+fft1024",           dict(win_sec=1.0, n_fft=1024)),
    ("win1.0+mfcc30",            dict(win_sec=1.0, n_mfcc=30)),
    ("win1.0+hop256",            dict(win_sec=1.0, hop_length=256)),
    ("win1.0+mfcc30+fft1024",    dict(win_sec=1.0, n_mfcc=30, n_fft=1024)),
    ("win1.0+fft1024+hop256",    dict(win_sec=1.0, n_fft=1024, hop_length=256)),
    ("win1.0+noise0.1",          dict(win_sec=1.0, aug_noise_lvl=0.1)),
]

# ── SVM grid experiments (--svm flag) ─────────────────────────────────────────
SVM_VARIANTS = [
    ("C=1",    dict(svm_C=1,   svm_gamma="scale")),
    ("C=100",  dict(svm_C=100, svm_gamma="scale")),
    ("C=10,g=0.001", dict(svm_C=10, svm_gamma=0.001)),
    ("C=10,g=0.1",   dict(svm_C=10, svm_gamma=0.1)),
    ("C=100,g=0.001", dict(svm_C=100, svm_gamma=0.001)),
]


def train_model(params: dict, svm_C=10, svm_gamma="scale"):
    """Build dataset, train SVM, return (pipeline, classes, val_f1)."""
    print(f"  Loading data...", end="", flush=True)
    X, y = build_dataset(**{k: v for k, v in params.items() if not k.startswith("svm_")})
    print(f" {len(y)} samples, {X.shape[1]} features", flush=True)

    X_tr, X_val, y_tr, y_val = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

    pipe = Pipeline([
        ("scaler", StandardScaler()),
        ("svc",    SVC(kernel="rbf", C=svm_C, gamma=svm_gamma, probability=True)),
    ])
    print(f"  Training SVM (C={svm_C}, gamma={svm_gamma})...", end="", flush=True)
    pipe.fit(X_tr, y_tr)
    val_f1 = f1_score(y_val, pipe.predict(X_val), average="macro")
    print(f" val F1={val_f1:.3f}", flush=True)
    return pipe, list(pipe.classes_), val_f1


def predict_file(pipeline, path, win_sec, sr, n_mfcc, n_fft, hop_length):
    """Sliding-window majority vote, same logic as evaluate.py."""
    y_audio, _ = librosa.load(path, sr=sr, mono=True)
    win_samples  = int(win_sec * sr)
    step_samples = int(win_samples * 0.67)
    preds, confs = [], []
    for start in range(0, len(y_audio) - win_samples + 1, step_samples):
        feat  = extract_features(
            y_audio[start:start + win_samples],
            n_mfcc=n_mfcc, n_fft=n_fft, hop_length=hop_length, sr=sr,
        ).reshape(1, -1)
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


def evaluate(pipeline, params: dict):
    """Run against Testing Audio, return (accuracy, per-species results)."""
    win_sec    = params.get("win_sec",    BASELINE["win_sec"])
    sr         = params.get("sr",         BASELINE["sr"])
    n_mfcc     = params.get("n_mfcc",     BASELINE["n_mfcc"])
    n_fft      = params.get("n_fft",      BASELINE["n_fft"])
    hop_length = params.get("hop_length", BASELINE["hop_length"])

    test_files = sorted(f for f in os.listdir(TESTING_DIR) if f.lower().endswith((".mp3", ".wav")))
    results, correct = [], 0
    for fname in test_files:
        truth           = re.sub(r"^\d+\s*", "", os.path.splitext(fname)[0]).strip()
        predicted, conf = predict_file(
            pipeline, os.path.join(TESTING_DIR, fname),
            win_sec=win_sec, sr=sr, n_mfcc=n_mfcc, n_fft=n_fft, hop_length=hop_length,
        )
        ok              = truth.lower().replace("'", "") == predicted.lower().replace("'", "")
        correct        += int(ok)
        results.append({"file": fname, "truth": truth, "predicted": predicted,
                        "confidence": round(conf, 4), "correct": ok})
    accuracy = correct / len(results) if results else 0.0
    return accuracy, results


def run_experiment(label: str, overrides: dict, svm_C=10, svm_gamma="scale"):
    params = {**BASELINE, **overrides}
    print(f"\n{'-'*60}")
    print(f"  Experiment: {label}")
    print(f"  Params:     {overrides or '(baseline)'}")
    pipeline, classes, val_f1 = train_model(params, svm_C=svm_C, svm_gamma=svm_gamma)
    accuracy, results = evaluate(pipeline, params)
    failing = [r["truth"] for r in results if not r["correct"]]
    print(f"  Eval accuracy: {accuracy:.1%}  ({int(accuracy*len(results))}/{len(results)})")
    if failing:
        print(f"  FAIL: {', '.join(failing)}")
    return {
        "label":    label,
        "params":   overrides,
        "val_f1":   round(val_f1, 4),
        "accuracy": round(accuracy, 4),
        "correct":  int(accuracy * len(results)),
        "total":    len(results),
        "failing":  failing,
    }


def print_table(runs: list):
    print(f"\n{'='*72}")
    print(f"  SWEEP RESULTS  (sorted by eval accuracy)")
    print(f"{'='*72}")
    sorted_runs = sorted(runs, key=lambda r: r["accuracy"], reverse=True)
    print(f"  {'Experiment':<28} {'Acc':>6}  {'Val F1':>6}  Failing species")
    print(f"  {'-'*28} {'------':>6}  {'------':>6}  ---------------")
    for r in sorted_runs:
        marker = " *" if r["label"] == "baseline" else ""
        print(f"  {r['label']:<28} {r['accuracy']:>5.1%}  {r['val_f1']:>6.3f}  {', '.join(r['failing'][:3])}{'...' if len(r['failing']) > 3 else ''}{marker}")
    print(f"{'='*72}")
    best = sorted_runs[0]
    if best["label"] != "baseline":
        print(f"\n  Best: {best['label']}  ({best['accuracy']:.1%})")
        print(f"  To apply: update config.py with {best['params']}")
    print()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--combo", action="store_true", help="Also run combo experiments")
    parser.add_argument("--svm",   action="store_true", help="Also sweep SVM C/gamma")
    parser.add_argument("--quick", action="store_true", help="Skip singles, run combos only")
    args = parser.parse_args()

    os.makedirs(REPORTS_DIR, exist_ok=True)

    experiments = []
    if not args.quick:
        experiments += [("baseline", {})] + SINGLES
    if args.combo or args.quick:
        experiments += COMBOS
    if args.svm:
        experiments += [(lbl, p) for lbl, p in SVM_VARIANTS]

    print(f"\nRunning {len(experiments)} experiments...")
    print(f"Baseline: {BASELINE}\n")

    runs = []
    for label, overrides in experiments:
        svm_C     = overrides.pop("svm_C",     10)
        svm_gamma = overrides.pop("svm_gamma", "scale")
        try:
            result = run_experiment(label, overrides, svm_C=svm_C, svm_gamma=svm_gamma)
            runs.append(result)
        except Exception as e:
            print(f"  ERROR in {label}: {e}")
            runs.append({"label": label, "params": overrides, "val_f1": 0,
                         "accuracy": 0, "correct": 0, "total": 0, "failing": [str(e)]})

    print_table(runs)

    report_path = os.path.join(REPORTS_DIR, f"sweep_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    with open(report_path, "w") as f:
        json.dump({"timestamp": datetime.now().isoformat(), "baseline": BASELINE, "runs": runs}, f, indent=2)
    print(f"Full results saved to {report_path}\n")


if __name__ == "__main__":
    main()
