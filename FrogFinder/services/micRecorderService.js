import * as AudioExpo from 'expo-audio';

class MicRecorderService {
  constructor() {
    this.recording = null;
  }

  async startRecording() {
    // TODO: Implement actual recording logic using expo Audio Recording
  }

  async stopRecording() {
    // TODO: Implement actual recording stop logic and return audio file URI
  }
}

export const micRecorderService = new MicRecorderService();
