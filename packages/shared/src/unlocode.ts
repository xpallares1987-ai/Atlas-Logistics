/**
 * @file unlocode.ts
 * @description High-performance UN/LOCODE (United Nations Code for Trade and Transport Locations)
 * lookup engine with LRU Cache, 3-character prefix indexing, and Trie hierarchy.
 */

export interface UnlocodeEntry {
  location: string;
  name: string;
  nameWoDiacritics?: string;
  country: string;
  subdivision?: string;
  function?: string;
  status?: string;
  coordinates?: string;
}

/**
 * High-performance Least Recently Used (LRU) Cache with fixed capacity and performance metrics.
 */
export class LruCache<K, V> {
  private capacity: number;
  private cache: Map<K, V>;
  private hits: number = 0;
  private misses: number = 0;
  private evictions: number = 0;

  constructor(capacity: number = 250) {
    this.capacity = capacity;
    this.cache = new Map<K, V>();
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      this.misses++;
      return undefined;
    }
    this.hits++;
    const val = this.cache.get(key)!;
    // Refresh position (mark as most recently used)
    this.cache.delete(key);
    this.cache.set(key, val);
    return val;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Evict oldest (least recently used) item
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
        this.evictions++;
      }
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? ((this.hits / total) * 100).toFixed(1) + "%" : "0.0%";
    return {
      size: this.cache.size,
      capacity: this.capacity,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      hitRate,
    };
  }
}

class TrieNode {
  children = new Map<string, TrieNode>();
  entries: UnlocodeEntry[] = [];
}

/**
 * Prefix Trie index for high-speed candidate filtering of UN/LOCODE locations.
 * Uses 3-character prefix buckets and Trie branches to prune candidate sets.
 */
export class UnlocodePrefixTrie {
  private prefix3Map = new Map<string, UnlocodeEntry[]>();
  private trieRoot = new TrieNode();
  private totalIndexed = 0;

  public buildIndex(dataset: UnlocodeEntry[]): void {
    this.prefix3Map.clear();
    this.trieRoot = new TrieNode();
    this.totalIndexed = 0;

    for (const entry of dataset) {
      const keys = new Set<string>();
      if (entry.location) {
        keys.add(String(entry.location).toLowerCase().trim());
      }
      if (entry.nameWoDiacritics) {
        const words = String(entry.nameWoDiacritics).toLowerCase().split(/[\s,.-]+/);
        for (const w of words) {
          if (w.length >= 2) keys.add(w);
        }
      }
      if (entry.name) {
        const words = String(entry.name).toLowerCase().split(/[\s,.-]+/);
        for (const w of words) {
          if (w.length >= 2) keys.add(w);
        }
      }

      const addedPrefixes = new Set<string>();
      for (const word of keys) {
        if (word.length >= 3) {
          const p3 = word.slice(0, 3);
          if (!addedPrefixes.has(p3)) {
            addedPrefixes.add(p3);
            let list = this.prefix3Map.get(p3);
            if (!list) {
              list = [];
              this.prefix3Map.set(p3, list);
            }
            list.push(entry);
          }
        }
        this.insertTrie(word, entry);
      }
      this.totalIndexed++;
    }
  }

  private insertTrie(word: string, entry: UnlocodeEntry): void {
    let current = this.trieRoot;
    const maxDepth = Math.min(word.length, 5);
    for (let i = 0; i < maxDepth; i++) {
      const char = word[i];
      let next = current.children.get(char);
      if (!next) {
        next = new TrieNode();
        current.children.set(char, next);
      }
      current = next;
      if (current.entries.length < 250 && !current.entries.includes(entry)) {
        current.entries.push(entry);
      }
    }
  }

  public getCandidates(query: string): UnlocodeEntry[] | null {
    const q = query.toLowerCase().trim();
    if (q.length >= 3) {
      const p3 = q.slice(0, 3);
      const candidates = this.prefix3Map.get(p3);
      if (candidates && candidates.length > 0) {
        return candidates;
      }
    }

    if (q.length >= 2) {
      let current: TrieNode | undefined = this.trieRoot;
      const depth = Math.min(q.length, 5);
      for (let i = 0; i < depth; i++) {
        current = current?.children.get(q[i]);
        if (!current) return null;
      }
      return current ? current.entries : null;
    }

    return null;
  }

  public getStats() {
    return {
      indexedLocations: this.totalIndexed,
      unique3CharPrefixes: this.prefix3Map.size,
      trieMaxDepth: 5,
    };
  }
}

/** Standard global hubs pre-seeded for instantaneous zero-latency lookups */
export const DEFAULT_UNLOCODE_HUBS: UnlocodeEntry[] = [
  { location: "ESBCN", name: "Barcelona", nameWoDiacritics: "Barcelona", country: "ES", function: "12345---", coordinates: "4121N 00210E" },
  { location: "ESVLC", name: "Valencia", nameWoDiacritics: "Valencia", country: "ES", function: "12345---", coordinates: "3927N 00019W" },
  { location: "ESALG", name: "Algeciras", nameWoDiacritics: "Algeciras", country: "ES", function: "1234----", coordinates: "3608N 00527W" },
  { location: "ESMAD", name: "Madrid", nameWoDiacritics: "Madrid", country: "ES", function: "--34----", coordinates: "4025N 00342W" },
  { location: "NLRTM", name: "Rotterdam", nameWoDiacritics: "Rotterdam", country: "NL", function: "12345---", coordinates: "5155N 00428E" },
  { location: "DEHAM", name: "Hamburg", nameWoDiacritics: "Hamburg", country: "DE", function: "12345---", coordinates: "5333N 00959E" },
  { location: "BEANR", name: "Antwerpen", nameWoDiacritics: "Antwerpen", country: "BE", function: "12345---", coordinates: "5113N 00424E" },
  { location: "CNSHA", name: "Shanghai", nameWoDiacritics: "Shanghai", country: "CN", function: "12345---", coordinates: "3113N 12130E" },
  { location: "CNNGB", name: "Ningbo", nameWoDiacritics: "Ningbo", country: "CN", function: "12345---", coordinates: "2952N 12133E" },
  { location: "SGSIN", name: "Singapore", nameWoDiacritics: "Singapore", country: "SG", function: "12345---", coordinates: "0117N 10351E" },
  { location: "USLAX", name: "Los Angeles", nameWoDiacritics: "Los Angeles", country: "US", function: "12345---", coordinates: "3344N 11816W" },
  { location: "USNYC", name: "New York", nameWoDiacritics: "New York", country: "US", function: "12345---", coordinates: "4043N 07400W" },
  { location: "USSEA", name: "Seattle", nameWoDiacritics: "Seattle", country: "US", function: "12345---", coordinates: "4736N 12220W" },
  { location: "MXVER", name: "Veracruz", nameWoDiacritics: "Veracruz", country: "MX", function: "1234----", coordinates: "1912N 09608W" },
  { location: "MXLZC", name: "Lázaro Cárdenas", nameWoDiacritics: "Lazaro Cardenas", country: "MX", function: "1234----", coordinates: "1757N 10212W" },
  { location: "MXMAN", name: "Manzanillo", nameWoDiacritics: "Manzanillo", country: "MX", function: "1234----", coordinates: "1903N 10419W" },
  { location: "MXNLD", name: "Nuevo Laredo", nameWoDiacritics: "Nuevo Laredo", country: "MX", function: "--34----", coordinates: "2729N 09930W" },
];

export const unlocodeLruCache = new LruCache<string, UnlocodeEntry[]>(250);
export const unlocodeTrie = new UnlocodePrefixTrie();

let rawDataset: UnlocodeEntry[] = [...DEFAULT_UNLOCODE_HUBS];
unlocodeTrie.buildIndex(rawDataset);

/**
 * Ingests and indexes an expanded dataset of UN/LOCODE locations.
 */
export function initializeUnlocodes(dataset: UnlocodeEntry[]): void {
  rawDataset = dataset;
  unlocodeTrie.buildIndex(rawDataset);
  unlocodeLruCache.clear();
}

/**
 * Searches the UN/LOCODE repository with prefix trie acceleration and LRU caching.
 */
export function searchUnlocodes(
  query: string,
  country?: string,
  limit: number = 50,
): UnlocodeEntry[] {
  const q = (query || "").toLowerCase().trim();
  const c = (country || "").toUpperCase().trim();
  const cacheKey = `${q}__${c}__${limit}`;

  const cached = unlocodeLruCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  let candidates: UnlocodeEntry[] = rawDataset;
  if (q.length >= 2) {
    const trieCandidates = unlocodeTrie.getCandidates(q);
    if (trieCandidates && trieCandidates.length > 0) {
      candidates = trieCandidates;
    }
  }

  let results = candidates;
  if (c) {
    results = results.filter((l) => l.country === c);
  }
  if (q) {
    results = results.filter(
      (l) =>
        (l.location && l.location.toLowerCase().includes(q)) ||
        (l.nameWoDiacritics && l.nameWoDiacritics.toLowerCase().includes(q)) ||
        (l.name && l.name.toLowerCase().includes(q)),
    );
  }

  const sliced = results.slice(0, limit);
  unlocodeLruCache.set(cacheKey, sliced);
  return sliced;
}

export function getUnlocodeStats() {
  return {
    cache: unlocodeLruCache.getStats(),
    trie: unlocodeTrie.getStats(),
  };
}
