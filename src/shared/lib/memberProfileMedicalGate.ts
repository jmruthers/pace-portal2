import { PROFILE_COMPLETENESS_THRESHOLD } from '@/lib/validateMemberRequestPreSubmit';
import type { MemberProfileLoadModel } from '@/hooks/member-profile/useMemberProfileData';
import { computeProfileProgress } from '@/shared/lib/profileProgress';

/**
 * Whether the loaded member profile blocks medical-profile access (PR09 readiness gate).
 * Aligns with membership pre-submit completeness ({@link PROFILE_COMPLETENESS_THRESHOLD}).
 */
export function isMemberProfileIncompleteForMedical(
  data: MemberProfileLoadModel | 'needs_setup' | undefined,
  userId: string | null | undefined
): boolean {
  if (!userId) return true;
  if (!data || data === 'needs_setup') return true;
  if (!data.member?.id) return true;

  const progress = computeProfileProgress({
    person: {
      first_name: data.person.first_name,
      last_name: data.person.last_name,
      email: data.person.email,
      date_of_birth: data.person.date_of_birth,
      preferred_name: data.person.preferred_name,
      gender_id: data.person.gender_id,
      pronoun_id: data.person.pronoun_id,
    },
    member: {
      membership_type_id: data.member.membership_type_id,
      membership_number: data.member.membership_number,
    },
  });

  return progress.completionRatio < PROFILE_COMPLETENESS_THRESHOLD;
}
