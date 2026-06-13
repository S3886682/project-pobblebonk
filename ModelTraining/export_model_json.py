"""
export_model_json.py — Export models/latest/model.pkl to JSON for use in the app.

Usage:
    python export_model_json.py

Output:
    ../FrogFinder/services/svm_model.json
"""

import json
import os
import joblib
import librosa
import numpy as np

from config import HOP_LENGTH, N_FFT, SAMPLE_RATE

MODEL_PATH  = "models/latest/model.pkl"
OUTPUT_PATH = "../FrogFinder/services/svm_model.json"

N_MELS = 128
N_BINS = N_FFT // 2   # 1024 — matches features.py and classifierService.js

def build_sparse_mel_filterbank():
    """Export the mel filterbank in sparse form: list of [start_bin, weights].
    The JS side uses this to compute MFCC identically to the Python training code,
    instead of relying on Meyda's internal filterbank which uses different bin rounding."""
    fb = librosa.filters.mel(sr=SAMPLE_RATE, n_fft=N_FFT, n_mels=N_MELS,
                              fmin=0.0, htk=True, norm=None)[:, :N_BINS]
    sparse = []
    for row in fb:
        nz = np.where(row > 0)[0]
        if len(nz) == 0:
            sparse.append([0, []])
        else:
            start = int(nz[0])
            end   = int(nz[-1]) + 1
            sparse.append([start, [round(float(v), 9) for v in row[start:end]]])
    return sparse

def main():
    print(f"Loading {MODEL_PATH}...")
    pipeline = joblib.load(MODEL_PATH)

    scaler = pipeline.named_steps["scaler"]
    svc    = pipeline.named_steps["svc"]

    print(f"  Classes:         {list(svc.classes_)}")
    print(f"  Support vectors: {svc.support_vectors_.shape}")
    print(f"  n_support:       {svc.n_support_.tolist()}")
    print(f"  gamma:           {svc._gamma}")

    print("Building sparse mel filterbank...")
    mel_fb_sparse = build_sparse_mel_filterbank()
    total_weights = sum(len(w) for _, w in mel_fb_sparse)
    print(f"  {N_MELS} filters, {total_weights} non-zero weights")

    has_platt = hasattr(svc, 'probA_') and svc.probA_ is not None
    if has_platt:
        print(f"  Platt params:    probA_ {svc.probA_.shape}, probB_ {svc.probB_.shape}")
    else:
        print("  Warning: no Platt params (model trained without probability=True?)")

    model = {
        "kernel":          svc.kernel,
        "gamma":           float(svc._gamma),
        "support_vectors": svc.support_vectors_.tolist(),
        "dual_coef":       svc.dual_coef_.tolist(),
        "intercept":       svc.intercept_.tolist(),
        "classes":         svc.classes_.tolist(),
        "n_support":       svc.n_support_.tolist(),
        "scaler_mean":     scaler.mean_.tolist(),
        "scaler_scale":    scaler.scale_.tolist(),
        "mel_filterbank":  mel_fb_sparse,
        **({"prob_a": svc.probA_.tolist(), "prob_b": svc.probB_.tolist()} if has_platt else {}),
    }

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    print(f"Writing {OUTPUT_PATH}...")
    with open(OUTPUT_PATH, "w") as f:
        json.dump(model, f, separators=(",", ":"))

    size_mb = os.path.getsize(OUTPUT_PATH) / 1_000_000
    print(f"Done. File size: {size_mb:.1f} MB")

if __name__ == "__main__":
    main()
