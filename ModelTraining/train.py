"""
train.py — Train the SVM frog classifier

Usage:
    python train.py

Output:
    models/latest/model.pkl          — trained model pipeline (scaler + SVM)
    models/latest/label_classes.json — list of species names the model knows

To change parameters, edit config.py then re-run.
Do NOT modify Testing Audio — that folder is reserved for evaluate.py only.
"""

import json
import os
import warnings

import joblib
import numpy as np
from sklearn.model_selection import GridSearchCV
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

from features import build_dataset

warnings.filterwarnings("ignore")

MODEL_DIR = "models/latest"


def main():
    os.makedirs(MODEL_DIR, exist_ok=True)

    print("Loading + augmenting training data...")
    X, y = build_dataset()
    print(f"  {len(y)} samples, {X.shape[1]} features, {len(set(y))} classes")

    pipeline   = Pipeline([("scaler", StandardScaler()), ("svc", SVC(kernel="rbf", probability=True))])
    param_grid = {"svc__C": [0.1, 1, 10], "svc__gamma": ["scale", "auto", 0.01]}

    # GridSearchCV uses internal CV to find best params, then we refit on ALL data.
    # We evaluate on the separate Testing Audio set via evaluate.py — no need to
    # hold back a validation split here.
    print("Running grid search (CV on full training set)...")
    grid = GridSearchCV(pipeline, param_grid, cv=5, n_jobs=-1, verbose=1, scoring="f1_macro")
    grid.fit(X, y)

    best = grid.best_estimator_
    print(f"Best params: {grid.best_params_}")

    joblib.dump(best, os.path.join(MODEL_DIR, "model.pkl"))
    with open(os.path.join(MODEL_DIR, "label_classes.json"), "w") as f:
        json.dump(sorted(set(y)), f, indent=2)

    print(f"Model saved to {MODEL_DIR}/model.pkl")


if __name__ == "__main__":
    main()
