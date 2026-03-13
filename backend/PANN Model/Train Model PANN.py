import os
import json
import numpy as np
import librosa
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, random_split
from tqdm import tqdm
from numpy.core.multiarray import _reconstruct  
from multiprocessing import freeze_support

# Allow the _reconstruct global during unpickling
torch.serialization.add_safe_globals([_reconstruct])

# Add FFMPEG to PATH for decoding audio
os.environ["PATH"] = r"C:\Program Files\FFMPEG\bin;" + os.environ["PATH"]

# Set the path to your training audio folder
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
training_audio_path = os.path.join(base_dir, "Training Audio")

# Audio processing parameters for the 16k model
SR = 16000          # Sample rate (16kHz)
DURATION = 0.5      # Duration (in seconds) for each sample
N_MELS = 512         # Number of mel bins
HOP_LENGTH = 512    # Hop length for spectrogram

def augment_audio(y, sr=SR):
    # Time stretching augmentation (random factor between 0.9 and 1.1)
    rate = np.random.uniform(0.9, 1.1)
    y_stretched = librosa.effects.time_stretch(y, rate=rate)
    expected_length = int(sr * DURATION)
    if len(y_stretched) > expected_length:
        y_stretched = y_stretched[:expected_length]
    else:
        y_stretched = np.pad(y_stretched, (0, expected_length - len(y_stretched)))
    return y_stretched

def extract_features(file_path, sr=SR, duration=DURATION, n_mels=N_MELS, hop_length=HOP_LENGTH):
    """
    Load an audio file, optionally apply augmentation, pad/truncate to a fixed duration,
    and compute a mel spectrogram (in dB).
    """
    expected_length = int(sr * duration)
    y, _ = librosa.load(file_path, sr=sr, duration=duration)
    if np.random.rand() < 0.5:
        y = augment_audio(y, sr)
    if len(y) < expected_length:
        y = np.pad(y, (0, expected_length - len(y)))
    mel_spec = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=n_mels, hop_length=hop_length)
    mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)
    return mel_spec_db

class FrogSoundDataset(Dataset):
    """
    Custom Dataset that:
      - Expects DATA_DIR to contain one subfolder per frog species.
      - Each .wav file in a subfolder is an example of that class.
    """
    def __init__(self, data_dir):
        self.data = []        # List of tuples: (file_path, label)
        self.label_map = {}   # Mapping from class (folder name) to integer label
        for idx, cls in enumerate(sorted(os.listdir(data_dir))):
            cls_dir = os.path.join(data_dir, cls)
            if os.path.isdir(cls_dir):
                self.label_map[cls] = idx
                for file in os.listdir(cls_dir):
                    if file.lower().endswith('.wav'):
                        file_path = os.path.join(cls_dir, file)
                        if os.path.isfile(file_path):
                            self.data.append((file_path, idx))
                        
    def __len__(self):
        return len(self.data)
    
    def __getitem__(self, idx):
        file_path, label = self.data[idx]
        features = extract_features(file_path)
        # Add channel dimension: (1, mel_bins, time)
        features_tensor = torch.tensor(features, dtype=torch.float32).unsqueeze(0)
        return features_tensor, torch.tensor(label, dtype=torch.long)

# Official CNN14 architecture for PANNs (simplified version matching the checkpoint)
class CNN14(nn.Module):
    def __init__(self, num_classes=527):
        super(CNN14, self).__init__()
        # Four convolutional blocks
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
        # Modify conv4 to output 2048 channels so fc1 can match
        self.conv4 = nn.Sequential(
            nn.Conv2d(256, 2048, kernel_size=3, padding=1),
            nn.BatchNorm2d(2048),
            nn.ReLU(),
            nn.MaxPool2d(2)
        )
        self.avg_pool = nn.AdaptiveAvgPool2d((1, 1))
        self.fc1 = nn.Linear(2048, 2048)
        self.fc_audioset = nn.Linear(2048, num_classes)
    
    def forward(self, x):
        x = self.conv1(x)   
        x = self.conv2(x)
        x = self.conv3(x)
        x = self.conv4(x)
        x = self.avg_pool(x)
        x = x.view(x.size(0), -1)  # (batch, 2048)
        x = self.fc1(x)            # (batch, 2048)
        x = self.fc_audioset(x)    # (batch, num_classes)
        return x

if __name__ == '__main__':
    freeze_support()  # Only necessary if you plan to freeze to an executable; safe to call otherwise.

    # Prepare Dataset and DataLoaders 
    full_dataset = FrogSoundDataset(training_audio_path)
    dataset_size = len(full_dataset)
    train_size = int(0.8 * dataset_size)
    val_size = dataset_size - train_size
    train_dataset, val_dataset = random_split(full_dataset, [train_size, val_size])
    train_loader = DataLoader(train_dataset, batch_size=16, shuffle=True, num_workers=2)
    val_loader = DataLoader(val_dataset, batch_size=16, shuffle=False, num_workers=2)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print("Using device:", device)

    num_frog_classes = len(full_dataset.label_map)

    # Load the Pretrained PANNs Weights
    # Initialize CNN14 with original 527 classes (Based on the checkpoint)
    model = CNN14(num_classes=527).to(device)
    checkpoint_path = os.path.join(base_dir, "Trained Models", "Cnn14_16k_mAP=0.438.pth")
    # Load the checkpoint (using weights_only=False)
    ckpt = torch.load(checkpoint_path, map_location=device, weights_only=False)
    if isinstance(ckpt, dict) and "model" in ckpt:
        pretrained_weights = ckpt["model"]
    else:
        pretrained_weights = ckpt

    # Load weights with strict=False to ignore extra keys
    model.load_state_dict(pretrained_weights, strict=False)
    print("Pretrained weights loaded.")

    # Replace final classification layer to output number of frog classes.
    in_features = model.fc_audioset.in_features
    model.fc_audioset = nn.Linear(in_features, num_frog_classes)
    model = model.to(device)

    # Fine-Tuning Setup
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.0005)

    num_epochs = 10
    for epoch in range(num_epochs):
        model.train()
        running_loss = 0.0
        for inputs, targets in tqdm(train_loader, desc=f"Epoch {epoch+1}/{num_epochs}"):
            inputs, targets = inputs.to(device), targets.to(device)
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()
            running_loss += loss.item() * inputs.size(0)
        train_loss = running_loss / train_size

        model.eval()
        val_loss = 0.0
        correct = 0
        total = 0
        with torch.no_grad():
            for inputs, targets in val_loader:
                inputs, targets = inputs.to(device), targets.to(device)
                outputs = model(inputs)
                loss = criterion(outputs, targets)
                val_loss += loss.item() * inputs.size(0)
                preds = torch.argmax(outputs, dim=1)
                correct += (preds == targets).sum().item()
                total += targets.size(0)
        val_loss /= val_size
        val_acc = correct / total
        print(f"Epoch {epoch+1}/{num_epochs} | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} | Val Acc: {val_acc:.4f}")

    print("Training complete!")

   # Save the trained model and label mapping
    model_save_dir = os.path.join(base_dir, "Trained Models")
    os.makedirs(model_save_dir, exist_ok=True)
    model_save_path = os.path.join(model_save_dir, "FrogPANN.pth")
    mapping_save_path = os.path.join(base_dir, "CNN Model", "label_mapping.json")
    
    torch.save(model.state_dict(), model_save_path)
    print("Model saved to:", model_save_path)
    
    inverted_mapping = {v: k for k, v in full_dataset.label_map.items()}
    with open(mapping_save_path, "w") as f:
        json.dump(inverted_mapping, f)
    print("Label mapping saved to:", mapping_save_path)

