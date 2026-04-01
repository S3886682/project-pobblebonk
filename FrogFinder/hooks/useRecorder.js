import { useState, useCallback } from 'react';

export const useRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState(null);

  const startRecording = useCallback(async () => {
    try {
      setRecordingError(null);
      // STUB: Simulating recording start
      // TODO: Implement actual recording logic using expo Audio Recording @ micRecorderService
      setIsRecording(true);
      console.log('[STUB] Recording started');
    } catch (error) {
      setRecordingError(error.message);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    try {
      setRecordingError(null);
      // STUB: Simulating recording stop
      // TODO: Implement actual recording stop logic and return audio file URI @ micRecorderService
      setIsRecording(false);
      const dummyAudioFile = 'dummy-audio-wav';
      console.log('[STUB] Recording stopped, returning dummy audio');
      return dummyAudioFile;
    } catch (error) {
      setRecordingError(error.message);
    }
  }, []);

  const uploadFromFile = useCallback(async () => {
    try {
      setRecordingError(null);
      // STUB: Simulating file upload
      // TODO: Implement actual file picking logic using expo-document-picker @ filePickerService
      console.log('[STUB] File picker called');
      return 'dummy-audio-wav';
    } catch (error) {
      setRecordingError(error.message);
    }
  }, []);

  return {
    isRecording,
    recordingError,
    startRecording,
    stopRecording,
    uploadFromFile,
  };
};
