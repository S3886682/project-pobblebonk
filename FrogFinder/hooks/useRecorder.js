import { useState, useCallback } from 'react';
import { micRecorderService } from '../services/micRecorderService';
import { filePickerService } from '../services/filePickerService';

export const useRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState(null);

  // Start capturing audio from the microphone
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

  // Stop the active recording and return the audio file URI
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

  // Open the file picker and return the URI of the chosen audio file
  const uploadFromFile = useCallback(async () => {
    try {
      setRecordingError(null);
      const uri = await filePickerService.pickAudioFile();
      return uri;
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
