/*
 * Purpose: React hook that manages frog classification state — invokes the
 *          classifier service and exposes loading, progress, and result state.
 * Inputs:  classify(uri) — local audio file URI to classify.
 * Outputs: { classification, loading, error, progress, status,
 *            waveformSamples, classify, reset, cancel }
 */
import { useState, useCallback } from 'react';
import { classifierService } from '../services/classifierService';

export const useClassifier = () => {
  const [classification, setClassification] = useState(null);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState(null);
  const [progress, setProgress]             = useState(null);
  const [status, setStatus]                 = useState(null);
  const [waveformSamples, setWaveformSamples] = useState([]);

  const classify = useCallback(async (uri) => {
    try {
      setLoading(true);
      setError(null);
      setClassification(null);
      setWaveformSamples([]);

      const onWaveformReady = (samples) => setWaveformSamples(samples);

      const {
        label, confidence, all, windowCount, windows,
        waveformSamples: finalSamples, frogBuckets, frogLabels, audioDuration,
      } = await classifierService.processAudio(uri, setStatus, setProgress, onWaveformReady);

      // Ensure final samples are set (onWaveformReady already called, but guard)
      if (finalSamples?.length) setWaveformSamples(finalSamples);

      const result = {
        topMatch:     { name: label, confidence },
        alternatives: (all ?? []).slice(1).map(({ label: name, confidence: conf }) => ({ name, confidence: conf })),
        windowCount,
        windows:      windows ?? [],
        frogBuckets:  frogBuckets ?? [],
        frogLabels:   frogLabels  ?? [],
        audioDuration: audioDuration ?? 0,
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
    setWaveformSamples([]);
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
    waveformSamples,
    classify,
    reset,
    cancel,
  };
};
