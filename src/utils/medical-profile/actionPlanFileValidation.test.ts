import { describe, expect, it } from 'vitest';
import { ACTION_PLAN_MAX_BYTES, validateActionPlanFile } from '@/utils/medical-profile/actionPlanFileValidation';

function makeFile(name: string, type: string, size: number): File {
  const buf = new Uint8Array(size).fill(1);
  return new File([buf], name, { type });
}

describe('validateActionPlanFile', () => {
  it('accepts PDF within size limit', () => {
    const f = makeFile('plan.pdf', 'application/pdf', 1024);
    expect(validateActionPlanFile(f)).toEqual({ ok: true });
  });

  it('accepts allowed images', () => {
    expect(validateActionPlanFile(makeFile('x.jpg', 'image/jpeg', 100)).ok).toBe(true);
    expect(validateActionPlanFile(makeFile('x.png', 'image/png', 100)).ok).toBe(true);
    expect(validateActionPlanFile(makeFile('x.webp', 'image/webp', 100)).ok).toBe(true);
  });

  it('rejects disallowed MIME types', () => {
    const f = makeFile('bad.gif', 'image/gif', 100);
    const r = validateActionPlanFile(f);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toMatch(/PDF or image/i);
    }
  });

  it('rejects empty MIME type', () => {
    const f = makeFile('x.bin', '', 100);
    const r = validateActionPlanFile(f);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toMatch(/detect file type/i);
    }
  });

  it('rejects oversize files', () => {
    const f = makeFile('big.pdf', 'application/pdf', ACTION_PLAN_MAX_BYTES + 1);
    const r = validateActionPlanFile(f);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toMatch(/too large/i);
    }
  });
});
