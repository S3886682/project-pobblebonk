import os
import io
import sys
from collections import Counter
import pickle
from flask import Flask, request, jsonify
from flask_cors import CORS
import librosa
import soundfile as sf
import numpy as np
from pydub import AudioSegment
import static_ffmpeg 
static_ffmpeg.add_paths()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Load the trained classifier
if hasattr(sys, '_MEIPASS'):
    base_dir = sys._MEIPASS
else:
    base_dir = os.path.dirname(os.path.abspath(__file__))

clf_path = os.path.join(base_dir, "Trained Models", "svm_classifier.pkl")

if not os.path.isfile(clf_path):
    raise FileNotFoundError(f"No classifier found at {clf_path}")

with open(clf_path, "rb") as f:
    clf = pickle.load(f)

# Audio processing parameters
SR = 32000
DURATION = 0.3
N_MFCC = 100
STRIDE = 0.2

def process_audio_file(file_path):
    """
    Process Audio File Regardless of format
        (Flutter records to M4A format)        
    """
    try:
        y, sr = librosa.load(file_path,sr=SR)
        return y, sr
    except Exception as e:
        print(f"Error Loading audio with librosa; {e}")
        try:
            # If direct loading fails
            # Convert M4A to WAV
            sound = AudioSegment.from_file(file_path)
            wav_io = io.BytesIO()
            sound.export(wav_io, format="wav")
            wav_io.seek(0)

            # Load the WAV data
            y, sr = librosa.load(wav_io, sr=SR)
            return y, sr
        except Exception as nested_e:
            print(f"Error in fallback audio audio processing: {nested_e}")
            raise Exception(f"Could not process audio file: {e}. Fallback Also Failed: {nested_e}")

def extract_features_from_signal(y, sr=SR, n_mfcc=N_MFCC, duration=DURATION):
    # Extract features from audio signal
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=n_mfcc)
    delta1 = librosa.feature.delta(mfcc, order=1)
    delta2 = librosa.feature.delta(mfcc, order=2)
    contrast = librosa.feature.spectral_contrast(y=y, sr=sr)
    centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
    mats = [mfcc, delta1, delta2, contrast, centroid]
    feats = []
    for m in mats:
        feats.append(np.mean(m, axis=1))
        feats.append(np.std(m, axis=1))
    return np.hstack(feats)

def predict_from_file(file_path):
    y, _ = process_audio_file(file_path)
    win_len = int(SR * DURATION)
    stride_len = int(SR * STRIDE)
    preds = []

    for start in range(0, len(y) - win_len + 1, stride_len):
        seg = y[start:start + win_len]
        feat = extract_features_from_signal(seg)
        feat = feat.reshape(1, -1)

        if hasattr(clf, "predict_proba"):
            probs = clf.predict_proba(feat)[0]
            label = clf.classes_[np.argmax(probs)]
            conf = np.max(probs)
        else:
            label = clf.predict(feat)[0]
            conf = None

        preds.append((start / SR, label, conf))

    # Filter out 'Background' predictions
    preds = [(start, label, conf) for start, label, conf in preds if label != "Background"]

    labels_only = [p[1] for p in preds]
    final_mode = Counter(labels_only).most_common(1)[0][0] if labels_only else None

    # Calculate average confidence
    avg_confidence = None
    if preds:
        confidences = [conf for _, _, conf in preds if conf is not None]
        avg_confidence = sum(confidences) / len(confidences) if confidences else None

    return final_mode, preds, avg_confidence

@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    file_path = os.path.join(base_dir, "temp_audio.wav")
    file.save(file_path)

    try:
        final_mode, predictions, avg_confidence = predict_from_file(file_path)
        response = {
            "final_prediction": final_mode,
            "predictions": [
                {"time": start, "label": label, "confidence": conf}
                for start, label, conf in predictions
            ],
            "average_confidence": avg_confidence
        }
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

if __name__ == '__main__':
    app.run(port=5000, host='0.0.0.0', debug=True)
