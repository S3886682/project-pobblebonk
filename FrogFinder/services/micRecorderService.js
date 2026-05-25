import { AudioModule, requestRecordingPermissionsAsync, setAudioModeAsync, IOSOutputFormat, AudioQuality } from 'expo-audio';
import { Platform } from 'react-native';

const MAX_RECORDING_DURATION_MS = 30000; // 30 seconds

// iOS records as 16-bit PCM WAV at 32 kHz (matches the classifier's expected sample rate).
// Android's MediaRecorder has no WAV output — it records AAC/M4A. The classify screen
// will show a clear error when an Android user tries to classify a mic recording.
const PLATFORM_OPTIONS = Platform.select({
  ios: {
    extension: '.wav',
    sampleRate: 32000,
    numberOfChannels: 1,
    bitRate: 512000,
    isMeteringEnabled: false,
    outputFormat: IOSOutputFormat.LINEARPCM,
    audioQuality: AudioQuality.HIGH,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  android: {
    extension: '.m4a',
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
    isMeteringEnabled: false,
    outputFormat: 'mpeg4',
    audioEncoder: 'aac',
  },
  default: {
    extension: '.wav',
    sampleRate: 32000,
    numberOfChannels: 1,
    bitRate: 512000,
    isMeteringEnabled: false,
    mimeType: 'audio/wav',
  },
});

// Handles mic recording for frog call classification.
// Errors are thrown and caught by the useRecorder hook.
class MicRecorderService {
  constructor() {
    this.recorder = null;
    this._statusSubscription = null;
  }

  // onAutoStop is called if the recorder hits MAX_RECORDING_DURATION_MS and stops itself.
  async startRecording(onAutoStop) {
    if (this.recorder) {
      throw new Error('Recording already in progress');
    }

    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      throw new Error('Microphone permission not granted');
    }

    // iOS throws RecordingDisabledException without this
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });

    this.recorder = new AudioModule.AudioRecorder(PLATFORM_OPTIONS);
    await this.recorder.prepareToRecordAsync(PLATFORM_OPTIONS);

    this._statusSubscription = this.recorder.addListener('recordingStatusUpdate', async (status) => {
      if (status.isFinished) {
        this._statusSubscription?.remove();
        this._statusSubscription = null;
        const uri = this.recorder?.uri;
        this.recorder?.release();
        this.recorder = null;
        // Reset audio session back to playback mode
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
        onAutoStop?.(uri);
      }
    });

    this.recorder.record({ forDuration: MAX_RECORDING_DURATION_MS / 1000 });
  }

  // Stops recording and returns the file URI.
  async stopRecording() {
    if (!this.recorder) {
      throw new Error('No active recording');
    }

    // Remove the auto-stop listener before stopping to avoid it firing during manual stop.
    this._statusSubscription?.remove();
    this._statusSubscription = null;

    await this.recorder.stop();
    const uri = this.recorder.uri;
    this.recorder.release();
    this.recorder = null;

    // Reset audio session back to playback mode
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    return uri;
  }
}

export const micRecorderService = new MicRecorderService();
