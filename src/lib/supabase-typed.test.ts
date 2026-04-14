import { describe, expect, it } from 'vitest';
import { toTypedSupabase, toSupabaseClientLike } from '@/lib/supabase-typed';

describe('supabase-typed', () => {
  it('toTypedSupabase returns null for null client', () => {
    expect(toTypedSupabase(null)).toBeNull();
  });

  it('toTypedSupabase casts non-null client', () => {
    const fake = { from: () => ({}) };
    expect(toTypedSupabase(fake as never)).toBe(fake);
  });

  it('toSupabaseClientLike returns null for null client', () => {
    expect(toSupabaseClientLike(null)).toBeNull();
  });
});
