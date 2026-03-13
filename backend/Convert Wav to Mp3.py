import os
import sys
from pydub import AudioSegment
os.environ["PATH"] += os.pathsep + r"C:\Program Files\FFMPEG\bin" 

def convert_mp3_to_wav(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.lower().endswith(".mp3"):
                mp3_file = os.path.join(root, file)
                # Save WAV in the same folder and with the same base name as the MP3
                wav_file = os.path.join(root, os.path.splitext(file)[0] + ".wav")
                try:
                    audio = AudioSegment.from_mp3(mp3_file)
                    audio.export(wav_file, format="wav")
                    print(f"Converted: {mp3_file} -> {wav_file}")
                except Exception as e:
                    print(f"Failed to convert {mp3_file}: {e}")

if __name__ == "__main__":
    # Use fixed directory instead of command-line argument
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    training_audio_path = os.path.join(base_dir, "Training Audio")
    training_audio_path1 = "C:\\Users\\Alex\\OneDrive\\University\\2025\\Programming Project 1 (2510)\\Songs of Disappearance - Australian Frog Calls"
    convert_mp3_to_wav(training_audio_path1)
