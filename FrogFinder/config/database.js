/*
 * Purpose: Opens the local SQLite database and initialises the sightings schema
 *          (table + indexes) on first run.
 * Inputs:  None (database path is fixed to "frogfinder.db").
 * Outputs: Default export db (SQLite connection); named export initializeDatabase().
 */
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'frogfinder.db';

// Open database connection
const db = SQLite.openDatabaseSync(DB_NAME);

// Initialize the database schema
export const initializeDatabase = async () => {
    try {
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS sightings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                species_name TEXT NOT NULL,
                scientific_name TEXT,
                confidence REAL,
                latitude REAL,
                longitude REAL,
                recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                audio_url TEXT,
                spectrogram_url TEXT,
                cloud_id TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_recorded_at ON sightings(recorded_at);
            CREATE INDEX IF NOT EXISTS idx_species_name ON sightings(species_name);
        `);
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
};

export default db;
