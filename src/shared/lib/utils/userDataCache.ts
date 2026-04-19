/** Default TTL for cached user snapshots (PR02). */
export const USER_DATA_CACHE_TTL_MS = 30_000;

type CacheEntry<T> = { value: T; expiresAt: number };

const stores = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

function now(): number {
  return Date.now();
}

/**
 * Module-level cache with TTL and in-flight promise dedupe per logical key.
 * Two concurrent callers for the same key share one factory execution.
 */
export async function getOrCreateCached<T>(
  key: string,
  factory: () => Promise<T>,
  ttlMs: number = USER_DATA_CACHE_TTL_MS
): Promise<T> {
  const existing = stores.get(key) as CacheEntry<T> | undefined;
  if (existing && existing.expiresAt > now()) {
    return existing.value;
  }

  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) {
    return pending;
  }

  const promise = (async () => {
    try {
      const value = await factory();
      stores.set(key, { value, expiresAt: now() + ttlMs });
      return value;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

/** Test hook: clear all cached entries and in-flight work. */
export function resetUserDataCacheForTests(): void {
  stores.clear();
  inflight.clear();
}

/** Drops one logical cache entry (e.g. after a profile mutation that must bypass TTL). */
export function deleteUserDataCacheEntry(key: string): void {
  stores.delete(key);
  inflight.delete(key);
}
