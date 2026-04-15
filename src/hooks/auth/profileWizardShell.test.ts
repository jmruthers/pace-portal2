import { describe, expect, it } from 'vitest';
import { buildCompletionPath, validateShellStep } from '@/hooks/auth/profileWizardShell';

describe('buildCompletionPath', () => {
  it('returns event form path with fromWizard when both slugs are set', () => {
    expect(buildCompletionPath('summer', 'apply')).toBe('/summer/apply?fromWizard=true');
  });

  it('encodes slugs', () => {
    expect(buildCompletionPath('a b', 'c/d')).toBe('/a%20b/c%2Fd?fromWizard=true');
  });

  it('falls back to dashboard when handoff is incomplete', () => {
    expect(buildCompletionPath('evt', null)).toBe('/dashboard');
    expect(buildCompletionPath(null, 'frm')).toBe('/dashboard');
    expect(buildCompletionPath(null, null)).toBe('/dashboard');
  });
});

describe('validateShellStep', () => {
  const person = {
    id: 'p1',
    user_id: 'u1',
    first_name: 'A',
    last_name: 'B',
    email: 'a@b.c',
    middle_name: null,
    preferred_name: null,
    date_of_birth: null,
    gender_id: null,
    pronoun_id: null,
    residential_address_id: null,
    postal_address_id: null,
    created_at: null,
    created_by: null,
    deleted_at: null,
    updated_at: null,
    updated_by: null,
  };

  it('requires a person on step 0', () => {
    const r = validateShellStep(0, {
      person: null,
      phones: [],
      addressUnresolved: true,
    });
    expect(r.ok).toBe(false);
  });

  it('passes step 0 when names and email are present', () => {
    const r = validateShellStep(0, {
      person,
      phones: [],
      addressUnresolved: true,
    });
    expect(r.ok).toBe(true);
  });

  it('rejects step 0 when email is blank', () => {
    const r = validateShellStep(0, {
      person: { ...person, email: '   ' },
      phones: [],
      addressUnresolved: true,
    });
    expect(r.ok).toBe(false);
  });

  it('requires a phone on step 1', () => {
    const r = validateShellStep(1, {
      person,
      phones: [],
      addressUnresolved: false,
    });
    expect(r.ok).toBe(false);
  });

  it('requires resolved address on step 1', () => {
    const r = validateShellStep(1, {
      person,
      phones: [{ phone_number: '1' }],
      addressUnresolved: true,
    });
    expect(r.ok).toBe(false);
  });

  it('passes step 1 with phone and resolved address', () => {
    const r = validateShellStep(1, {
      person,
      phones: [{ phone_number: '0400' }],
      addressUnresolved: false,
    });
    expect(r.ok).toBe(true);
  });

  it('treats step 2 as optional for shell checks', () => {
    const r = validateShellStep(2, {
      person: null,
      phones: [],
      addressUnresolved: true,
    });
    expect(r.ok).toBe(true);
  });
});
