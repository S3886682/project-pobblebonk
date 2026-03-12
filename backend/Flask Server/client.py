import requests
import os
import matplotlib.pyplot as plt
from matplotlib.widgets import Button
import librosa
import numpy as np
import matplotlib.cm as cm

# Server URL
SERVER_URL = "http://127.0.0.1:5000/predict"

# Path to the audio file to test
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
testing_audio_path = os.path.join(base_dir, "Testing Audio")

# Gather test files
test_files = [os.path.join(testing_audio_path, f)
              for f in os.listdir(testing_audio_path)
              if f.lower().endswith(".mp3")]
print(f"Found {len(test_files)} test files.")

if not test_files:
    print("No audio files found in the 'Testing Audio' folder.")
    exit()

# Store predictions
all_preds   = []
all_modes   = []
all_merged  = []

# Run predictions & print
for fp in test_files:
    with open(fp, "rb") as f:
        files = {"file": f}
        response = requests.post(SERVER_URL, files=files)

    if response.status_code == 200:
        data = response.json()
        print(f"\nFile: {os.path.basename(fp)}")
        print(f"Final Prediction: {data['final_prediction']} (Average Confidence: {data['average_confidence']*100:.2f}%)")
        all_preds.append(data["predictions"])
        all_modes.append(data["final_prediction"])
        all_merged.append(data["predictions"])
    else:
        print(f"Error processing {os.path.basename(fp)}: {response.json().get('error', 'Unknown error')}")

# Interactive plotting
idx = 0
fig, ax = plt.subplots(figsize=(14,6))
plt.subplots_adjust(bottom=0.2)

def plot_idx():
    ax.clear()
    fp = test_files[idx]
    y, _ = librosa.load(fp, sr=32000)
    t_axis = np.linspace(0, len(y)/32000, len(y))
    ax.plot(t_axis, y, color="gray", label="Waveform")
    ax.set_title(os.path.basename(fp))
    ax.set_xlabel("Time (s)"); ax.set_ylabel("Amplitude")

    # Generate unique colors for each label
    unique_labels = list(set([pred['label'] for pred in all_merged[idx]]))
    color_map = cm.get_cmap("tab10", len(unique_labels))
    label_colors = {label: color_map(i) for i, label in enumerate(unique_labels)}

    for pred in all_merged[idx]:
        start = pred['time']
        label = pred['label']
        end = start + 0.3
        ax.axvspan(start, end, color=label_colors[label], alpha=0.3)

    # Add legend for labels
    handles = [plt.Line2D([0], [0], color=label_colors[label], lw=4, label=label) for label in unique_labels]
    ax.legend(handles=handles, title="Detected Frogs")

    # Display final prediction and average confidence
    final_prediction = all_modes[idx]
    avg_confidence = np.mean([pred['confidence'] for pred in all_merged[idx] if pred['confidence'] is not None]) * 100
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