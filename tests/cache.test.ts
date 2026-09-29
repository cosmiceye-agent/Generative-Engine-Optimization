import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TtlCache } from "@/lib/geo/cache";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("TtlCache", () => {
  it("runs the factory once for repeated keys inside the TTL", async () => {
    const cache = new TtlCache<number>(1000);
    const factory = vi.fn(async () => 42);

    const first = cache.getOrCreate("a", factory);
    const second = cache.getOrCreate("a", factory);

    expect(factory).toHaveBeenCalledTimes(1);
    // The same promise object is handed back, not merely an equal value.
    expect(first).toBe(second);
    await expect(first).resolves.toBe(42);
  });

  it("coalesces concurrent callers onto one in-flight promise", async () => {
    const cache = new TtlCache<string>(1000);
    let resolveFactory: (value: string) => void = () => {};
    const factory = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveFactory = resolve;
        }),
    );

    const a = cache.getOrCreate("k", factory);
    const b = cache.getOrCreate("k", factory);
    expect(factory).toHaveBeenCalledTimes(1);

    resolveFactory("done");
    await expect(Promise.all([a, b])).resolves.toEqual(["done", "done"]);
  });

  it("re-runs the factory once the TTL has elapsed", async () => {
    const cache = new TtlCache<number>(1000);
    let calls = 0;
    const factory = async () => ++calls;

    await expect(cache.getOrCreate("a", factory)).resolves.toBe(1);

    vi.advanceTimersByTime(999);
    await expect(cache.getOrCreate("a", factory)).resolves.toBe(1);

    vi.advanceTimersByTime(2);
    await expect(cache.getOrCreate("a", factory)).resolves.toBe(2);
  });

  it("keeps distinct keys separate", async () => {
    const cache = new TtlCache<string>(1000);
    await expect(cache.getOrCreate("a", async () => "A")).resolves.toBe("A");
    await expect(cache.getOrCreate("b", async () => "B")).resolves.toBe("B");
    expect(cache.size).toBe(2);
  });

  it("does not cache a rejection — the next call retries", async () => {
    const cache = new TtlCache<string>(1000);
    let attempt = 0;
    const factory = async () => {
      attempt += 1;
      if (attempt === 1) throw new Error("upstream down");
      return "recovered";
    };

    await expect(cache.getOrCreate("a", factory)).rejects.toThrow("upstream down");
    // The eviction runs in the rejection handler, so let the microtask queue drain.
    await Promise.resolve();

    await expect(cache.getOrCreate("a", factory)).resolves.toBe("recovered");
    expect(attempt).toBe(2);
  });

  it("evicting a failure does not discard a newer entry for the same key", async () => {
    const cache = new TtlCache<string>(1000);

    const failing = cache.getOrCreate("a", async () => {
      throw new Error("nope");
    });
    await expect(failing).rejects.toThrow("nope");

    // Replace the entry before the rejection handler has had a chance to run,
    // then let it run: it must leave the good entry alone.
    const good = cache.getOrCreate("a", async () => "good");
    await Promise.resolve();
    await Promise.resolve();

    expect(cache.getOrCreate("a", async () => "unused")).toBe(good);
    await expect(good).resolves.toBe("good");
  });

  it("prunes expired entries once past the cap", async () => {
    const cache = new TtlCache<number>(1000, 2);

    await cache.getOrCreate("a", async () => 1);
    await cache.getOrCreate("b", async () => 2);
    expect(cache.size).toBe(2);

    // Past the TTL, so inserting a third entry sweeps the two stale ones.
    vi.advanceTimersByTime(1001);
    await cache.getOrCreate("c", async () => 3);
    expect(cache.size).toBe(1);
  });

  it("falls back to dropping oldest-first when nothing has expired", async () => {
    const cache = new TtlCache<number>(10_000, 2);

    await cache.getOrCreate("a", async () => 1);
    await cache.getOrCreate("b", async () => 2);
    await cache.getOrCreate("c", async () => 3);

    expect(cache.size).toBe(2);
    // "a" was inserted first, so it is the one that went.
    let reran = false;
    await cache.getOrCreate("a", async () => {
      reran = true;
      return 1;
    });
    expect(reran).toBe(true);
  });

  it("clear() drops everything", async () => {
    const cache = new TtlCache<number>(1000);
    await cache.getOrCreate("a", async () => 1);
    expect(cache.size).toBe(1);

    cache.clear();
    expect(cache.size).toBe(0);
  });
});
