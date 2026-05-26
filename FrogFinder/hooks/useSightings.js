import { useState, useEffect, useCallback } from 'react';
import { sightingsService } from '../services/sightingsService';

export const useSightings = () => {
  const [sightings, setSightings] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const fetchSightings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await sightingsService.getSightings();
      setSightings(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSightings(); }, [fetchSightings]);

  const addSighting = useCallback(async (sighting) => {
    const entry = await sightingsService.addSighting(sighting);
    setSightings(prev => [entry, ...prev]);
    return entry;
  }, []);

  const deleteSighting = useCallback(async (id) => {
    await sightingsService.deleteSighting(id);
    setSightings(prev => prev.filter(s => s.id !== id));
  }, []);

  return { sightings, loading, error, fetchSightings, addSighting, deleteSighting };
};
