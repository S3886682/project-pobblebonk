import os
import json
import numpy as np
import librosa
import torch
import torch.nn as nn
import matplotlib.pyplot as plt
import matplotlib.cm as cm
from collections import Counter

# Add FFMPEG to PATH so that librosa can decode MP3 files
os.environ["PATH"] = r"C:\Program Files\FFMPEG\bin;" + os.environ["PATH"]

# Audio processing parameters
SR = 16000               # Sample rate
window_duration = 0.5    # Duration (in seconds) expected by the model (same as training)
N_MELS = 512             # Number of mel bins
HOP_LENGTH = 512         # Hop length for spectrogram

# Detection parameters
step_duration = 0.5      # Slide the window every 0.1 seconds
confidence_threshold = 0.80  # Only consider detections above this softmax confidence

def extract_features(segment, sr=SR, duration=window_duration, n_mels=N_MELS, hop_length=HOP_LENGTH):
    """
    Given an audio segment, pad or truncate it to 'duration' seconds and compute its mel spectrogram (in dB).
    """
    expected_length = int(sr * duration)
    if len(segment) < expected_length:
        segment = np.pad(segment, (0, expected_length - len(segment)))
    else:
        segment = segment[:expected_length]
    mel_spec = librosa.feature.melspectrogram(y=segment, sr=sr, n_mels=n_mels, hop_length=hop_length)
    mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)
    return mel_spec_db

# Define the CNN model (must match the training architecture)
class FrogCNN(nn.Module):
    def __init__(self, num_classes):
        super(FrogCNN, self).__init__()
        self.conv1 = nn.Sequential(
            nn.Conv2d(1, 16, kernel_size=3, padding=1),
            nn.BatchNorm2d(16),
            nn.ReLU(),
            nn.MaxPool2d(2)
        )
        self.conv2 = nn.Sequential(
            nn.Conv2d(16, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(2)
        )
        self.conv3 = nn.Sequential(
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(2)
        )
        self.adaptive_pool = nn.AdaptiveAvgPool2d((4, 4))
        self.fc = nn.Linear(64 * 4 * 4, num_classes)
        
    def forward(self, x):
        x = self.conv1(x)
        x = self.conv2(x)
        x = self.conv3(x)
        x = self.adaptive_pool(x)
        x = x.view(x.size(0), -1)
        x = self.fc(x)
        return x


if __name__ == '__main__':
    # Get file paths for model and mapping
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    model_save_path = os.path.join(base_dir, "Trained Models", "FrogCNN.pth")
    mapping_save_path = os.path.join(base_dir, "CNN Model", "label_mapping.json")
    # Path to your long test audio file
    test_audio_path = os.path.join(base_dir, "Testing Audio", "Test1.mp3")
    
    # Load label mapping (mapping: {class_index (as str): species_name})
    with open(mapping_save_path, "r") as f:
        label_mapping = json.load(f)
    # Convert keys to int
    label_mapping = {int(k): v for k, v in label_mapping.items()}
    
    num_classes = len(label_mapping)
    
    # Initialize the model and load the saved weights
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = FrogCNN(num_classes).to(device)
    model.load_state_dict(torch.load(model_save_path, map_location=device))
    model.eval()
    
    # Load the full audio
    y, sr_actual = librosa.load(test_audio_path, sr=SR)
    total_duration = len(y) / SR
    print(f"Loaded audio: duration = {total_duration:.2f} seconds")
    
    # Sliding window detection
    window_samples = int(SR * window_duration)
    step_samples = int(SR * step_duration)
    detections = []  # List of detections(start_time, end_time, species, confidence)
    
    # Slide the window over the entire audio
    for start_sample in range(0, len(y) - window_samples + 1, step_samples):
        segment = y[start_sample : start_sample + window_samples]
        start_time = start_sample / SR
        end_time = start_time + window_duration
        
        features = extract_features(segment)
        features_tensor = torch.tensor(features, dtype=torch.float32).unsqueeze(0).unsqueeze(0).to(device)
        
        with torch.no_grad():
            output = model(features_tensor)
            probs = torch.softmax(output, dim=1)
            confidence, pred_idx = torch.max(probs, dim=1)
            confidence = confidence.item()
            pred_idx = int(pred_idx.item())
        
        species = label_mapping[pred_idx]
        # Only add detections that are not "Background"
        if species != "Background" and confidence >= confidence_threshold:
            detections.append((start_time, end_time, species, confidence))
    
    print(f"Raw detections (window-level): {len(detections)}")
    
    # detections with the same species that are close together (within gap_threshold) are merged
    merged_detections = []
    gap_threshold = 0.2  # seconds
    for det in detections:
        if not merged_detections:
            merged_detections.append(list(det))  # convert tuple to list for modification
        else:
            last = merged_detections[-1]
            if det[2] == last[2] and det[0] - last[1] <= gap_threshold:
                last[1] = det[1]  
                last[3] = max(last[3], det[3])
            else:
                merged_detections.append(list(det))
    
    # Print merged detections
    print("Merged detections (only frog calls):")
    for start, end, species, conf in merged_detections:
        print(f"{species}: {start:.2f}s to {end:.2f}s (confidence: {conf:.2f})")
    
    #Visualization 
    time_axis = np.linspace(0, total_duration, len(y))
    plt.figure(figsize=(14, 6))
    plt.plot(time_axis, y, color='gray', label='Waveform')
    plt.xlabel("Time (s)")
    plt.ylabel("Amplitude")
    plt.title("Audio Waveform with Detected Frog Calls")

    # Generate unique colors for each species
    unique_species = list(set([det[2] for det in merged_detections]))
    color_map = cm.get_cmap("tab10", len(unique_species))
    species_colors = {species: color_map(i) for i, species in enumerate(unique_species)}

    # Overlay merged detections
    for start, end, species, conf in merged_detections:
        plt.axvspan(start, end, color=species_colors[species], alpha=0.3)

    # Add legend for species
    handles = [plt.Line2D([0], [0], color=species_colors[species], lw=4, label=species) for species in unique_species]
    plt.legend(handles=handles, title="Detected Frogs")

    # Display final prediction and average confidence
    final_prediction = Counter([det[2] for det in merged_detections]).most_common(1)[0][0]
    avg_confidence = np.mean([det[3] for det in merged_detections]) * 100
    plt.text(0.5, 0.95, f"Final Prediction: {final_prediction}\nAverage Confidence: {avg_confidence:.2f}%",
             transform=plt.gca().transAxes, ha="center", va="top", fontsize=12, bbox=dict(boxstyle="round", facecolor="white", alpha=0.8))

    plt.tight_layout()
    plt.show()
