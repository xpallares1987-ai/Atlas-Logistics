import { describe, it, expect, beforeEach, vi } from "vitest";
import { MultiTierCache } from "./cache-manager.js";

describe("MultiTierCache", () => {
  let cache: MultiTierCache;

  beforeEach(() => {
    cache = new MultiTierCache({
      defaultTtlSeconds: 60,
      keyPrefix: "test:cache:",
    });
    cache.clearL1();
  });

  it("sets and gets an item from cache", async () => {
    await cache.set("user:123", { name: "Alice", role: "Dispatcher" });
    const user = await cache.get<{ name: string; role: string }>("user:123");
    expect(user).toEqual({ name: "Alice", role: "Dispatcher" });
  });

  it("returns null on cache miss", async () => {
    const missing = await cache.get("nonexistent");
    expect(missing).toBeNull();
  });

  it("executes fetcher on getOrSet miss and caches result", async () => {
    const fetcher = vi.fn().mockResolvedValue({ rate: 1.085, currency: "USD" });

    // First call: cache miss, fetcher invoked
    const firstCall = await cache.getOrSet("fx:EUR:USD", fetcher, {
      ttlSeconds: 120,
      tags: ["fx", "rates"],
    });
    expect(firstCall).toEqual({ rate: 1.085, currency: "USD" });
    expect(fetcher).toHaveBeenCalledTimes(1);

    // Second call: cache hit, fetcher not invoked
    const secondCall = await cache.getOrSet("fx:EUR:USD", fetcher);
    expect(secondCall).toEqual({ rate: 1.085, currency: "USD" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("deletes a key from cache", async () => {
    await cache.set("temp-key", "temporary-value");
    expect(await cache.get("temp-key")).toBe("temporary-value");

    await cache.delete("temp-key");
    expect(await cache.get("temp-key")).toBeNull();
  });

  it("invalidates keys by tag", async () => {
    await cache.set(
      "taric:84713000",
      { desc: "Laptops" },
      { tags: ["taric", "customs"] },
    );
    await cache.set(
      "taric:85171200",
      { desc: "Smartphones" },
      { tags: ["taric", "customs"] },
    );
    await cache.set(
      "incoterms:FOB",
      { desc: "Free on Board" },
      { tags: ["incoterms"] },
    );

    expect(await cache.get("taric:84713000")).not.toBeNull();
    expect(await cache.get("taric:85171200")).not.toBeNull();
    expect(await cache.get("incoterms:FOB")).not.toBeNull();

    // Invalidate 'taric' tag
    await cache.invalidateTags(["taric"]);

    expect(await cache.get("taric:84713000")).toBeNull();
    expect(await cache.get("taric:85171200")).toBeNull();
    // Incoterms key should still be untouched
    expect(await cache.get("incoterms:FOB")).toEqual({ desc: "Free on Board" });
  });

  it("supports l1-only tier explicitly", async () => {
    await cache.set("local-only", 42, { tier: "l1-only" });
    const val = await cache.get<number>("local-only", "l1-only");
    expect(val).toBe(42);
  });

  it("clears L1 cache", async () => {
    await cache.set("k1", "v1", { tier: "l1-only" });
    await cache.set("k2", "v2", { tier: "l1-only" });

    cache.clearL1();

    expect(await cache.get("k1", "l1-only")).toBeNull();
    expect(await cache.get("k2", "l1-only")).toBeNull();
  });
});
