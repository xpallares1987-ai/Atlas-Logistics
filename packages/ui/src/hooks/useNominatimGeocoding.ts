import { useState, useEffect } from 'react';

export interface Coordinates {
  lat: number;
  lon: number;
}

export function useNominatimGeocoding(locationName: string) {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!locationName) return;

    async function fetchCoordinates() {
      try {
        setLoading(true);
        // Nominatim is OpenStreetMap's search API. Free to use, no registration needed.
        // It requires a User-Agent header (or valid email) to avoid being blocked.
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName)}&format=json&limit=1`
        );
        if (!response.ok) {
          throw new Error('Geocoding failed');
        }
        const data = await response.json();
        if (data && data.length > 0) {
          setCoordinates({
            lat: parseFloat(data[0].lat),
            lon: parseFloat(data[0].lon),
          });
        } else {
          setCoordinates(null);
        }
      } catch (err) {
        console.error('Error in geocoding:', err);
        setError('Failed to resolve location coordinates.');
      } finally {
        setLoading(false);
      }
    }

    // Debounce or just call (since we only fetch when locationName changes from props)
    fetchCoordinates();
  }, [locationName]);

  return { coordinates, loading, error };
}
