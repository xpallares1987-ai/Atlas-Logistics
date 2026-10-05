import { describe, it, expect } from "vitest";
import {
  LruCache,
  UnlocodePrefixTrie,
  searchUnlocodes,
  getUnlocodeStats,
  initializeUnlocodes,
} from "./unlocode";

describe("UN/LOCODE High-Performance Engine & LRU Cache", () => {
  it("should enforce LRU capacity eviction and record metrics", () => {
    const cache = new LruCache<string, number>(3);

    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    expect(cache.get("a")).toBe(1); // 'a' accessed, so 'b' becomes least recently used

    cache.set("d", 4); // evicts 'b'
    expect(cache.has("b")).toBe(false);
    expect(cache.has("a")).toBe(true);
    expect(cache.has("c")).toBe(true);
    expect(cache.has("d")).toBe(true);

    const stats = cache.getStats();
    expect(stats.size).toBe(3);
    expect(stats.capacity).toBe(3);
    expect(stats.evictions).toBe(1);
    expect(stats.hits).toBeGreaterThan(0);
  });

  it("should index locations into prefix trie and prune candidates", () => {
    const trie = new UnlocodePrefixTrie();
    trie.buildIndex([
      { location: "ESBCN", name: "Barcelona", country: "ES" },
      { location: "ESVLC", name: "Valencia", country: "ES" },
      { location: "NLRTM", name: "Rotterdam", country: "NL" },
    ]);

    const candidates = trie.getCandidates("bar");
    expect(candidates).not.toBeNull();
    expect(candidates?.length).toBe(1);
    expect(candidates?.[0].location).toBe("ESBCN");
  });

  it("should find ports by UN/LOCODE code or city name", () => {
    const resultsCode = searchUnlocodes("ESBCN");
    expect(resultsCode.some((r) => r.location === "ESBCN")).toBe(true);

    const resultsName = searchUnlocodes("Rotterdam");
    expect(resultsName.some((r) => r.location === "NLRTM")).toBe(true);
  });

  it("should filter search results by country ISO code", () => {
    const spainOnly = searchUnlocodes("a", "ES");
    expect(spainOnly.length).toBeGreaterThan(0);
    spainOnly.forEach((loc) => {
      expect(loc.country).toBe("ES");
    });
  });

  it("should return telemetry metrics from getUnlocodeStats()", () => {
    const stats = getUnlocodeStats();
    expect(stats.cache).toBeDefined();
    expect(stats.trie).toBeDefined();
    expect(stats.trie.indexedLocations).toBeGreaterThan(0);
  });

  it("should allow dynamic dataset re-initialization", () => {
    initializeUnlocodes([
      { location: "TEST1", name: "Test Port One", country: "XX" },
      { location: "TEST2", name: "Test Port Two", country: "YY" },
    ]);

    const res = searchUnlocodes("Test Port One");
    expect(res).toHaveLength(1);
    expect(res[0].location).toBe("TEST1");
  });
});
