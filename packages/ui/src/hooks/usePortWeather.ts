import { useState, useEffect } from 'react';

const weatherCache = new Map<string, {
  temp: number;
  windSpeed: number;
  description: string;
  icon: string;
  timestamp: number;
}>();

const CACHE_TTL = 3600000; // 1 hour in ms

/**
 * Hook to fetch Open-Meteo weather data for a port/coordinate.
 * Using Open-Meteo because it's completely free and requires no API key for non-commercial use.
 */
export function usePortWeather(lat: number, lon: number) {
  const [weather, setWeather] = useState<{
    temp: number;
    windSpeed: number;
    description: string;
    icon: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lat || !lon) return;
    const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;

    let mounted = true;
    const fetchWeather = async () => {
      // Check cache first
      const cached = weatherCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setWeather({
          temp: cached.temp,
          windSpeed: cached.windSpeed,
          description: cached.description,
          icon: cached.icon
        });
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Fetch current weather using Open-Meteo
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,weather_code&wind_speed_unit=kn&timezone=auto`
        );
        if (!response.ok) throw new Error('Weather API error');
        const data = await response.json();
        
        if (!mounted) return;
        
        // Simple mapping from WMO weather codes to lucide icons (rough approximation)
        const code = data.current.weather_code;
        let icon = 'Sun';
        let desc = 'Clear';
        
        if (code >= 1 && code <= 3) { icon = 'Cloud'; desc = 'Partly Cloudy'; }
        else if (code >= 51 && code <= 67) { icon = 'CloudRain'; desc = 'Rain'; }
        else if (code >= 71 && code <= 77) { icon = 'CloudSnow'; desc = 'Snow'; }
        else if (code >= 95) { icon = 'CloudLightning'; desc = 'Thunderstorm'; }
        
        setWeather({
          temp: data.current.temperature_2m, // Celsius
          windSpeed: data.current.wind_speed_10m, // Knots
          description: desc,
          icon
        });
        
        weatherCache.set(cacheKey, {
          temp: data.current.temperature_2m,
          windSpeed: data.current.wind_speed_10m,
          description: desc,
          icon,
          timestamp: Date.now()
        });
      } catch (err: any) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchWeather();
    return () => { mounted = false; };
  }, [lat, lon]);

  return { weather, loading, error };
}
