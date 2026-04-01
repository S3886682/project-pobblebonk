import os
import numpy as np
import librosa
from sklearn.model_selection import train_test_split
from sklearn.svm import SVC
from sklearn.metrics import classification_report
import pickle

# Add FFMPEG to PATH for decoding MP3s
os.environ["PATH"] = r"C:\Program Files\FFMPEG\bin;" + os.environ["PATH"]

# Set the paths to your audio folders
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
training_audio_path = os.path.join(base_dir, "Training Audio")
background_audio_path = os.path.join(base_dir, "Background Audio")

# Parameters for audio processing
SR = 32000          # Sample rate
DURATION = 0.3      # Duration (in seconds) for each prediction window
N_MFCC = 100         # Number of MFCC coefficients to extract

def extract_mfcc_features(file_path, n_mfcc=N_MFCC, duration=DURATION, sr=SR):
    """
    Load an audio file, extract MFCC features, and aggregate them by taking the mean
    over time frames.
    
    Args:
        file_path (str): Path to the audio file.
        n_mfcc (int): Number of MFCC coefficients.
        duration (float): Duration (seconds) to load from the audio file.
        sr (int): Sampling rate.
    
    Returns:
        np.ndarray: A 1D array containing the mean MFCC features.
    """
    try:
        y, _ = librosa.load(file_path, sr=sr, duration=duration)
        if len(y) < sr * duration:
            # Pad signal if audio is shorter than expected
            y = np.pad(y, (0, int(sr * duration) - len(y)))
        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=n_mfcc)
        mfcc_mean = np.mean(mfcc, axis=1)
        return mfcc_mean
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return None

# Prepare lists for features and labels
features = []
labels = []

# 1. Process frog species recordings from "Training Audio"
# Each folder inside 'Training Audio' is named after a frog species
print("Extracting features from Training Audio:")
species_dirs = sorted(os.listdir(training_audio_path))
for species in species_dirs:
    species_dir = os.path.join(training_audio_path, species)
    if os.path.isdir(species_dir):
        print(f"  Processing species: {species}")
        for file_name in os.listdir(species_dir):
            if file_name.lower().endswith('.wav'):
                file_path = os.path.join(species_dir, file_name)
                feat = extract_mfcc_features(file_path)
                if feat is not None:
                    features.append(feat)
                    labels.append(species)  # Use species name as label

# 2. Process background audio recordings from "Background Audio"
# These will be given a separate label, "Background"
print("Extracting features from Background Audio:")
if os.path.isdir(background_audio_path):
    for file_name in os.listdir(background_audio_path):
        if file_name.lower().endswith('.wav'):
            file_path = os.path.join(background_audio_path, file_name)
            feat = extract_mfcc_features(file_path)
            if feat is not None:
                features.append(feat)
                labels.append("Background")

# Convert to numpy arrays
features = np.array(features)
labels = np.array(labels)
print(f"Extracted {features.shape[0]} samples with feature dimension {features.shape[1]}.")

# Split the data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(
    features, labels, test_size=0.2, random_state=42, stratify=labels
)

# Create and train an SVM classifier
print("Training SVM classifier...")
classifier = SVC(kernel='rbf', C=1, gamma='scale', random_state=42, probability=True)
classifier.fit(X_train, y_train)

# Evaluate the classifier
y_pred = classifier.predict(X_test)
report = classification_report(y_test, y_pred)
print("Classification Report:\n", report)

# Save the trained classifier in the "Trained Models" folder
trained_models_dir = os.path.join(base_dir, "Trained Models")
os.makedirs(trained_models_dir, exist_ok=True)
classifier_save_path = os.path.join(trained_models_dir, "svm_classifier_1.pkl")

with open(classifier_save_path, "wb") as f:
    pickle.dump(classifier, f)

print(f"Trained classifier saved to: {classifier_save_path}")