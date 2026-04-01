import os
import numpy as np
import matplotlib.pyplot as plt
import os
os.environ["PATH"] += os.pathsep + r"C:\Program Files\FFMPEG\bin"  # Ensure this points to the directory containing ffmpeg.exe in case it's needed
from pydub import AudioSegment, silence
from tkinter import Tk, Scale, Button, Label, filedialog
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import threading    # Added for playback thread
import time         # Added for time tracking
import simpleaudio as sa   # New import for audio playback using simpleaudio

# Directory containing the MP3 files
base_dir = r"C:\Users\Alex\OneDrive\University\2025\Programming Project 1 (2510)"
directory = os.path.join(base_dir, "Songs of Disappearance - Australian Frog Calls")

# Global variables
audio_file_list = [f for f in os.listdir(directory) if f.lower().endswith(('.mp3'))]
current_index = 0
current_file = None
current_audio = None
manual_splits = []  # list of marker positions (in ms)
is_playing = False       # New flag to indicate playback status
playback_start_time = 0  # Global variable to track playback start time
waveform_line = None
playback_line = None
draggable_markers = []  # List to hold DraggableMarker objects

# Add a DraggableMarker class to allow marker lines to be moved by clicking and dragging
class DraggableMarker:
    def __init__(self, line, index):
        self.line = line
        self.index = index
        self.press = None
        self.cidpress = line.figure.canvas.mpl_connect('button_press_event', self.on_press)
        self.cidrelease = line.figure.canvas.mpl_connect('button_release_event', self.on_release)
        self.cidmotion = line.figure.canvas.mpl_connect('motion_notify_event', self.on_motion)
    
    def on_press(self, event):
        if event.inaxes != self.line.axes:
            return
        contains, _ = self.line.contains(event)
        if not contains:
            return
        self.press = event.xdata

    def on_motion(self, event):
        if self.press is None or event.xdata is None:
            return
        new_x = event.xdata
        self.line.set_xdata([new_x, new_x])
        manual_splits[self.index] = new_x
        self.line.figure.canvas.draw_idle()

    def on_release(self, event):
        self.press = None
        self.line.figure.canvas.draw_idle()

def draw_waveform():
    """Draw the waveform once and initialize playback and marker lines."""
    global waveform_line, playback_line, draggable_markers, manual_splits
    ax.clear()
    samples = np.array(current_audio.get_array_of_samples())
    if current_audio.channels > 1:
        samples = samples[::current_audio.channels]
    duration_ms = len(current_audio)
    time_axis = np.linspace(0, duration_ms, num=len(samples))
    waveform_line, = ax.plot(time_axis, samples, color='blue', label="Audio Signal")
    # Initialize playback line
    playback_line = ax.axvline(x=0, color='purple', linestyle='-', label="Playback Position")
    # Remove any old markers safely
    for dm in draggable_markers:
        try:
            dm.line.remove()
        except NotImplementedError:
            dm.line.set_visible(False)
    draggable_markers.clear()
    manual_splits.clear()
    ax.set_title("Audio Signal with Manual Split Markers")
    ax.set_xlabel("Time (ms)")
    ax.set_ylabel("Amplitude")
    ax.legend()
    canvas.draw_idle()

def plot_audio(ax, audio, markers, playback_position=None):
    """
    Plot the audio waveform with the manual split markers.
    The x-axis represents time in milliseconds.
    """
    # Get the samples and (if stereo) take the first channel
    samples = np.array(audio.get_array_of_samples())
    if audio.channels > 1:
        samples = samples[::audio.channels]
    
    duration_ms = len(audio)  # AudioSegment duration is in ms
    # Create a time axis for plotting (one value per sample in the channel)
    time_axis = np.linspace(0, duration_ms, num=len(samples))
    
    ax.clear()
    ax.plot(time_axis, samples, color='blue', label="Audio Signal")
    
    # Draw vertical lines for each manual marker.
    # Even-indexed markers are considered "start" (red), odd-indexed "end" (green).
    for i, marker in enumerate(markers):
        if i % 2 == 0:
            ax.axvline(x=marker, color='red', linestyle='--',
                       label="Start Marker" if i == 0 else "")
        else:
            ax.axvline(x=marker, color='green', linestyle='--',
                       label="End Marker" if i == 1 else "")
    
    # Draw the playback position line if provided
    if playback_position is not None:
        ax.axvline(x=playback_position, color='purple', linestyle='-', label="Playback Position")
    
    ax.set_title("Audio Signal with Manual Split Markers")
    ax.set_xlabel("Time (ms)")
    ax.set_ylabel("Amplitude")
    ax.legend()

# Modify the on_click function to add new draggable marker lines on click
def on_click(event):
    if event.inaxes is None or event.xdata is None:
        return
    # Add a new marker line at the clicked position
    color = 'red' if len(manual_splits) % 2 == 0 else 'green'
    new_line = ax.axvline(x=event.xdata, color=color, linestyle='--')
    manual_splits.append(event.xdata)
    dm = DraggableMarker(new_line, len(manual_splits) - 1)
    draggable_markers.append(dm)
    canvas.draw_idle()

def apply_manual_splits():
    """
    If an even number of markers have been selected (as start/end pairs),
    split the current audio based on these positions and export each segment.
    """
    global manual_splits, current_audio, current_file
    if len(manual_splits) < 2 or len(manual_splits) % 2 != 0:
        label_status.config(text="Please select an even number of markers (start and end pairs).")
        return
    
    base_name = os.path.splitext(os.path.basename(current_file))[0]
    output_folder = os.path.join(directory, base_name)
    os.makedirs(output_folder, exist_ok=True)
    
    num_segments = len(manual_splits) // 2
    for i in range(0, len(manual_splits), 2):
        start = manual_splits[i]
        end = manual_splits[i+1]
        # Ensure start is before end (swap if necessary)
        if start > end:
            start, end = end, start
        # Convert to integer milliseconds for slicing
        segment = current_audio[int(start):int(end)]
        output_path = os.path.join(output_folder, f"{base_name}_{(i//2)+1}.mp3")
        segment.export(output_path, format="mp3")
    
    label_status.config(text=f"Exported {num_segments} segment(s) for {base_name}.")

def clear_manual_splits():
    """
    Clear all manual markers and update the plot.
    """
    global manual_splits
    manual_splits = []
    plot_audio(ax, current_audio, manual_splits)
    canvas.draw()
    label_status.config(text="Markers cleared.")

# Modify load_next_file to draw waveform once after loading a new file
def load_next_file():
    global current_index, current_file, current_audio, manual_splits
    if not audio_file_list:
        label_status.config(text="No audio files found.")
        return
    
    current_file = os.path.join(directory, audio_file_list[current_index])
    current_index = (current_index + 1) % len(audio_file_list)
    # Explicitly set format for wav files
    if current_file.lower().endswith('.wav'):
        current_audio = AudioSegment.from_file(current_file, format="wav")
    else:
        current_audio = AudioSegment.from_file(current_file)
    draw_waveform()
    label_status.config(text=f"Loaded: {os.path.basename(current_file)}")

# Modify play_audio to update only the playback line (reducing full redraws)
def play_audio():
    global is_playing, playback_start_time, current_audio
    if current_audio is None or is_playing:
        return
    is_playing = True
    playback_start_time = time.time()

    # This thread updates the playback bar with high-frequency UI calls.
    def update_thread():
        while is_playing:
            elapsed = (time.time() - playback_start_time) * 1000  # in ms
            # Schedule UI update on the main thread.
            root.after(0, lambda e=elapsed: update_playback_line(e))
            time.sleep(0.01)  # Update every 10ms

    def update_playback_line(elapsed):
        if playback_line is not None:
            playback_line.set_xdata([elapsed, elapsed])
        canvas.draw_idle()

    # This thread handles the audio playback.
    def playback_thread():
        play_obj = sa.play_buffer(
            current_audio.raw_data,
            num_channels=current_audio.channels,
            bytes_per_sample=current_audio.sample_width,
            sample_rate=current_audio.frame_rate
        )
        play_obj.wait_done()
        global is_playing
        is_playing = False
        # Once done, reset the playback line.
        root.after(0, reset_playback_line)

    def reset_playback_line():
        if playback_line is not None:
            playback_line.set_xdata([0, 0])
        canvas.draw_idle()

    threading.Thread(target=update_thread, daemon=True).start()
    threading.Thread(target=playback_thread, daemon=True).start()

# GUI setup
root = Tk()
root.title("Manual Audio Splitter")

# Increase graph size: changed from (8, 4) to (12, 6)
fig, ax = plt.subplots(figsize=(24, 12))
canvas = FigureCanvasTkAgg(fig, master=root)
canvas_widget = canvas.get_tk_widget()
canvas_widget.pack()

# Connect the mouse click event on the plot to the on_click function
canvas.mpl_connect('button_press_event', on_click)

# Buttons for controlling the app
load_button = Button(root, text="Load Next File", command=load_next_file)
load_button.pack(pady=5)

apply_button = Button(root, text="Apply Manual Splits", command=apply_manual_splits)
apply_button.pack(pady=5)

clear_button = Button(root, text="Clear Markers", command=clear_manual_splits)
clear_button.pack(pady=5)

play_button = Button(root, text="Play Audio", command=play_audio)
play_button.pack(pady=5)

label_status = Label(root, text="Waiting for file...", padx=10, pady=5)
label_status.pack()

# Load the first file when the program starts
load_next_file()

root.mainloop()