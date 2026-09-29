/**
 * Tiny TTL cache that stores *promises* rather than resolved values.
 *
 * Storing the in-flight promise buys two things at once:
 *
 *  1. **Coalescing.** Two people auditing the same URL at the same moment — or a
 *     single render that reads the same key twice — share one network fetch
 *     instead of racing two.
 *  2. **A short memo.** A refresh, or clicking back into a result, is served from
 *     memory instead of re-fetching someone else's site.
 *
 * Like {@link ../rate-limit}, this is per-instance: on Vercel each serverless
 * instance keeps its own Map, so the hit rate in production is lower than it is
 * locally and the cache vanishes on cold start. That is acceptable because the
 * cache is an optimisation, never a correctness requirement.
 *
 * Failures are deliberately *not* cached — a site that was briefly unreachable
 * should be retried on the next attempt, not remembered as broken for a minute.
 */
export class TtlCache<V> {
  readonly #entries = new Map<string, { value: Promise<V>; expiresAt: number }>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 256,
  ) {}

  getOrCreate(key: string, factory: () => Promise<V>): Promise<V> {
    const now = Date.now();
    const hit = this.#entries.get(key);
    if (hit && hit.expiresAt > now) return hit.value;

    const value = factory();
    this.#entries.set(key, { value, expiresAt: now + this.ttlMs });

    // Evict on rejection so a transient failure is not remembered. The guard
    // matters: by the time this runs the entry may already have been replaced,
    // and deleting a newer entry would throw away a good result.
    //
    // Attaching .catch here also means this promise chain always has a handler,
    // so a rejection cannot surface as an unhandled rejection warning even if no
    // caller is awaiting yet.
    void value.catch(() => {
      if (this.#entries.get(key)?.value === value) this.#entries.delete(key);
    });

    this.#prune(now);
    return value;
  }

  /**
   * Drop expired entries, then oldest-first if still over the cap. Map iterates
   * in insertion order, so the first keys are the least recently *created*.
   */
  #prune(now: number): void {
    if (this.#entries.size <= this.maxEntries) return;

    for (const [key, entry] of this.#entries) {
      if (entry.expiresAt <= now) this.#entries.delete(key);
    }

    for (const key of this.#entries.keys()) {
      if (this.#entries.size <= this.maxEntries) break;
      this.#entries.delete(key);
    }
  }

  /** Test seam. */
  clear(): void {
    this.#entries.clear();
  }

  get size(): number {
    return this.#entries.size;
  }
}
