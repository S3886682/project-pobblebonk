import * as Location from 'expo-location';

export const locationService = {
  async getCurrentLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const [place] = await Location.reverseGeocodeAsync({
        latitude:  loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      return {
        lat:      loc.coords.latitude,
        lng:      loc.coords.longitude,
        locality: place?.city || place?.subregion || place?.region || 'Unknown',
      };
    } catch {
      return null;
    }
  },
};
