/*
 * Purpose: React hook that wraps microphone recording and file-picker selection,
 *          exposing a simple start/stop/upload API to screens.
 * Inputs:  User actions (startRecording, stopRecording, uploadFromFile).
 * Outputs: { isRecording, recordingError, startRecording, stopRecording, uploadFromFile }
 */
import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
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
      const isAndroid = Platform.OS === 'android';
      return {
        uri,
        fileName: isAndroid ? 'recording.m4a' : 'recording.wav',
        mimeType: isAndroid ? 'audio/m4a' : 'audio/wav',
      };
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
