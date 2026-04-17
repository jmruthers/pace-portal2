import type { AddressValue } from '@solvera/pace-core/forms';
import { z } from '@solvera/pace-core/utils';
import type { Database } from '@/types/pace-database';
import type { CorePhoneRow } from '@/hooks/contacts/usePhoneNumbers';
import { coreAddressRowToAddressValue } from '@/components/member-profile/MemberProfile/addressMapping';
import type { CoreAddressRow } from '@/hooks/shared/useAddressData';

type PersonRow = Database['public']['Tables']['core_person']['Row'];
type MemberRow = Database['public']['Tables']['core_member']['Row'];

/** Mirrors pace-core `addressValueSchemaRequired`; used on step 1 save only (not for RHF resolver). */
const addressValueSchemaRequired = z.object({
  line1: z.string().min(1, { message: 'Street address is required.' }),
  line2: z.string().optional(),
  locality: z.string().min(1, { message: 'Locality is required.' }),
  region: z.string().optional(),
  postalCode: z.string().optional(),
  countryCode: z
    .string()
    .min(2, { message: 'Country code is required.' })
    .max(2, { message: 'Country code must be two letters.' }),
  placeId: z.string().optional(),
  formattedAddress: z.string().optional(),
}) satisfies z.ZodType<AddressValue>;

/**
 * Draft address shape for the shared form: allows empty strings on steps 0–2 so `zodResolver` does not
 * validate contact fields while the user is still on personal details (blur would otherwise throw on
 * `residential.locality`, etc.).
 */
const addressValueSchemaLoose = z.object({
  line1: z.string(),
  line2: z.string().optional(),
  locality: z.string(),
  region: z.string().optional(),
  postalCode: z.string().optional(),
  countryCode: z.string(),
  placeId: z.string().optional(),
  formattedAddress: z.string().optional(),
}) satisfies z.ZodType<AddressValue>;

const postalAddressSchema = addressValueSchemaRequired.optional();

export const memberProfilePhoneRowSchema = z.object({
  /** Existing `core_phone.id` when this row came from the server. */
  serverId: z.string().optional(),
  phone_number: z.string(),
  phone_type_id: z.number().nullable(),
});

export type MemberProfileFormPhone = z.infer<typeof memberProfilePhoneRowSchema>;

/** RHF form: at least one row; step 1 save uses {@link memberProfileWizardStep1StrictSchema} for content rules. */
const phonesFormSchema = z.array(memberProfilePhoneRowSchema).min(1, { message: 'Add at least one phone number.' });

const phonesWithContactRule = z
  .array(memberProfilePhoneRowSchema)
  .min(1, { message: 'Add at least one phone number.' })
  .superRefine((rows, ctx) => {
    const hasNumber = rows.some((r) => r.phone_number.trim() !== '');
    if (!hasNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter at least one phone number.',
        path: [0, 'phone_number'],
      });
    }
  });

/**
 * Schema passed to `useZodForm` / `zodResolver`. Intentionally **looser** than step save rules on
 * address and phones so multi-step blur/change does not validate later steps early.
 */
export const memberProfileWizardFormSchema = z.object({
  first_name: z.string().min(1, { message: 'First name is required.' }),
  last_name: z.string().min(1, { message: 'Last name is required.' }),
  middle_name: z.string().nullable(),
  preferred_name: z.string().nullable(),
  email: z.string().min(1, { message: 'Email is required.' }).email({ message: 'Enter a valid email address.' }),
  date_of_birth: z
    .string()
    .min(1, { message: 'Date of birth is required.' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Use a complete date of birth.' }),
  gender_id: z.number().nullable(),
  pronoun_id: z.number().nullable(),
  residential: addressValueSchemaLoose,
  /** When omitted, the person has no separate postal address. */
  postal: addressValueSchemaLoose.optional(),
  phones: phonesFormSchema,
  membership_number: z.string().nullable(),
  membership_type_id: z.number().nullable(),
});

/** @deprecated Use {@link memberProfileWizardFormSchema}; kept for test harness imports. */
export const memberProfileWizardSchema = memberProfileWizardFormSchema;

export type MemberProfileFormValues = z.infer<typeof memberProfileWizardFormSchema>;
export type MemberProfileStepValidationIssue = {
  path: string;
  message: string;
};

const memberProfileWizardStep0Schema = memberProfileWizardFormSchema.pick({
  first_name: true,
  last_name: true,
  middle_name: true,
  preferred_name: true,
  email: true,
  date_of_birth: true,
  gender_id: true,
  pronoun_id: true,
});

/** Step 1 “save” validation (strict contact rules). */
const memberProfileWizardStep1StrictSchema = z.object({
  residential: addressValueSchemaRequired,
  postal: postalAddressSchema,
  phones: phonesWithContactRule,
});

const memberProfileWizardStep2Schema = memberProfileWizardFormSchema.pick({
  membership_number: true,
  membership_type_id: true,
});

export function emptyAddressValue(): AddressValue {
  return {
    line1: '',
    locality: '',
    countryCode: '',
  };
}

function dateOfBirthToInput(d: string | null): string {
  if (d == null || d.trim() === '') {
    return '';
  }
  return d.length >= 10 ? d.slice(0, 10) : d;
}

/**
 * Maps server rows into the wizard form model for `useZodForm` reset/prefill.
 */
export function buildMemberProfileFormDefaults(input: {
  person: PersonRow | null;
  member: MemberRow | null;
  phones: CorePhoneRow[];
  residential: CoreAddressRow | null;
  postal: CoreAddressRow | null;
}): MemberProfileFormValues {
  const { person, member, phones, residential, postal } = input;
  if (person == null) {
    return emptyMemberProfileFormValues();
  }

  const phoneRows: MemberProfileFormPhone[] =
    phones.length > 0
      ? phones.map((p) => ({
          serverId: p.id,
          phone_number: p.phone_number ?? '',
          phone_type_id: p.phone_type_id,
        }))
      : [{ phone_number: '', phone_type_id: null }];

  return {
    first_name: person.first_name ?? '',
    last_name: person.last_name ?? '',
    middle_name: person.middle_name,
    preferred_name: person.preferred_name,
    email: person.email ?? '',
    date_of_birth: dateOfBirthToInput(person.date_of_birth),
    gender_id: person.gender_id ?? null,
    pronoun_id: person.pronoun_id ?? null,
    residential: residential != null ? coreAddressRowToAddressValue(residential) : emptyAddressValue(),
    postal: postal != null ? coreAddressRowToAddressValue(postal) : undefined,
    phones: phoneRows,
    membership_number: member?.membership_number ?? null,
    membership_type_id: member?.membership_type_id ?? null,
  };
}

export function emptyMemberProfileFormValues(): MemberProfileFormValues {
  return {
    first_name: '',
    last_name: '',
    middle_name: null,
    preferred_name: null,
    email: '',
    date_of_birth: '',
    gender_id: null,
    pronoun_id: null,
    residential: emptyAddressValue(),
    postal: undefined,
    phones: [{ phone_number: '', phone_type_id: null }],
    membership_number: null,
    membership_type_id: null,
  };
}

export function validateMemberProfileWizardStep(
  stepIndex: number,
  values: MemberProfileFormValues
): { ok: true } | { ok: false; message: string; issues: MemberProfileStepValidationIssue[] } {
  const toIssues = (error: z.ZodError): MemberProfileStepValidationIssue[] =>
    error.issues.map((issue) => ({
      path: issue.path.map(String).join('.'),
      message: issue.message,
    }));

  if (stepIndex === 0) {
    const r = memberProfileWizardStep0Schema.safeParse(values);
    if (!r.success) {
      const msg = r.error.flatten().fieldErrors;
      const first =
        Object.values(msg)
          .flat()
          .find((m) => m != null && m !== '') ?? 'Check the highlighted personal fields.';
      return { ok: false, message: first, issues: toIssues(r.error) };
    }
    return { ok: true };
  }
  if (stepIndex === 1) {
    const r = memberProfileWizardStep1StrictSchema.safeParse(values);
    if (!r.success) {
      const first = r.error.issues[0]?.message ?? 'Check your contact details.';
      return { ok: false, message: first, issues: toIssues(r.error) };
    }
    return { ok: true };
  }
  const r = memberProfileWizardStep2Schema.safeParse(values);
  if (!r.success) {
    const first = r.error.issues[0]?.message ?? 'Check membership details.';
    return { ok: false, message: first, issues: toIssues(r.error) };
  }
  return { ok: true };
}
