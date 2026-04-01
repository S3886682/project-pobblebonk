import os                # pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu126
import numpy as np       # pip install librosa
import librosa           # pip install imageio-ffmpeg
import torch             # pip install panns_inference
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, random_split
from tqdm import tqdm
import json

# Add FFMPEG to PATH for decoding MP3s
os.environ["PATH"] = r"C:\Program Files\FFMPEG\bin;" + os.environ["PATH"]

# Set the paths to your audio folders
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
training_audio_path = os.path.join(base_dir, "Training Audio")
background_audio_path = os.path.join(base_dir, "Background Audio")

# Parameters for audio processing
SR = 16000          # Sample rate
DURATION = 0.5      # Duration (in seconds) to which each audio will be fixed
N_MELS = 512        # Number of mel bins
HOP_LENGTH = 512    # Hop length for spectrogram

def augment_audio(y, sr=SR):
    # Augmentation: time stretching by a random factor between 0.9 and 1.1
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
    Load an audio file, optionally augment it, pad or truncate it to a fixed duration,
    and compute a mel spectrogram in decibel units.
    """
    expected_length = int(sr * duration)
    y, _ = librosa.load(file_path, sr=sr, duration=duration)
    # Optional augmentation (apply with 50% probability)
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
      - Loads frog call examples from the 'Training Audio' folder.
      - Loads background noise examples from the 'Background Audio' folder and assigns them
        a separate label "Background".
      - Assumes the 'Training Audio' folder contains one folder per frog species.
    """
    def __init__(self, training_dir, background_dir=None):
        self.data = []  # List of tuples: (audio_file_path, label)
        self.label_map = {}  # Mapping from class (folder name) to an integer label
        
        # Process frog call classes from the training directory.
        for idx, cls in enumerate(sorted(os.listdir(training_dir))):
            cls_dir = os.path.join(training_dir, cls)
            if os.path.isdir(cls_dir):
                self.label_map[cls] = idx
                for file in os.listdir(cls_dir):
                    if file.lower().endswith(('.wav')):
                        file_path = os.path.join(cls_dir, file)
                        if os.path.isfile(file_path):
                            self.data.append((file_path, idx))
        
        # Add background audio as its own category if provided.
        if background_dir is not None:
            background_label = "Background"
            # Assign the background label the next integer value.
            self.label_map[background_label] = len(self.label_map)
            for file in os.listdir(background_dir):
                if file.lower().endswith(('.wav')):
                    file_path = os.path.join(background_dir, file)
                    if os.path.isfile(file_path):
                        self.data.append((file_path, self.label_map[background_label]))
                        
    def __len__(self):
        return len(self.data)
    
    def __getitem__(self, idx):
        file_path, label = self.data[idx]
        features = extract_features(file_path)
        features_tensor = torch.tensor(features, dtype=torch.float32).unsqueeze(0)
        return features_tensor, torch.tensor(label, dtype=torch.long)

class FrogCNN(nn.Module):
    def __init__(self, num_classes):
        super(FrogCNN, self).__init__()
        self.conv1 = nn.Sequential(
            nn.Conv2d(1, 16, kernel_size=3, padding=1),
            nn.BatchNorm2d(16),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Dropout(0.3)
        )
        self.conv2 = nn.Sequential(
            nn.Conv2d(16, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Dropout(0.3)
        )
        self.conv3 = nn.Sequential(
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Dropout(0.3)
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
    # Create the full dataset by including both training audio and background noise.
    full_dataset = FrogSoundDataset(training_audio_path, background_audio_path)
    dataset_size = len(full_dataset)
    train_size = int(0.8 * dataset_size)
    val_size = dataset_size - train_size
    train_dataset, val_dataset = random_split(full_dataset, [train_size, val_size])
    
    # Create dataloaders for training and validation
    train_loader = DataLoader(train_dataset, batch_size=16, shuffle=True, num_workers=2)
    val_loader = DataLoader(val_dataset, batch_size=16, shuffle=False, num_workers=2)
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print("Using device:", device)
    
    num_classes = len(full_dataset.label_map)
    model = FrogCNN(num_classes).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.0005)
    
    num_epochs = 30
    for epoch in range(num_epochs):
        # Training phase
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
        
        # Validation phase
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
        val_loss = val_loss / val_size
        val_accuracy = correct / total
        
        print(f"Epoch {epoch+1}/{num_epochs} | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} | Val Acc: {val_accuracy:.4f}")
    
    print("Training complete!")
    
    # Save the trained model and label mapping
    model_save_dir = os.path.join(base_dir, "Trained Models")
    os.makedirs(model_save_dir, exist_ok=True)
    model_save_path = os.path.join(model_save_dir, "FrogCNN.pth")
    mapping_save_path = os.path.join(base_dir, "CNN Model", "label_mapping.json")
    
    torch.save(model.state_dict(), model_save_path)
    print("Model saved to:", model_save_path)
    
    inverted_mapping = {v: k for k, v in full_dataset.label_map.items()}
    with open(mapping_save_path, "w") as f:
        json.dump(inverted_mapping, f)
    print("Label mapping saved to:", mapping_save_path)
0