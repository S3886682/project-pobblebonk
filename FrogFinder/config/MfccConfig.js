export const MfccConfig = {
  // Audio processing parameters
  sampleRate: 44100,
  windowSize: 2048,
  hopSize: 512,
  
  // MFCC specific parameters
  numMfccCoefficients: 13,
  numMelBands: 40,
  
  // Frequency range
  minFrequency: 0,
  maxFrequency: 22050, 
  
  // Pre-emphasis
  preEmphasisCoefficient: 0.97,
  
  // DCT parameters
  dctType: 2,
  
  // Normalization
  normalize: true,
  
  // Logging
  debug: false,
};
