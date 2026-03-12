import os
import random
import numpy as np
import librosa
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report
import pickle


# Add FFMPEG to PATH for decoding
os.environ["PATH"] = r"C:\Program Files\FFMPEG\bin;" + os.environ["PATH"]

# Paths
base_dir               = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
training_audio_path    = os.path.join(base_dir, "Training Audio")
background_audio_path  = os.path.join(base_dir, "Background Audio")
trained_models_dir     = os.path.join(base_dir, "Trained Models")
os.makedirs(trained_models_dir, exist_ok=True)

# Audio & feature params
SR             = 32000    # sample rate
DURATION       = 0.3      # seconds per segment
N_MFCC         = 100      # MFCC count
AUG_NOISE_LVL  = 0.3      # noise mix ratio

# Gather background‑noise files
background_files = []
if os.path.isdir(background_audio_path):
    for fn in os.listdir(background_audio_path):
        if fn.lower().endswith(".wav"):
            background_files.append(os.path.join(background_audio_path, fn))

def load_segment(path):
    y, _ = librosa.load(path, sr=SR, duration=DURATION)
    target_len = int(SR * DURATION)
    if len(y) < target_len:
        y = np.pad(y, (0, target_len - len(y)))
    return y

def augment_time(y):
    rate = np.random.uniform(0.9, 1.1)
    y_st = librosa.effects.time_stretch(y, rate=rate)
    # enforce original length
    if len(y_st) < len(y):
        y_st = np.pad(y_st, (0, len(y) - len(y_st)))
    else:
        y_st = y_st[:len(y)]
    return y_st


def augment_pitch(y):
    steps = np.random.uniform(-2, 2)
    y_ps = librosa.effects.pitch_shift(y, sr=SR, n_steps=steps)
    return y_ps[:len(y)]

def augment_noise(y):
    if not background_files:
        return y
    noise = load_segment(random.choice(background_files))
    return y + AUG_NOISE_LVL * noise

def extract_features(y):
    # 1) MFCC + deltas
    mfcc   = librosa.feature.mfcc(y=y, sr=SR, n_mfcc=N_MFCC)
    delta1 = librosa.feature.delta(mfcc, order=1)
    delta2 = librosa.feature.delta(mfcc, order=2)
    # 2) Spectral contrast & centroid
    contrast = librosa.feature.spectral_contrast(y=y, sr=SR)
    centroid = librosa.feature.spectral_centroid(y=y, sr=SR)
    mats = [mfcc, delta1, delta2, contrast, centroid]
    feats = []
    for m in mats:
        feats.append(np.mean(m, axis=1))
        feats.append(np.std(m, axis=1))
    return np.hstack(feats)

# Build dataset
X, y = [], []
print("Loading + augmenting frog calls…")
for species in sorted(os.listdir(training_audio_path)):
    spath = os.path.join(training_audio_path, species)
    if not os.path.isdir(spath): continue
    for fn in os.listdir(spath):
        if not fn.lower().endswith(".wav"): continue
        fpath = os.path.join(spath, fn)
        seg   = load_segment(fpath)
        # original
        X.append(extract_features(seg));          y.append(species)
        # time-stretch
        X.append(extract_features(augment_time(seg)));  y.append(species)
        # pitch-shift
        X.append(extract_features(augment_pitch(seg))); y.append(species)
        # noise
        X.append(extract_features(augment_noise(seg))); y.append(species)

print("Loading background noise as 'Background' class…")
for path in background_files:
    seg = load_segment(path)
    X.append(extract_features(seg)); y.append("Background")

X = np.array(X)
y = np.array(y)
print(f"Samples: {len(y)}, feature dim: {X.shape[1]}")

# Train/test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42
)

# Pipeline + grid search
pipeline = Pipeline([
    ("scaler", StandardScaler()),
    ("svc",    SVC(kernel="rbf", probability=True))
])
param_grid = {
    "svc__C":     [0.1, 1, 10],
    "svc__gamma": ["scale", "auto", 0.01]
}

grid = GridSearchCV(
    pipeline, param_grid,
    cv=5, n_jobs=-1, verbose=2, scoring="f1_macro"
)
print("Running grid search…")
grid.fit(X_train, y_train)

print("Best params:", grid.best_params_)
best_clf = grid.best_estimator_

# Evaluate
y_pred = best_clf.predict(X_test)
print("Classification report (hold‑out):")
print(classification_report(y_test, y_pred))

# Save model
out_path = os.path.join(trained_models_dir, "svm_classifier.pkl")
with open(out_path, "wb") as f:
    pickle.dump(best_clf, f)
print("Saved classifier to:", out_path)
