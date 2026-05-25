import { err, ok, type ApiResult } from '@solvera/pace-core/types';
import { toTypedSupabase } from '@/lib/supabase-typed';

type TypedClient = NonNullable<ReturnType<typeof toTypedSupabase>>;

type FormRegistrationBinding = {
  registration_type_id: string;
  is_default: boolean | null;
  sort_order: number | null;
};

type EligibilityRule = {
  registration_type_id: string;
  rule_type: string;
  value: string;
};

function compareBindings(a: FormRegistrationBinding, b: FormRegistrationBinding): number {
  const aDefault = a.is_default === true ? 1 : 0;
  const bDefault = b.is_default === true ? 1 : 0;
  if (aDefault !== bDefault) {
    return bDefault - aDefault;
  }
  return (a.sort_order ?? 0) - (b.sort_order ?? 0);
}

function applicantMeetsEligibility(
  rules: EligibilityRule[],
  personDob: string | null,
  membershipTypeId: number | null
): boolean {
  const membershipRules = rules.filter((r) => r.rule_type === 'membership_type');
  if (membershipRules.length > 0) {
    if (membershipTypeId == null) {
      return false;
    }
    const memberTypeText = String(membershipTypeId);
    const membershipMatches = membershipRules.filter((r) => r.value === memberTypeText).length;
    if (membershipMatches !== membershipRules.length) {
      return false;
    }
  }

  const dobBeforeRules = rules.filter((r) => r.rule_type === 'dob_before');
  if (dobBeforeRules.length > 0) {
    if (personDob == null) {
      return false;
    }
    const dob = personDob.trim();
    const beforeMatches = dobBeforeRules.filter((r) => dob < r.value).length;
    if (beforeMatches !== dobBeforeRules.length) {
      return false;
    }
  }

  const dobAfterRules = rules.filter((r) => r.rule_type === 'dob_after');
  if (dobAfterRules.length > 0) {
    if (personDob == null) {
      return false;
    }
    const dob = personDob.trim();
    const afterMatches = dobAfterRules.filter((r) => dob > r.value).length;
    if (afterMatches !== dobAfterRules.length) {
      return false;
    }
  }

  return true;
}

/**
 * Picks the first form-bound registration type the applicant satisfies (BA05a eligibility rules).
 */
export async function fetchRegistrationTypeIdForApplicant(
  client: TypedClient,
  formId: string,
  applicantPersonId: string,
  organisationId: string
): Promise<ApiResult<string>> {
  const bindingsRes = await client
    .from('base_form_registration_type')
    .select('registration_type_id, is_default, sort_order')
    .eq('form_id', formId);

  if (bindingsRes.error) {
    return err({
      code: 'VALIDATION_FAILED',
      message: bindingsRes.error.message ?? 'Could not resolve registration type.',
    });
  }

  const bindings = ((bindingsRes.data ?? []) as FormRegistrationBinding[]).slice().sort(compareBindings);
  if (bindings.length === 0) {
    return err({
      code: 'VALIDATION_FAILED',
      message: 'This form has no registration type binding.',
    });
  }

  const regTypeIds = [...new Set(bindings.map((b) => b.registration_type_id).filter(Boolean))];

  const [personRes, memberRes, rulesRes] = await Promise.all([
    client
      .from('core_person')
      .select('date_of_birth')
      .eq('id', applicantPersonId)
      .maybeSingle(),
    client
      .from('core_member')
      .select('membership_type_id')
      .eq('person_id', applicantPersonId)
      .eq('organisation_id', organisationId)
      .is('deleted_at', null)
      .maybeSingle(),
    client
      .from('base_registration_type_eligibility')
      .select('registration_type_id, rule_type, value')
      .in('registration_type_id', regTypeIds),
  ]);

  const firstErr = personRes.error ?? memberRes.error ?? rulesRes.error;
  if (firstErr) {
    return err({
      code: 'VALIDATION_FAILED',
      message: firstErr.message ?? 'Could not verify eligibility.',
    });
  }

  const personDob = (personRes.data as { date_of_birth: string | null } | null)?.date_of_birth ?? null;
  const membershipTypeId =
    (memberRes.data as { membership_type_id: number | null } | null)?.membership_type_id ?? null;
  const allRules = (rulesRes.data ?? []) as EligibilityRule[];

  for (const binding of bindings) {
    const rules = allRules.filter((r) => r.registration_type_id === binding.registration_type_id);
    if (applicantMeetsEligibility(rules, personDob, membershipTypeId)) {
      return ok(binding.registration_type_id);
    }
  }

  return err({
    code: 'VALIDATION_FAILED',
    message:
      'This member is not eligible for any registration type on this form. Check membership type and date of birth, or contact the event team.',
  });
}
