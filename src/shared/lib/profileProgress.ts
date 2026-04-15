import type { Database } from '@/types/pace-database';

type PersonRow = Database['public']['Tables']['core_person']['Row'];
type MemberRow = Database['public']['Tables']['core_member']['Row'];

/**
 * Tracked fields for completion — aligned with Supabase `core_person` / `core_member` columns.
 * Gender and pronoun live on `core_person`; membership type and number on `core_member`.
 */
export type ProfileProgressTracked = {
  person:
    | Pick<
        PersonRow,
        | 'first_name'
        | 'last_name'
        | 'email'
        | 'date_of_birth'
        | 'preferred_name'
        | 'gender_id'
        | 'pronoun_id'
      >
    | null;
  member: Pick<MemberRow, 'membership_type_id' | 'membership_number'> | null;
};

export type ProfileProgressResult = {
  /** 0–1 inclusive. */
  completionRatio: number;
  /** Fields considered in this calculation. */
  totalFields: number;
  /** Fields that have a non-empty value. */
  filledFields: number;
};

function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return !Number.isNaN(value);
  return true;
}

/**
 * Computes member-profile completion from a fixed set of tracked person + member fields.
 */
export function computeProfileProgress(input: ProfileProgressTracked): ProfileProgressResult {
  let filled = 0;
  let total = 0;

  const p = input.person;
  if (p) {
    const pkeys: (keyof NonNullable<ProfileProgressTracked['person']>)[] = [
      'first_name',
      'last_name',
      'email',
      'date_of_birth',
      'preferred_name',
      'gender_id',
      'pronoun_id',
    ];
    for (const k of pkeys) {
      total += 1;
      if (isFilled(p[k])) filled += 1;
    }
  } else {
    total += 7;
  }

  const m = input.member;
  if (m) {
    const mkeys: (keyof NonNullable<ProfileProgressTracked['member']>)[] = [
      'membership_type_id',
      'membership_number',
    ];
    for (const k of mkeys) {
      total += 1;
      if (isFilled(m[k])) filled += 1;
    }
  } else {
    total += 2;
  }

  const completionRatio = total === 0 ? 0 : filled / total;
  return {
    completionRatio,
    totalFields: total,
    filledFields: filled,
  };
}
