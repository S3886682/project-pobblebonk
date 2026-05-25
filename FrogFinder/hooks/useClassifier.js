import { useState, useCallback } from 'react';
import { classifierService } from '../services/classifierService';

export const useClassifier = () => {
  const [classification, setClassification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);
  const [status, setStatus] = useState(null);

  const classify = useCallback(async (uri) => {
    try {
      setLoading(true);
      setError(null);
      setClassification(null);

      const { label, confidence, all, windowCount, windows } = await classifierService.processAudio(uri, setStatus, setProgress);

      const result = {
        topMatch: {
          name: label,
          confidence,
        },
        alternatives: (all ?? []).slice(1).map(({ label: name, confidence: conf }) => ({ name, confidence: conf })),
        windowCount,
        windows: windows ?? [],
      };

      setClassification(result);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
      setStatus(null);
      setProgress(null);
    }
  }, []);

  const reset = useCallback(() => {
    setClassification(null);
    setError(null);
    setStatus(null);
    setProgress(null);
    setLoading(false);
  }, []);

  const cancel = useCallback(() => {
    classifierService.cancelProcessing();
    reset();
  }, [reset]);

  return {
    classification,
    loading,
    error,
    progress,
    status,
    classify,
    reset,
    cancel,
  };
};