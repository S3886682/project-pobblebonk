import os
import numpy as np
import librosa
import pickle
from collections import Counter
import matplotlib.pyplot as plt
from matplotlib.widgets import Button
import matplotlib.cm as cm

# Audio processing parameters
SR = 32000          # Sample rate
DURATION = 0.3      # Duration (in seconds) for each prediction window
N_MFCC = 100         # Number of MFCC coefficients to extract
STRIDE = 0.2       # Stride (in seconds) for overlapping windows

def extract_mfcc_features_from_signal(y, sr=SR, n_mfcc=N_MFCC, duration=DURATION):
    """
    Given an audio signal y, extracts MFCC features from a segment (ensuring proper padding).
    """
    expected_length = int(sr * duration)
    if len(y) < expected_length:
        y = np.pad(y, (0, expected_length - len(y)))
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=n_mfcc)
    mfcc_mean = np.mean(mfcc, axis=1)  # Aggregate over time frames
    return mfcc_mean

def predict_from_file(file_path, classifier, window_duration=DURATION, stride=STRIDE, sr=SR, n_mfcc=N_MFCC):
    """
    Splits the audio file into overlapping windows and makes predictions on each window.
    Returns:
      - final_prediction: the most common prediction across windows (mode),
      - window_preds: a list of tuples (start_time, predicted_label, confidence)
    """
    try:
        y, _ = librosa.load(file_path, sr=sr)
    except Exception as e:
        print(f"Error loading {file_path}: {e}")
        return None, []
    
    total_samples = len(y)
    window_length = int(sr * window_duration)
    stride_length = int(sr * stride)
    window_preds = []
    
    for start in range(0, total_samples - window_length + 1, stride_length):
        window = y[start:start+window_length]
        features = extract_mfcc_features_from_signal(window, sr=sr, n_mfcc=n_mfcc, duration=window_duration)
        features = features.reshape(1, -1)  # Reshape for classifier
        
        if hasattr(classifier, "predict_proba"):
            probs = classifier.predict_proba(features)[0]
            predicted_label = classifier.classes_[np.argmax(probs)]
            confidence = np.max(probs)
        else:
            predicted_label = classifier.predict(features)[0]
            confidence = None
        
        start_time = start / sr  # in seconds
        window_preds.append((start_time, predicted_label, confidence))
    
    # Compute the mode from all window predictions
    pred_labels = [pred for (_, pred, _) in window_preds]
    final_prediction = Counter(pred_labels).most_common(1)[0][0] if pred_labels else None

    return final_prediction, window_preds

def merge_detections(window_preds, gap_threshold=0.2):
    """
    Given a list of window predictions [(start_time, label, confidence), ...],
    filter out any "Background" windows and merge adjacent windows with the same frog species.
    Returns a list of merged detections:
      (start_time, end_time, species, max_confidence_across_windows)
    """
    detections = [pred for pred in window_preds if pred[1] != "Background"]
    detections = sorted(detections, key=lambda d: d[0])
    
    merged = []
    for det in detections:
        start, label, conf = det
        end = start + DURATION  
        if not merged:
            merged.append([start, end, label, conf])
        else:
            last = merged[-1]
            if label == last[2] and (start - last[1]) <= gap_threshold:
                last[1] = end  
                if conf is not None:
                    last[3] = max(last[3], conf) 
            else:
                merged.append([start, end, label, conf])
    return merged

# Set base directory 
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
testing_audio_path = os.path.join(base_dir, "Testing Audio")
classifier_path = os.path.join(base_dir, "Trained Models", "svm_classifier_1.pkl")

if not os.path.isdir(testing_audio_path):
    raise FileNotFoundError(f"Testing Audio folder not found at: {testing_audio_path}")
if not os.path.isfile(classifier_path):
    raise FileNotFoundError(f"Classifier file not found at: {classifier_path}")

with open(classifier_path, "rb") as f:
    classifier = pickle.load(f)
print(f"Loaded classifier from: {classifier_path}")

# Gather all MP3 files from the Testing Audio folder
test_files = [os.path.join(testing_audio_path, file)
              for file in os.listdir(testing_audio_path)
              if file.lower().endswith(".mp3")]
print(f"Found {len(test_files)} MP3 file(s) for testing.")

# Build lists for detections for terminal printing and for plotting
all_window_preds = []   # For terminal printing
all_merged_dets = []    # For plotting merged detections
all_final_preds = []    # For storing final (mode) predictions

# Process each file and print window predictions (skip "Background") in the requested format
for file_path in test_files:
    final_pred, window_preds = predict_from_file(file_path, classifier, window_duration=DURATION, stride=STRIDE, sr=SR, n_mfcc=N_MFCC)
    print(f"\nFile: {os.path.basename(file_path)}")
    if window_preds:
        for start_time, pred_label, confidence in window_preds:
            # Print only non-"Background" predictions
            if pred_label != "Background":
                if confidence is not None:
                    print(f"  At {start_time:0.2f}s -> Predicted: {pred_label} (Confidence: {confidence*100:0.1f}%)")
                else:
                    print(f"  At {start_time:0.2f}s -> Predicted: {pred_label}")
        # Only print final prediction ifnot "Background"
        if final_pred != "Background":
            print(f"Final predicted label (mode): {final_pred}")
        else:
            print("Final predicted label (mode): Background")
    else:
        print("  No predictions could be made for this file.")
    all_final_preds.append(final_pred)
    all_window_preds.append(window_preds)
    merged_detections = merge_detections(window_preds, gap_threshold=0.2)
    all_merged_dets.append(merged_detections)

# Plotting 
current_index = 0
fig, ax = plt.subplots(figsize=(14, 6))
plt.subplots_adjust(bottom=0.2)  # Space at the bottom for buttons

def plot_current_file():
    ax.clear()
    file_path = test_files[current_index]
    y, _ = librosa.load(file_path, sr=SR)
    total_duration = len(y) / SR
    time_axis = np.linspace(0, total_duration, len(y))
    ax.plot(time_axis, y, color='gray', label='Waveform')
    ax.set_xlabel("Time (s)")
    ax.set_ylabel("Amplitude")
    ax.set_title(f"Audio Waveform with Detected Frog Calls: {os.path.basename(file_path)}")

    # Generate unique colors for each label
    unique_labels = list(set([det[2] for det in all_merged_dets[current_index] if det[2] != "Background"]))
    color_map = cm.get_cmap("tab10", len(unique_labels))
    label_colors = {label: color_map(i) for i, label in enumerate(unique_labels)}

    # Overlay merged detections (non-background only)
    detections = all_merged_dets[current_index]
    for det in detections:
        start, end, species, conf = det
        if species != "Background":
            ax.axvspan(start, end, color=label_colors[species], alpha=0.3)

    # Add legend for labels
    handles = [plt.Line2D([0], [0], color=label_colors[label], lw=4, label=label) for label in unique_labels]
    ax.legend(handles=handles, title="Detected Frogs")

    # Display final prediction and average confidence (highest average detection excluding 'Background')
    species_confidences = {}
    for _, _, species, conf in detections:
        if species != "Background" and conf is not None:
            if species not in species_confidences:
                species_confidences[species] = []
            species_confidences[species].append(conf)

    if species_confidences:
        avg_confidences = {species: np.mean(confs) for species, confs in species_confidences.items()}
        final_prediction = max(avg_confidences, key=avg_confidences.get)
        avg_confidence = avg_confidences[final_prediction] * 100
    else:
        final_prediction = "None"
        avg_confidence = 0

    ax.text(0.5, 0.95, f"Final Prediction: {final_prediction}\nAverage Confidence: {avg_confidence:.2f}%",
            transform=ax.transAxes, ha="center", va="top", fontsize=12, bbox=dict(boxstyle="round", facecolor="white", alpha=0.8))

def next_file(event):
    global current_index
    if current_index < len(test_files) - 1:
        current_index += 1
        plot_current_file()
        plt.draw()

def prev_file(event):
    global current_index
    if current_index > 0:
        current_index -= 1
        plot_current_file()
        plt.draw()

axprev = plt.axes([0.3, 0.05, 0.1, 0.075])
axnext = plt.axes([0.6, 0.05, 0.1, 0.075])
bprev = Button(axprev, 'Previous')
bnext = Button(axnext, 'Next')
bprev.on_clicked(prev_file)
bnext.on_clicked(next_file)

plot_current_file()
plt.show()
