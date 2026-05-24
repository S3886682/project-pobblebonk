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

      const { label, confidence, windowCount } = await classifierService.processAudio(uri, setStatus, setProgress);

      const result = {
        topMatch: {
          name: label,
          scientificName: '',
          description: 'No description available',
          habitat: 'Unknown',
          size: 'Unknown',
          callDescription: 'Unknown',
          conservationStatus: 'Unknown',
          confidence,
        },
        alternatives: [],
        windowCount,
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
  }, []);

  return {
    classification,  // { label, confidence, windowCount }
    loading,
    error,
    progress,        // 0–1 during classification, null otherwise
    status,          // string status message, null otherwise
    classify,        // (uri: string) => Promise<{ label, confidence, windowCount }>
    reset,
  };
};