import { z } from '@solvera/pace-core/utils';
import type { AddressValue } from '@solvera/pace-core/forms';

const addressValueSchema: z.ZodType<AddressValue> = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  locality: z.string().min(1),
  region: z.string().optional(),
  postalCode: z.string().optional(),
  countryCode: z.string().min(2).max(2),
  placeId: z.string().optional(),
  formattedAddress: z.string().optional(),
});

export const memberProfilePhoneSchema = z.object({
  id: z.string().uuid().optional(),
  phone_number: z.string().min(1, 'Phone number is required.'),
  phone_type_id: z.number().int().positive().nullable(),
});

export const memberProfileSchema = z
  .object({
    first_name: z.string().min(1, 'First name is required.'),
    last_name: z.string().min(1, 'Last name is required.'),
    middle_name: z.string().optional().nullable(),
    preferred_name: z.string().optional().nullable(),
    email: z.string().email('Enter a valid email address.'),
    date_of_birth: z.string().min(1, 'Date of birth is required.'),
    gender_id: z.number(),
    pronoun_id: z.number(),
    residential: addressValueSchema,
    postal_same_as_residential: z.boolean(),
    postal: addressValueSchema.optional().nullable(),
    membership_type_id: z.number().int().positive().nullable(),
    membership_number: z.string().optional().nullable(),
    membership_status: z.enum(['Provisional', 'Cancelled', 'Active', 'Suspended', 'Resigned']),
    phones: z.array(memberProfilePhoneSchema).min(1, 'Add at least one phone number.'),
  })
  .superRefine((data, ctx) => {
    if (!(Number.isFinite(data.gender_id) && data.gender_id > 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Gender is required.',
        path: ['gender_id'],
      });
    }
    if (!(Number.isFinite(data.pronoun_id) && data.pronoun_id > 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Pronouns are required.',
        path: ['pronoun_id'],
      });
    }
    if (!data.postal_same_as_residential) {
      if (data.postal == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Postal address is required.',
          path: ['postal'],
        });
        return;
      }
      const postalResult = addressValueSchema.safeParse(data.postal);
      if (!postalResult.success) {
        for (const issue of postalResult.error.issues) {
          ctx.addIssue({ ...issue, path: ['postal', ...(issue.path as string[])] });
        }
      }
    }
  });

export type MemberProfileFormValues = z.infer<typeof memberProfileSchema>;
export type MemberProfileFormPhone = z.infer<typeof memberProfilePhoneSchema>;
