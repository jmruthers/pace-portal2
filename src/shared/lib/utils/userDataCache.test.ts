import { describe, expect, it, vi } from 'vitest';
import { getOrCreateCached, resetUserDataCacheForTests, USER_DATA_CACHE_TTL_MS } from '@/shared/lib/utils/userDataCache';

describe('getOrCreateCached', () => {
  it('reuses in-flight promise for the same key', async () => {
    resetUserDataCacheForTests();
    const factory = vi.fn().mockImplementation(
      () => new Promise<string>((resolve) => setTimeout(() => resolve('a'), 20))
    );
    const p1 = getOrCreateCached('k1', factory);
    const p2 = getOrCreateCached('k1', factory);
    const [a, b] = await Promise.all([p1, p2]);
    expect(a).toBe('a');
    expect(b).toBe('a');
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('returns cached value within TTL', async () => {
    resetUserDataCacheForTests();
    let n = 0;
    const factory = vi.fn().mockImplementation(async () => {
      n += 1;
      return n;
    });
    const first = await getOrCreateCached('k2', factory, USER_DATA_CACHE_TTL_MS);
    const second = await getOrCreateCached('k2', factory, USER_DATA_CACHE_TTL_MS);
    expect(first).toBe(1);
    expect(second).toBe(1);
    expect(factory).toHaveBeenCalledTimes(1);
  });
});
