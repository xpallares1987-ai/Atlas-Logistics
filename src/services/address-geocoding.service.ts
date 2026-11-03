/**
 * Hybrid Address Geocoding & Validation Engine
 *
 * Standards & SLA:
 * - Primary: Google Maps Platform (if GOOGLE_MAPS_API_KEY is configured in environment)
 * - Fallback: OpenStreetMap Nominatim / Photon ($0 cost, resilient fallback)
 * - Shared 24-hour memory cache to prevent duplicate external calls and protect rate limits
 */

export type GeocodingProvider =
  "GOOGLE_MAPS" | "NOMINATIM" | "PHOTON" | "MANUAL";

export interface AutocompleteSuggestion {
  id: string;
  title: string;
  subtitle: string;
  formattedAddress: string;
  provider: GeocodingProvider;
  street1: string;
  zipCode: string;
  city: string;
  federalState?: string;
  country: string; // ISO 2-letter uppercase (ES, NL, US...)
  lat: number;
  lon: number;
}

export interface GeocodedAddressResult {
  street1: string;
  street2?: string;
  zipCode: string;
  city: string;
  federalState?: string;
  country: string;
  lat: number;
  lon: number;
  formattedAddress: string;
  provider: GeocodingProvider;
  confidence: number; // 0.0 to 1.0
  placeId?: string;
}

interface CacheItem<T> {
  data: T;
  expiresAt: number;
}

class AddressGeocodingService {
  private cache = new Map<string, CacheItem<any>>();
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 Hours

  private getCached<T>(key: string): T | null {
    const item = this.cache.get(key.toLowerCase().trim());
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key.toLowerCase().trim());
      return null;
    }
    return item.data;
  }

  private setCache<T>(key: string, data: T) {
    this.cache.set(key.toLowerCase().trim(), {
      data,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });
  }

  /**
   * Universal Smart Autocomplete Search
   */
  async searchAutocomplete(
    query: string,
    countryCode?: string,
  ): Promise<AutocompleteSuggestion[]> {
    const cleanQuery = query?.trim();
    if (!cleanQuery || cleanQuery.length < 2) {
      return [];
    }

    const cacheKey = `ac_${countryCode || "all"}_${cleanQuery}`;
    const cached = this.getCached<AutocompleteSuggestion[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const googleKey = process.env.GOOGLE_MAPS_API_KEY;

    // 1. Attempt Google Places / Geocode if API key exists
    if (googleKey) {
      try {
        const googleResults = await this.queryGoogleMaps(
          cleanQuery,
          countryCode,
          googleKey,
        );
        if (googleResults && googleResults.length > 0) {
          this.setCache(cacheKey, googleResults);
          return googleResults;
        }
      } catch (err: any) {
        console.warn(
          `[AddressGeocodingService] Google Maps query failed, falling back to OSM: ${err.message}`,
        );
      }
    }

    // 2. Fallback to OpenStreetMap (Nominatim / Photon)
    try {
      const osmResults = await this.queryNominatim(cleanQuery, countryCode);
      if (osmResults && osmResults.length > 0) {
        this.setCache(cacheKey, osmResults);
        return osmResults;
      }
    } catch (err: any) {
      console.warn(
        `[AddressGeocodingService] Nominatim failed, attempting Photon: ${err.message}`,
      );
    }

    // 3. Fallback to Photon by Komoot
    try {
      const photonResults = await this.queryPhoton(cleanQuery, countryCode);
      if (photonResults && photonResults.length > 0) {
        this.setCache(cacheKey, photonResults);
        return photonResults;
      }
    } catch (err: any) {
      console.error(
        `[AddressGeocodingService] All geocoding providers failed: ${err.message}`,
      );
    }

    return [];
  }

  /**
   * Geocode structured fields or freeform string
   */
  async geocodeAddress(params: {
    street1?: string;
    city?: string;
    zipCode?: string;
    federalState?: string;
    country?: string;
    rawQuery?: string;
  }): Promise<GeocodedAddressResult | null> {
    const queryParts = [
      params.street1,
      params.zipCode,
      params.city,
      params.federalState,
      params.country,
    ].filter(Boolean);

    const query = params.rawQuery || queryParts.join(", ");
    if (!query || query.trim().length < 3) {
      return null;
    }

    const cacheKey = `geo_${query}`;
    const cached = this.getCached<GeocodedAddressResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const suggestions = await this.searchAutocomplete(query, params.country);
    if (suggestions.length === 0) {
      return null;
    }

    const best = suggestions[0];
    const result: GeocodedAddressResult = {
      street1: best.street1 || params.street1 || "",
      zipCode: best.zipCode || params.zipCode || "",
      city: best.city || params.city || "",
      federalState: best.federalState || params.federalState,
      country: best.country || params.country || "ES",
      lat: best.lat,
      lon: best.lon,
      formattedAddress: best.formattedAddress,
      provider: best.provider,
      confidence: best.provider === "GOOGLE_MAPS" ? 0.95 : 0.85,
      placeId: best.id,
    };

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Google Maps API Integration
   */
  private async queryGoogleMaps(
    query: string,
    countryCode?: string,
    apiKey?: string,
  ): Promise<AutocompleteSuggestion[]> {
    const countryParam = countryCode
      ? `&components=country:${countryCode.toLowerCase()}`
      : "";
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      query,
    )}${countryParam}&key=${apiKey}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Google Maps HTTP ${res.status}`);
    }

    const json = (await res.json()) as any;
    if (json.status !== "OK" || !Array.isArray(json.results)) {
      if (json.status === "ZERO_RESULTS") return [];
      throw new Error(`Google Maps API status: ${json.status}`);
    }

    return json.results.slice(0, 5).map((r: any) => {
      let streetNumber = "";
      let route = "";
      let city = "";
      let zipCode = "";
      let state = "";
      let country = countryCode?.toUpperCase() || "ES";

      for (const comp of r.address_components || []) {
        const types: string[] = comp.types || [];
        if (types.includes("street_number")) streetNumber = comp.long_name;
        if (types.includes("route")) route = comp.long_name;
        if (types.includes("locality") || types.includes("postal_town"))
          city = comp.long_name;
        if (types.includes("postal_code")) zipCode = comp.long_name;
        if (
          types.includes("administrative_area_level_1") ||
          types.includes("administrative_area_level_2")
        ) {
          state = comp.long_name;
        }
        if (types.includes("country"))
          country = comp.short_name?.toUpperCase() || country;
      }

      const street1 =
        [route, streetNumber].filter(Boolean).join(", ") ||
        r.formatted_address.split(",")[0];

      return {
        id:
          r.place_id ||
          `g_${r.geometry.location.lat}_${r.geometry.location.lng}`,
        title: street1 || r.formatted_address,
        subtitle: [zipCode, city, state, country].filter(Boolean).join(", "),
        formattedAddress: r.formatted_address,
        provider: "GOOGLE_MAPS",
        street1,
        zipCode,
        city,
        federalState: state,
        country,
        lat: r.geometry.location.lat,
        lon: r.geometry.location.lng,
      };
    });
  }

  /**
   * OpenStreetMap Nominatim Integration ($0 Cost, Standard Compliant)
   */
  private async queryNominatim(
    query: string,
    countryCode?: string,
  ): Promise<AutocompleteSuggestion[]> {
    const countryParam = countryCode
      ? `&countrycodes=${countryCode.toLowerCase()}`
      : "";
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query,
    )}&format=json&addressdetails=1&limit=5${countryParam}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "AtlasLogistics-TMS/1.0 (operations@atlas-logistics.internal)",
        "Accept-Language": "es,en;q=0.8",
      },
    });

    if (!res.ok) {
      throw new Error(`Nominatim HTTP ${res.status}`);
    }

    const list = (await res.json()) as any[];
    if (!Array.isArray(list) || list.length === 0) {
      return [];
    }

    return list.map((item) => {
      const addr = item.address || {};
      const road =
        addr.road ||
        addr.pedestrian ||
        addr.street ||
        addr.industrial ||
        addr.commercial ||
        "";
      const houseNumber = addr.house_number || "";
      const street1 =
        [road, houseNumber].filter(Boolean).join(" ") ||
        item.name ||
        item.display_name.split(",")[0];
      const city =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.municipality ||
        addr.county ||
        "";
      const zipCode = addr.postcode || "";
      const federalState = addr.state || addr.province || addr.region || "";
      const country = (addr.country_code || countryCode || "es").toUpperCase();

      return {
        id: `osm_${item.place_id}`,
        title: street1 || item.display_name.split(",")[0],
        subtitle: [zipCode, city, federalState, country]
          .filter(Boolean)
          .join(", "),
        formattedAddress: item.display_name,
        provider: "NOMINATIM",
        street1,
        zipCode,
        city,
        federalState,
        country,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
      };
    });
  }

  /**
   * Photon by Komoot Integration (OSM-based Elasticsearch, fast fuzzy search)
   */
  private async queryPhoton(
    query: string,
    countryCode?: string,
  ): Promise<AutocompleteSuggestion[]> {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Photon HTTP ${res.status}`);
    }

    const data = (await res.json()) as any;
    const features = data?.features || [];

    return features.map((f: any) => {
      const p = f.properties || {};
      const coords = f.geometry?.coordinates || [0, 0];
      const street = p.street || p.name || "";
      const housenumber = p.housenumber || "";
      const street1 =
        [street, housenumber].filter(Boolean).join(" ") || p.name || "";
      const city = p.city || p.town || "";
      const zipCode = p.postcode || "";
      const federalState = p.state || "";
      const country = (p.countrycode || countryCode || "ES").toUpperCase();

      const subtitle = [zipCode, city, federalState, country]
        .filter(Boolean)
        .join(", ");
      const formattedAddress = [street1, subtitle].filter(Boolean).join(", ");

      return {
        id: `pho_${p.osm_id || Math.random()}`,
        title: street1 || p.name || formattedAddress,
        subtitle,
        formattedAddress,
        provider: "PHOTON",
        street1,
        zipCode,
        city,
        federalState,
        country,
        lat: coords[1],
        lon: coords[0],
      };
    });
  }
}

export const addressGeocodingService = new AddressGeocodingService();
