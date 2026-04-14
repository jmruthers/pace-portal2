import { describe, expect, it } from 'vitest';
import {
  sanitiseToApiResult,
  validateSafeRedirect,
  validateSlug,
  validateUuid,
} from '@/shared/lib/utils/inputValidation';
import { isErr, isOk } from '@solvera/pace-core/types';

describe('validateSlug', () => {
  it('accepts valid slugs', () => {
    const r = validateSlug('my-event-2026');
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.data).toBe('my-event-2026');
  });

  it('rejects empty and unsafe patterns', () => {
    expect(isErr(validateSlug(''))).toBe(true);
    expect(isErr(validateSlug('../x'))).toBe(true);
    expect(isErr(validateSlug('bad slug'))).toBe(true);
  });
});

describe('validateUuid', () => {
  it('accepts lowercase UUID v4', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    const r = validateUuid(id);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.data).toBe(id);
  });

  it('rejects invalid UUID', () => {
    expect(isErr(validateUuid('not-a-uuid'))).toBe(true);
  });
});

describe('validateSafeRedirect', () => {
  it('allows same-origin paths', () => {
    const r = validateSafeRedirect('/dashboard');
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.data).toBe('/dashboard');
  });

  it('blocks protocols and protocol-relative URLs', () => {
    expect(isErr(validateSafeRedirect('//evil.com'))).toBe(true);
    expect(isErr(validateSafeRedirect('https://evil.com'))).toBe(true);
    expect(isErr(validateSafeRedirect('javascript:alert(1)'))).toBe(true);
  });
});

describe('sanitiseToApiResult', () => {
  it('returns err with ApiResult shape', () => {
    const r = sanitiseToApiResult<void>(new Error('x'), 'E', 'fallback');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('E');
  });
});
