/*
 * Purpose: Low-level SQLite CRUD helpers for the sightings table — get, filter,
 *          add, update, delete, and clear sighting records.
 * Inputs:  Sighting data objects (species_name, confidence, lat/lng, etc.) or
 *          record IDs for delete/update operations.
 * Outputs: Query result arrays, last inserted row ID, or void on mutation.
 */
import db from '../config/database';

// Get all sightings
export const getSightings = async () => {
    try {
        const result = await db.getAllAsync('SELECT * FROM sightings ORDER BY recorded_at DESC');
        return result;
    } catch (error) {
        console.error('Error retrieving sightings:', error);
        throw error;
    }
};

// Get sightings filtered by species name
export const getSightingsBySpecies = async (speciesName) => {
    try {
        const result = await db.getAllAsync(
            'SELECT * FROM sightings WHERE species_name = ? ORDER BY recorded_at DESC',
            [speciesName]
        );
        return result;
    } catch (error) {
        console.error('Error retrieving sightings by species:', error);
        throw error;
    }
};

// Get recent sightings (last N records)
export const getRecentSightings = async (limit = 10) => {
    try {
        const result = await db.getAllAsync(
            'SELECT * FROM sightings ORDER BY recorded_at DESC LIMIT ?',
            [limit]
        );
        return result;
    } catch (error) {
        console.error('Error retrieving recent sightings:', error);
        throw error;
    }
};

// Add a new sighting
export const addSighting = async (sighting) => {
    try {
        const {
            species_name,
            scientific_name,
            confidence,
            latitude,
            longitude,
            audio_url,
            spectrogram_url,
        } = sighting;

        const result = await db.runAsync(
            `INSERT INTO sightings (
                species_name,
                scientific_name,
                confidence,
                latitude,
                longitude,
                audio_url,
                spectrogram_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [species_name, scientific_name, confidence, latitude, longitude, audio_url, spectrogram_url]
        );

        return result.lastInsertRowId;
    } catch (error) {
        console.error('Error adding sighting:', error);
        throw error;
    }
};

// Update an existing sighting
export const updateSighting = async (id, updates) => {
    try {
        const fields = Object.keys(updates)
            .map((key) => `${key} = ?`)
            .join(', ');
        const values = [...Object.values(updates), id];

        await db.runAsync(`UPDATE sightings SET ${fields} WHERE id = ?`, values);
    } catch (error) {
        console.error('Error updating sighting:', error);
        throw error;
    }
};

// Delete a sighting by ID
export const deleteSighting = async (id) => {
    try {
        await db.runAsync('DELETE FROM sightings WHERE id = ?', [id]);
    } catch (error) {
        console.error('Error deleting sighting:', error);
        throw error;
    }
};

// Clear all sightings
export const clearAllSightings = async () => {
    try {
        await db.runAsync('DELETE FROM sightings');
    } catch (error) {
        console.error('Error clearing sightings:', error);
        throw error;
    }
};

export const sightingsService = {
    getSightings,
    getSightingsBySpecies,
    getRecentSightings,
    addSighting,
    updateSighting,
    deleteSighting,
    clearAllSightings,
};

export default sightingsService;
