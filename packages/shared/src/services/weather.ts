import { z } from "zod";

const OpenMeteoResponseSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  current_weather: z.object({
    temperature: z.number(),
    windspeed: z.number(),
    weathercode: z.number(),
  }),
});

export type OpenMeteoResponse = z.infer<typeof OpenMeteoResponseSchema>;

export interface WeatherData {
  temperature: number;
  windSpeed: number;
  weatherCode: number;
}

interface CacheEntry {
  data: WeatherData;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours

/**
 * Fetches current weather for a specific latitude and longitude.
 * Uses a 3-hour cache and Zod validation.
 *
 * @param lat Latitude
 * @param lon Longitude
 * @returns Parsed WeatherData or null on failure
 */
export async function getCurrentWeather(
  lat: number,
  lon: number,
): Promise<WeatherData | null> {
  const cacheKey = `${lat.toFixed(4)}_${lon.toFixed(4)}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`,
    );

    if (!response.ok) {
      throw new Error(`Open-Meteo returned status: ${response.status}`);
    }

    const json = await response.json();
    const validatedData = OpenMeteoResponseSchema.parse(json);

    const weatherData: WeatherData = {
      temperature: validatedData.current_weather.temperature,
      windSpeed: validatedData.current_weather.windspeed,
      weatherCode: validatedData.current_weather.weathercode,
    };

    cache.set(cacheKey, { data: weatherData, timestamp: Date.now() });
    return weatherData;
  } catch (error) {
    console.error(`Failed to fetch weather for ${cacheKey}:`, error);
    if (cached) {
      return cached.data;
    }
    return null;
  }
}
