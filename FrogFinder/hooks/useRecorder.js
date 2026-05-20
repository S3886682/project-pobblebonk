import { useState, useCallback } from 'react';
import { micRecorderService } from '../services/micRecorderService';

export const useRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState(null);

  const startRecording = useCallback(async () => {
    try {
      setRecordingError(null);
      setIsRecording(true);
      await micRecorderService.startRecording(() => setIsRecording(false));
    } catch (error) {
      console.error('[useRecorder] startRecording failed:', error);
      setRecordingError(error.message);
      return false;
    }
    return true;
  }, []);

  const stopRecording = useCallback(async () => {
    try {
      setRecordingError(null);
      const uri = await micRecorderService.stopRecording();
      setIsRecording(false);
      return { uri, fileName: 'recording.m4a', mimeType: 'audio/m4a' };   // wrap uri
    } catch (error) {
      console.error('[useRecorder] stopRecording failed:', error);
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
