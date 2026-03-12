import os
import json
import numpy as np
import librosa
import torch
import torch.nn as nn
import matplotlib.pyplot as plt

# Add FFMPEG to PATH for decoding audio
os.environ["PATH"] = r"C:\Program Files\FFMPEG\bin;" + os.environ["PATH"]

# Audio processing parameters (must match training conditions)
SR = 16000            # Sample rate (16kHz, as used in training)
window_duration = 1.0 # Duration in seconds (same as training DURATION)
N_MELS = 64           # Number of mel bins
HOP_LENGTH = 320      # Hop length for spectrogram

def extract_features(segment, sr=SR, duration=window_duration, n_mels=N_MELS, hop_length=HOP_LENGTH):
    """
    Given an audio segment, pad or truncate to fixed duration and compute its mel spectrogram (in dB).
    """
    expected_length = int(sr * duration)
    if len(segment) < expected_length:
        segment = np.pad(segment, (0, expected_length - len(segment)))
    else:
        segment = segment[:expected_length]
    mel_spec = librosa.feature.melspectrogram(y=segment, sr=sr, n_mels=n_mels, hop_length=hop_length)
    mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)
    return mel_spec_db

# Use the same CNN14 class as in your training code:
class CNN14(nn.Module):
    def __init__(self, num_classes=527):
        super(CNN14, self).__init__()
        # Four convolutional blocks:
        self.conv1 = nn.Sequential(
            nn.Conv2d(1, 64, kernel_size=3, padding=1),    
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(2)
        )
        self.conv2 = nn.Sequential(
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.MaxPool2d(2)
        )
        self.conv3 = nn.Sequential(
            nn.Conv2d(128, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(),
            nn.MaxPool2d(2)
        )
        # In training we modified conv4 to output 2048 channels
        self.conv4 = nn.Sequential(
            nn.Conv2d(256, 2048, kernel_size=3, padding=1),
            nn.BatchNorm2d(2048),
            nn.ReLU(),
            nn.MaxPool2d(2)
        )
        self.avg_pool = nn.AdaptiveAvgPool2d((1, 1))
        # fc1 projects from 2048 to 2048 (as expected by the checkpoint)
        self.fc1 = nn.Linear(2048, 2048)
        # Final classification layer (output: number of classes)
        self.fc_audioset = nn.Linear(2048, num_classes)
    
    def forward(self, x):
        x = self.conv1(x)   
        x = self.conv2(x)
        x = self.conv3(x)
        x = self.conv4(x)
        x = self.avg_pool(x)
        x = x.view(x.size(0), -1)  # shape: (batch, 2048)
        x = self.fc1(x)            # shape: (batch, 2048)
        x = self.fc_audioset(x)    # shape: (batch, num_classes)
        return x

if __name__ == '__main__':
    # Get file paths for model and mapping
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    model_save_path = os.path.join(base_dir, "Trained Models", "FrogPANN.pth")
    mapping_save_path = os.path.join(base_dir, "PANN Model", "label_mapping.json")
    test_audio_path = os.path.join(base_dir, "Testing Audio", "Test.mp3")
    
    # Load label mapping (mapping: {class_index: species_name})
    with open(mapping_save_path, "r") as f:
        label_mapping = json.load(f)
    # Ensure keys are integers
    label_mapping = {int(k): v for k, v in label_mapping.items()}
    num_classes = len(label_mapping)
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print("Using device:", device)
    
    # Instantiate the CNN14 model with the number of frog classes
    model = CNN14(num_classes=num_classes).to(device)
    # Load the saved state dict (from training)
    state_dict = torch.load(model_save_path, map_location=device)
    model.load_state_dict(state_dict)
    model.eval()
    
    # Path to the test audio file
    y, sr_actual = librosa.load(test_audio_path, sr=SR)
    total_duration = len(y) / SR
    print(f"Loaded test audio: duration = {total_duration:.2f} seconds")
    
    # Sliding window detection
    window_samples = int(SR * window_duration)
    step_samples = int(SR * 0.1)  # slide every 0.1 seconds
    detections = []  # list of detections: (start_time, end_time, species, confidence)
    
    for start_sample in range(0, len(y) - window_samples + 1, step_samples):
        segment = y[start_sample : start_sample + window_samples]
        start_time = start_sample / SR
        end_time = start_time + window_duration
        features = extract_features(segment)
        # Add batch and channel dimensions: shape (1, 1, mel_bins, time)
        features_tensor = torch.tensor(features, dtype=torch.float32).unsqueeze(0).unsqueeze(0).to(device)
        
        with torch.no_grad():
            output = model(features_tensor)
            probs = torch.softmax(output, dim=1)
            confidence, pred_idx = torch.max(probs, dim=1)
            confidence = confidence.item()
            pred_idx = int(pred_idx.item())
        
        # Only keep detections with high confidence
        if confidence >= 0.6:
            species = label_mapping[pred_idx]
            detections.append((start_time, end_time, species, confidence))
    
    print(f"Raw detections (window-level): {len(detections)}")
    
    # Print out the raw detections.
    for det in detections:
        start, end, species, conf = det
        print(f"{species}: from {start:.2f}s to {end:.2f}s (confidence: {conf:.2f})")
    
    # Visualization 
    time_axis = np.linspace(0, total_duration, len(y))
    plt.figure(figsize=(14, 6))
    plt.plot(time_axis, y, color='gray', label='Waveform')
    plt.xlabel("Time (s)")
    plt.ylabel("Amplitude")
    plt.title("Audio Waveform with Detected Frog Calls")
    
    # Use alternating offsets for labels
    base_high = np.max(y) * 0.9
    base_low  = np.max(y) * 0.7
    offset_increment = 0.1 * np.max(y)
    threshold_x = 0.2  # if centers are closer than 0.2 seconds, adjust vertical positions
    assigned_offsets = []
    merged_detections_sorted = sorted(detections, key=lambda d: (d[0]+d[1])/2)
    
    for i, (start, end, species, conf) in enumerate(merged_detections_sorted):
        center = (start + end) / 2
        offset = base_high if i % 2 == 0 else base_low
        for prev_center, prev_offset in assigned_offsets:
            if abs(center - prev_center) < threshold_x:
                if abs(offset - prev_offset) < offset_increment:
                    offset += offset_increment
        assigned_offsets.append((center, offset))
        plt.axvspan(start, end, color='red', alpha=0.3)
        plt.text(center, offset, f"{species}\n{conf:.2f}", horizontalalignment="center",
                 verticalalignment="bottom", color="black", fontsize=10, weight="bold")
    
    plt.legend()
    plt.tight_layout()
    plt.show()
