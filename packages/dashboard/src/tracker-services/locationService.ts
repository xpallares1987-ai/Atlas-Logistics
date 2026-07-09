// ─────────────────────────────────────────────────────────────────────────────
// locationService.ts
// Fetches port/airport locations from Firestore REST API with in-memory cache.
// Project : gen-lang-client-0393063451  |  Database : database01
// ─────────────────────────────────────────────────────────────────────────────

export interface Location {
  locode: string;
  name: string;
  nameAlias?: string;
  countryCode: string;
  countryName: string;
  /** SEAPORT | AIRPORT | INLAND_PORT | RAIL_TERMINAL | … */
  type: string;
  region: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isActive: boolean;
}

// ─── Firestore REST types (minimal) ──────────────────────────────────────────

interface FirestoreStringValue {
  stringValue: string;
}
interface FirestoreDoubleValue {
  doubleValue: number;
}
interface FirestoreIntegerValue {
  integerValue: string | number;
}
interface FirestoreBooleanValue {
  booleanValue: boolean;
}

type FirestoreFieldValue =
  | FirestoreStringValue
  | FirestoreDoubleValue
  | FirestoreIntegerValue
  | FirestoreBooleanValue
  | { nullValue: null };

interface FirestoreDocument {
  name: string;
  fields: Record<string, FirestoreFieldValue>;
}

interface FirestoreListResponse {
  documents?: FirestoreDocument[];
}

// ─── Fallback data (shown when the network request fails) ────────────────────

const FALLBACK_LOCATIONS: Location[] = [
  {
    locode: "CNSHA",
    name: "Shanghai",
    countryCode: "CN",
    countryName: "China",
    type: "SEAPORT",
    region: "Asia",
    isActive: true,
  },
  {
    locode: "NLRTM",
    name: "Rotterdam",
    countryCode: "NL",
    countryName: "Netherlands",
    type: "SEAPORT",
    region: "Europe",
    isActive: true,
  },
  {
    locode: "SGSIN",
    name: "Singapore",
    countryCode: "SG",
    countryName: "Singapore",
    type: "SEAPORT",
    region: "Asia",
    isActive: true,
  },
  {
    locode: "ESBCN",
    name: "Barcelona",
    countryCode: "ES",
    countryName: "Spain",
    type: "SEAPORT",
    region: "Europe",
    isActive: true,
  },
  {
    locode: "USLAX",
    name: "Los Angeles",
    countryCode: "US",
    countryName: "USA",
    type: "SEAPORT",
    region: "Americas",
    isActive: true,
  },
  {
    locode: "DEHAM",
    name: "Hamburg",
    countryCode: "DE",
    countryName: "Germany",
    type: "SEAPORT",
    region: "Europe",
    isActive: true,
  },
  {
    locode: "BEANR",
    name: "Antwerp",
    countryCode: "BE",
    countryName: "Belgium",
    type: "SEAPORT",
    region: "Europe",
    isActive: true,
  },
  {
    locode: "JPTYO",
    name: "Tokyo",
    countryCode: "JP",
    countryName: "Japan",
    type: "SEAPORT",
    region: "Asia",
    isActive: true,
  },
  {
    locode: "AEJEA",
    name: "Jebel Ali",
    countryCode: "AE",
    countryName: "UAE",
    type: "SEAPORT",
    region: "Middle East",
    isActive: true,
  },
  {
    locode: "BRSSZ",
    name: "Santos",
    countryCode: "BR",
    countryName: "Brazil",
    type: "SEAPORT",
    region: "Americas",
    isActive: true,
  },
];

// ─── Firestore document parser ────────────────────────────────────────────────

function getString(
  fields: Record<string, FirestoreFieldValue>,
  key: string,
  fallback = "",
): string {
  const v = fields[key];
  if (!v) return fallback;
  if ("stringValue" in v) return v.stringValue;
  return fallback;
}

function getNumber(
  fields: Record<string, FirestoreFieldValue>,
  key: string,
): number | undefined {
  const v = fields[key];
  if (!v) return undefined;
  if ("doubleValue" in v) return v.doubleValue;
  if ("integerValue" in v) return Number(v.integerValue);
  return undefined;
}

function getBoolean(
  fields: Record<string, FirestoreFieldValue>,
  key: string,
  fallback = true,
): boolean {
  const v = fields[key];
  if (!v) return fallback;
  if ("booleanValue" in v) return v.booleanValue;
  return fallback;
}

function parseDoc(doc: FirestoreDocument): Location {
  const f = doc.fields ?? {};
  return {
    locode: getString(f, "locode"),
    name: getString(f, "name"),
    nameAlias: getString(f, "nameAlias") || undefined,
    countryCode: getString(f, "countryCode"),
    countryName: getString(f, "countryName"),
    type: getString(f, "type", "SEAPORT"),
    region: getString(f, "region"),
    latitude: getNumber(f, "latitude"),
    longitude: getNumber(f, "longitude"),
    timezone: getString(f, "timezone") || undefined,
    isActive: getBoolean(f, "isActive"),
  };
}

// ─── Firestore REST endpoint ──────────────────────────────────────────────────

const FIRESTORE_BASE =
  "https://firestore.googleapis.com/v1/projects/gen-lang-client-0393063451/databases/database01/documents";

const LOCATIONS_URL = `${FIRESTORE_BASE}/locations`;

// ─── Service ──────────────────────────────────────────────────────────────────

export const LocationService = {
  /** In-memory cache; populated on the first successful fetch. */
  _cache: null as Location[] | null,

  /**
   * Returns all active locations.
   * The first call hits Firestore REST; subsequent calls return the cache.
   */
  async getAll(): Promise<Location[]> {
    if (this._cache) return this._cache;

    try {
      const res = await fetch(LOCATIONS_URL);
      if (!res.ok)
        throw new Error(`Firestore responded with HTTP ${res.status}`);

      const data: FirestoreListResponse = await res.json();
      const docs = data.documents ?? [];

      const locations: Location[] = docs
        .map((doc) => {
          try {
            return parseDoc(doc);
          } catch {
            return null;
          }
        })
        .filter(
          (loc): loc is Location => loc !== null && loc.locode.length > 0,
        );

      this._cache = locations.length > 0 ? locations : [...FALLBACK_LOCATIONS];
    } catch (err) {
      console.warn(
        "[LocationService] Firestore fetch failed, using fallback data.",
        err,
      );
      this._cache = [...FALLBACK_LOCATIONS];
    }

    return this._cache;
  },

  /**
   * Searches locations by locode, name, nameAlias, countryName, or countryCode.
   * Returns an empty array when the query is shorter than 2 characters.
   * Maximum 8 results are returned.
   */
  async search(query: string): Promise<Location[]> {
    if (query.length < 2) return [];

    const all = await this.getAll();
    const q = query.toLowerCase().trim();

    return all
      .filter((loc) => {
        return (
          loc.locode.toLowerCase().includes(q) ||
          loc.name.toLowerCase().includes(q) ||
          (loc.nameAlias?.toLowerCase().includes(q) ?? false) ||
          loc.countryName.toLowerCase().includes(q) ||
          loc.countryCode.toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  },

  /**
   * Returns a country-flag emoji for a two-letter ISO 3166-1 alpha-2 code.
   * e.g. "CN" → "🇨🇳"
   */
  getFlag(countryCode: string): string {
    if (!countryCode || countryCode.length !== 2) return "";
    return countryCode
      .toUpperCase()
      .replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)));
  },

  /**
   * Formats a location as a human-readable string.
   * e.g. "CNSHA — Shanghai, China 🇨🇳"
   */
  format(loc: Location): string {
    const flag = this.getFlag(loc.countryCode);
    return `${loc.locode} — ${loc.name}, ${loc.countryName} ${flag}`.trim();
  },
};
