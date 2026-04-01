import * as FileSystem from 'expo-file-system';

const SIGHTINGS_FILE = `${FileSystem.documentDirectory}/data/sightings.json`;

class SightingsService {
  async getSightings() {
    // To implement: Read sightings from file sightings.json
  }

  async addSighting(sighting) {
    // To implement: Add sighting to file sightings.json
  }

  async clearAllSightings() {
    // To implement: Clear all sightings from file sightings.json
  }
}

export const sightingsService = new SightingsService();
