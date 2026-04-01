import { useState, useEffect } from 'react';

const DUMMY_SIGHTINGS = [
  {
    id: '1',
    species: 'Pobblebonk',
    confidence: 0.92,
    alternatives: [
      { species: 'Eastern Banjo Frog', confidence: 0.71 },
      { species: 'Striped Marsh Frog', confidence: 0.68 },
    ],
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    location: {
      latitude: -37.8136,
      longitude: 144.9631,
      locality: 'Melbourne, VIC',
    },
  },
  {
    id: '2',
    species: 'Green Tree Frog',
    confidence: 0.87,
    alternatives: [
      { species: 'Common Eastern Froglet', confidence: 0.84 },
      { species: 'Mountain Frog', confidence: 0.72 },
    ],
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    location: {
      latitude: -27.4698,
      longitude: 153.0251,
      locality: 'Brisbane, QLD',
    },
  },
  {
    id: '3',
    species: 'Southern Bell Frog',
    confidence: 0.78,
    alternatives: [
      { species: 'Striped Marsh Frog', confidence: 0.76 },
      { species: 'Common Eastern Froglet', confidence: 0.65 },
    ],
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    location: {
      latitude: -38.1409,
      longitude: 145.3892,
      locality: 'Sale, VIC',
    },
  },
];

export const useSightings = () => {
  const [sightings, setSightings] = useState(DUMMY_SIGHTINGS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSightings = async () => {
    try {
      setLoading(true);
      // STUB: Return dummy sightings
      console.log('[STUB] Fetching sightings...');
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSightings(DUMMY_SIGHTINGS);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addSighting = async (sighting) => {
    try {
      // STUB: Add dummy sighting locally
      const newSighting = {
        id: Date.now().toString(),
        species: sighting.species,
        confidence: sighting.confidence,
        alternatives: sighting.alternatives,
        date: sighting.date,
        location: sighting.location,
      };
      
      const updatedSightings = sightings.concat(newSighting);
      setSightings(updatedSightings);
      console.log('[STUB] Sighting added:', newSighting);
      return newSighting;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    sightings,
    loading,
    error,
    fetchSightings,
    addSighting,
  };
};
