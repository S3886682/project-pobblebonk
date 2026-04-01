export const AppConfig = {
  // App metadata
  name: 'FrogFinder',
  version: '1.0.0',
  description: 'Identify Australian frog species by their calls',

  // Supabase configuration
  supabase: {
    url: process.env.REACT_APP_SUPABASE_URL,
    anonKey: process.env.REACT_APP_SUPABASE_ANON_KEY,
  },

  // Audio configuration
  audio: {
    format: 'wav',
    bitRate: 128000,
    channels: 1,
    quality: 'HIGH',
  },

  // Classification configuration
  classifier: {
    confidenceThreshold: 0.7,
    topResultsCount: 5,
    modelVersion: '1.0.0',
  },

  // Feature extraction
  featureExtraction: {
    type: 'MFCC',
    numFeatures: 13,
  },

  // Permissions
  permissions: {
    audio: true,
    location: true,
    storage: true,
  },

  // Features
  features: {
    offline: true,
    cloud: true,
    sharing: false,
  },
};
