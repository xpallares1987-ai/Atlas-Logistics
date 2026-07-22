import { z } from "zod";

const NominatimResponseSchema = z.array(
  z.object({
    place_id: z.number(),
    lat: z.string(),
    lon: z.string(),
    display_name: z.string(),
  }),
);

export type NominatimResponse = z.infer<typeof NominatimResponseSchema>;

export interface Coordinates {
  lat: number;
  lon: number;
  displayName: string;
}

interface CacheEntry {
  data: Coordinates;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Utility delay function for rate limiting
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Geocodes a search string using the Nominatim OpenStreetMap API.
 * Uses strict Zod validation and a 24-hour cache.
 * Implements a backoff/delay if a 429 is encountered.
 *
 * @param query A search string, e.g. "Port of Rotterdam"
 * @returns Parsed Coordinates or null if not found/error
 */
export async function geocodeLocation(
  query: string,
): Promise<Coordinates | null> {
  const cacheKey = query.trim().toLowerCase();
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query,
    )}&format=json&limit=1`;
    let response = await fetch(url, {
      headers: {
        "User-Agent": "AtlasLogistics/1.0",
      },
    });

    if (response.status === 429) {
      console.warn("Nominatim rate limit hit, waiting 2 seconds...");
      await delay(2000);
      response = await fetch(url, {
        headers: { "User-Agent": "AtlasLogistics/1.0" },
      });
    }

    if (!response.ok) {
      throw new Error(`Nominatim API returned status: ${response.status}`);
    }

    const json = await response.json();
    const validatedData = NominatimResponseSchema.parse(json);

    if (validatedData.length === 0) {
      return null;
    }

    const firstResult = validatedData[0];
    const coords: Coordinates = {
      lat: parseFloat(firstResult.lat),
      lon: parseFloat(firstResult.lon),
      displayName: firstResult.display_name,
    };

    if (isNaN(coords.lat) || isNaN(coords.lon)) {
      throw new Error("Nominatim returned invalid coordinates");
    }

    cache.set(cacheKey, { data: coords, timestamp: Date.now() });
    return coords;
  } catch (error) {
    console.error(`Failed to geocode ${query}:`, error);
    if (cached) {
      return cached.data;
    }
    return null;
  }
}
