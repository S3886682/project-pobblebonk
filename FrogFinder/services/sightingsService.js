import * as FileSystem from 'expo-file-system/legacy';

const SIGHTINGS_PATH = `${FileSystem.documentDirectory}sightings.json`;

async function readAll() {
  try {
    const info = await FileSystem.getInfoAsync(SIGHTINGS_PATH);
    if (!info.exists) return [];
    const raw = await FileSystem.readAsStringAsync(SIGHTINGS_PATH);
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeAll(sightings) {
  await FileSystem.writeAsStringAsync(SIGHTINGS_PATH, JSON.stringify(sightings));
}

export const sightingsService = {
  async getSightings() {
    const all = await readAll();
    return all.sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  async addSighting(sighting) {
    const all = await readAll();
    const entry = {
      id:           Date.now().toString(),
      species:      sighting.species,
      confidence:   sighting.confidence,
      alternatives: sighting.alternatives ?? [],
      date:         sighting.date ?? new Date().toISOString(),
      location:     sighting.location ?? null,
    };
    all.push(entry);
    await writeAll(all);
    return entry;
  },

  async deleteSighting(id) {
    const all = await readAll();
    await writeAll(all.filter(s => s.id !== id));
  },

  async clearAll() {
    await writeAll([]);
  },
};
