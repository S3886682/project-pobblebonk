import { useState, useCallback } from 'react';

const DUMMY_SPECIES = [
  {
    name: 'Pobblebonk',
    scientificName: 'Limnodynastes dumerilii',
    confidence: 0.92,
    description: 'A distinctive frog known for its deep, popping call',
    habitat: 'Victoria, Tasmania, NSW',
    size: '3-4 cm',
    callDescription: 'Deep bonk sound, like a wooden drum',
    conservationStatus: 'Least Concern',
  },
  {
    name: 'Green Tree Frog',
    scientificName: 'Litoria caerulea',
    confidence: 0.87,
    description: 'A bright green frog commonly kept as a pet',
    habitat: 'Victoria, Tasmania, NSW, QLD',
    size: '6-10 cm',
    callDescription: 'Loud, repetitive kwack or quack call',
    conservationStatus: 'Least Concern',
  },
  {
    name: 'Southern Bell Frog',
    scientificName: 'Litoria raniformis',
    confidence: 0.78,
    description: 'A large green frog with a distinctive call',
    habitat: 'Victoria, Tasmania, NSW, QLD',
    size: '4-6 cm',
    callDescription: 'Loud, deep bonk-bonk call',
    conservationStatus: 'Vulnerable',
  },
  {
    name: 'Common Eastern Froglet',
    scientificName: 'Crinia signifera',
    confidence: 0.45,
    description: 'A small frog with a distinctive call',
    habitat: 'Victoria, Tasmania, NSW, QLD',
    size: '2-3 cm',
    callDescription: 'High-pitched trill',
    conservationStatus: 'Least Concern',
  },
];

export const useClassifier = () => {
  const [classification, setClassification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const classify = useCallback(async (audioFile) => {
    try {
      setLoading(true);
      setError(null);
      
      // STUB: Simulate classification delay
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // STUB: Create result with top match and alternatives including species info
      const topSpecies = DUMMY_SPECIES[0];
      const alt1 = DUMMY_SPECIES[1];
      const alt2 = DUMMY_SPECIES[2];
      const alt3 = DUMMY_SPECIES[3];
      
      const result = {
        topMatch: {
          name: topSpecies.name,
          scientificName: topSpecies.scientificName,
          confidence: topSpecies.confidence,
          description: topSpecies.description,
          habitat: topSpecies.habitat,
          size: topSpecies.size,
          callDescription: topSpecies.callDescription,
          conservationStatus: topSpecies.conservationStatus,
        },
        alternatives: [
          {
            name: alt1.name,
            scientificName: alt1.scientificName,
            confidence: alt1.confidence,
          },
          {
            name: alt2.name,
            scientificName: alt2.scientificName,
            confidence: alt2.confidence,
          },
          {
            name: alt3.name,
            scientificName: alt3.scientificName,
            confidence: alt3.confidence,
          },
        ],
      };

      const classificationDetails = {
        recordingLength: '12.2',
        timestamp: new Date().toISOString(),
      };
      
      console.log('[STUB] Classification result:', result, 'Details:', classificationDetails);
      setClassification({ ...result, details: classificationDetails });
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    classification,
    loading,
    error,
    classify,
  };
};
