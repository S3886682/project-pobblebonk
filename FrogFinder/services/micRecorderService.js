import { AudioModule, requestRecordingPermissionsAsync, setAudioModeAsync, createAudioPlayer, IOSOutputFormat, AudioQuality } from 'expo-audio';
import { Platform } from 'react-native';

const MAX_RECORDING_DURATION_MS = 30000; // 30 seconds

// M4A is platform agnostic and SHOULD work on iOS, Android, and web. I only have access to iOS so this will need to be tested.
const COMMON_OPTIONS = {
  extension: '.m4a',
  sampleRate: 44100,
  numberOfChannels: 1, 
  bitRate: 128000,
  isMeteringEnabled: false,
};

const PLATFORM_OPTIONS = Platform.select({
  ios: {
    ...COMMON_OPTIONS,
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.HIGH,
    linearPCMBitDepth: 16,    // required by iOS audio session even for AAC
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  android: {
    ...COMMON_OPTIONS,
    outputFormat: 'mpeg4',
    audioEncoder: 'aac',
  },
  default: {
    ...COMMON_OPTIONS,
    mimeType: 'audio/webm', 
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
        if (uri) await this._playAndRelease(uri);
        onAutoStop?.(uri);
      }
    });

    this.recorder.record({ forDuration: MAX_RECORDING_DURATION_MS / 1000 });
  }

  // Stops recording, plays back for verification, returns the file URI.
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

    await this._playAndRelease(uri);
    return uri;
  }

  // Switches to playback mode (routes audio to speaker) and plays the file once after recording.
  async _playAndRelease(uri) {
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    const player = createAudioPlayer(uri);

    await new Promise((resolve) => {
      // Fallback timeout in case didJustFinish never fires (e.g. corrupt/empty recording).
      const timeout = setTimeout(() => {
        subscription.remove();
        player.release();
        resolve();
      }, MAX_RECORDING_DURATION_MS);

      const subscription = player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          clearTimeout(timeout);
          subscription.remove();
          player.release();
          resolve();
        }
      });
      player.play();
    });
  }
}

export const micRecorderService = new MicRecorderService();
