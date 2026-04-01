import os
import numpy as np
import librosa
import pickle
from collections import Counter
import matplotlib.pyplot as plt
from matplotlib.widgets import Button
import matplotlib.cm as cm

# Audio processing parameters
SR        = 32000    # sample rate
DURATION  = 0.3      # seconds per window
N_MFCC    = 100      # MFCC count
STRIDE    = 0.2      # seconds between windows

def extract_features_from_signal(y, sr=SR, n_mfcc=N_MFCC, duration=DURATION):
    """
    Given a raw audio segment y, compute:
      - MFCC (n_mfcc) + delta + delta-delta
      - Spectral contrast
      - Spectral centroid
    Then aggregate each feature matrix by mean and std over time.
    """
    # MFCC + deltas
    mfcc    = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=n_mfcc)
    delta1  = librosa.feature.delta(mfcc, order=1)
    delta2  = librosa.feature.delta(mfcc, order=2)
    # Spectral features
    contrast = librosa.feature.spectral_contrast(y=y, sr=sr)
    centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
    mats = [mfcc, delta1, delta2, contrast, centroid]
    feats = []
    for m in mats:
        feats.append(np.mean(m, axis=1))
        feats.append(np.std(m, axis=1))
    return np.hstack(feats)

def predict_from_file(path, classifier, window_duration=DURATION, stride=STRIDE, sr=SR, n_mfcc=N_MFCC):
    """
    Slide a window over the file, extract features, predict labels+confidences.
    Returns: (final_mode_label, list of (start_time, label, confidence))
    """
    try:
        y, _ = librosa.load(path, sr=sr)
    except Exception as e:
        print(f"Error loading {path}: {e}")
        return None, []
    
    win_len   = int(sr * window_duration)
    stride_len= int(sr * stride)
    preds     = []
    
    for start in range(0, len(y) - win_len + 1, stride_len):
        seg    = y[start:start+win_len]
        feat   = extract_features_from_signal(seg, sr, n_mfcc, window_duration)
        feat   = feat.reshape(1, -1)
        
        if hasattr(classifier, "predict_proba"):
            probs = classifier.predict_proba(feat)[0]
            label = classifier.classes_[np.argmax(probs)]
            conf  = np.max(probs)
        else:
            label = classifier.predict(feat)[0]
            conf  = None
        
        preds.append((start/sr, label, conf))
    
    labels_only = [p for (_,p,_) in preds]
    # Exclude 'Background' from final prediction
    final_mode = None
    if labels_only:
        non_background_labels = [label for label in labels_only if label != "Background"]
        final_mode = Counter(non_background_labels).most_common(1)[0][0] if non_background_labels else None
    return final_mode, preds

def merge_detections(window_preds, gap=0.2):
    """
    Merge adjacent non-Background predictions into intervals.
    """
    # Exclude 'Background' from merged detections
    dets = [p for p in window_preds if p[1] != "Background"]
    dets.sort(key=lambda x: x[0])
    merged = []
    for start, label, conf in dets:
        end = start + DURATION
        if not merged or merged[-1][2] != label or (start - merged[-1][1] > gap):
            merged.append([start, end, label, conf])
        else:
            merged[-1][1] = end
            merged[-1][3] = max(merged[-1][3], conf if conf is not None else 0)
    return merged

# Paths
base_dir            = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
testing_audio_path  = os.path.join(base_dir, "Testing Audio")
clf_path            = os.path.join(base_dir, "Trained Models", "svm_classifier.pkl")

if not os.path.isdir(testing_audio_path):
    raise FileNotFoundError(f"No folder at {testing_audio_path}")
if not os.path.isfile(clf_path):
    raise FileNotFoundError(f"No classifier at {clf_path}")

with open(clf_path, "rb") as f:
    clf = pickle.load(f)
print("Loaded classifier.")

# Gather test files
test_files = [os.path.join(testing_audio_path, f)
              for f in os.listdir(testing_audio_path)
              if f.lower().endswith(".mp3")]
print(f"Found {len(test_files)} test files.")

# Store predictions
all_preds   = []
all_merged  = []
all_modes   = []

# Run predictions & print
for fp in test_files:
    mode, wp = predict_from_file(fp, clf)
    print(f"\nFile: {os.path.basename(fp)}")
    if wp:
        for t, lab, c in wp:
            if lab != "Background":
                if c is not None:
                    print(f"  At {t:0.2f}s -> Predicted: {lab} ({c*100:0.1f}%)")
                else:
                    print(f"  At {t:0.2f}s -> Predicted: {lab}")
        if mode and mode != "Background":
            print(f"Final predicted label (mode): {mode}")
        else:
            print("Final predicted label (mode): Background")
    else:
        print("  No windows to predict.")
    all_preds.append(wp)
    merged = merge_detections(wp)
    all_merged.append(merged)
    all_modes.append(mode)

# Interactive plotting
idx = 0
fig, ax = plt.subplots(figsize=(14,6))
plt.subplots_adjust(bottom=0.2)

def plot_idx():
    ax.clear()
    fp = test_files[idx]
    y, _ = librosa.load(fp, sr=SR)
    t_axis = np.linspace(0, len(y)/SR, len(y))
    ax.plot(t_axis, y, color="gray", label="Waveform")
    ax.set_title(os.path.basename(fp))
    ax.set_xlabel("Time (s)"); ax.set_ylabel("Amplitude")

    # Generate unique colors for each label
    unique_labels = list(set([lab for _, _, lab, _ in all_merged[idx]]))
    color_map = cm.get_cmap("tab10", len(unique_labels))
    label_colors = {label: color_map(i) for i, label in enumerate(unique_labels)}

    for s, e, lab, c in all_merged[idx]:
        ax.axvspan(s, e, color=label_colors[lab], alpha=0.3)

    # Add legend for labels
    handles = [plt.Line2D([0], [0], color=label_colors[lab], lw=4, label=lab) for lab in unique_labels]
    ax.legend(handles=handles, title="Detected Frogs")

    # Display final prediction and average confidence
    final_prediction = all_modes[idx]
    avg_confidence = np.mean([conf for _, _, _, conf in all_merged[idx]]) * 100
    ax.text(0.5, 0.95, f"Final Prediction: {final_prediction}\nAverage Confidence: {avg_confidence:.2f}%",
            transform=ax.transAxes, ha="center", va="top", fontsize=12, bbox=dict(boxstyle="round", facecolor="white", alpha=0.8))

def next_ev(event):
    global idx
    if idx < len(test_files)-1:
        idx +=1; plot_idx(); plt.draw()

def prev_ev(event):
    global idx
    if idx>0:
        idx -=1; plot_idx(); plt.draw()

a_prev = plt.axes([0.3,0.05,0.1,0.075])
a_next = plt.axes([0.6,0.05,0.1,0.075])
b_prev = Button(a_prev, "Previous")
b_next = Button(a_next, "Next")
b_prev.on_clicked(prev_ev)
b_next.on_clicked(next_ev)

plot_idx()
plt.show()
