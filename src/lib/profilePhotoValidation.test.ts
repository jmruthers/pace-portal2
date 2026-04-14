import { describe, expect, it } from 'vitest';
import { isErr, isOk } from '@solvera/pace-core/types';
import {
  PROFILE_PHOTO_MAX_BYTES,
  validateProfileImageFile,
} from '@/lib/profilePhotoValidation';

describe('validateProfileImageFile', () => {
  it('accepts jpeg under limit', () => {
    const f = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    const r = validateProfileImageFile(f);
    expect(isOk(r)).toBe(true);
  });

  it('rejects wrong mime', () => {
    const f = new File(['x'], 'a.gif', { type: 'image/gif' });
    const r = validateProfileImageFile(f);
    expect(isErr(r)).toBe(true);
  });

  it('rejects oversize', () => {
    const buf = new Uint8Array(PROFILE_PHOTO_MAX_BYTES + 1);
    const f = new File([buf], 'big.jpg', { type: 'image/jpeg' });
    const r = validateProfileImageFile(f);
    expect(isErr(r)).toBe(true);
  });
});
