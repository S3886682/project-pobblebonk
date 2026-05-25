import speciesData from '../assets/data/speciesDetails.json';

class SpeciesService {
  constructor() {
    this.species = speciesData;
  }

  // Get species details by name (case-insensitive)
  getSpecies(name) {
    let result = null;
    const lowerName = name.toLowerCase();
    
    for (let i = 0; i < this.species.length; i++) {
      const species = this.species[i];
      if (species.name.toLowerCase() === lowerName) {
        result = species;
        break;
      }
    }
    
    return result;
  }

  getAllSpecies() {
    return this.species;
  }
}

export const speciesService = new SpeciesService();
