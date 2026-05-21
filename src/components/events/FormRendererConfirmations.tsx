import { Controller } from '@solvera/pace-core/forms';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Label,
  LoadingSpinner,
} from '@solvera/pace-core/components';
import type { UseFormReturn } from '@solvera/pace-core/forms';
import { usePhoneNumbers } from '@/hooks/auth/usePhoneNumbers';
import { useMedicalProfileData } from '@/hooks/medical-profile/useMedicalProfileData';
import { useFormAdditionalContactsPreview } from '@/hooks/events/useFormAdditionalContactsPreview';
import { MedicalProfileDisplay } from '@/components/medical-profile/MedicalProfile/MedicalProfileDisplay';

export function FormRendererConfirmations({
  confirmationKeys,
  personId,
  memberId,
  personFirstName,
  personLastName,
  personEmail,
  form,
}: {
  confirmationKeys: string[];
  personId: string | null;
  memberId: string | null;
  personFirstName: string | null;
  personLastName: string | null;
  personEmail: string | null;
  form: UseFormReturn<Record<string, unknown>>;
}) {
  const phonesQuery = usePhoneNumbers(personId);
  const medicalQuery = useMedicalProfileData(memberId);
  const contactsQuery = useFormAdditionalContactsPreview(memberId);

  if (confirmationKeys.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirmations</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        <fieldset className="min-w-0 border-0 p-0 m-0 grid gap-6">
          {confirmationKeys.includes('member_profile') ? (
            <section className="grid gap-2" aria-label="Member profile confirmation">
              <h3>Member profile</h3>
              <Card>
                <CardContent className="grid gap-2">
                  <p>
                    {(personFirstName ?? '').trim()} {(personLastName ?? '').trim()}
                  </p>
                  <p>{(personEmail ?? '').trim()}</p>
                  {phonesQuery.isError ? (
                    <Alert variant="destructive">
                      <AlertTitle>Phone numbers</AlertTitle>
                      <AlertDescription>
                        {phonesQuery.error instanceof Error
                          ? phonesQuery.error.message
                          : 'Could not load phone numbers.'}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <ul>
                      {(phonesQuery.data ?? []).map((ph) => (
                        <li key={ph.id}>
                          {ph.phone_number}
                          {ph.phone_type_id != null ? ` (type ${ph.phone_type_id})` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
              <Controller
                name={'confirmations.member_profile' as never}
                control={form.control}
                render={({ field, fieldState }) => (
                  <Label className="grid grid-cols-[auto_1fr] items-start gap-3">
                    <Checkbox
                      id="confirm-member-profile"
                      checked={Boolean(field.value)}
                      onChange={(next) => field.onChange(next)}
                      aria-invalid={fieldState.error != null}
                    />
                    <p>I confirm my member profile information is accurate.</p>
                  </Label>
                )}
              />
            </section>
          ) : null}

          {confirmationKeys.includes('medical_profile') ? (
            <section className="grid gap-2" aria-label="Medical profile confirmation">
              <h3>Medical profile</h3>
              {medicalQuery.isLoading ? <LoadingSpinner label="Loading medical summary…" /> : null}
              {medicalQuery.isError ? (
                <Alert variant="destructive">
                  <AlertTitle>Medical profile</AlertTitle>
                  <AlertDescription>
                    {medicalQuery.error instanceof Error
                      ? medicalQuery.error.message
                      : 'Could not load medical summary.'}
                  </AlertDescription>
                </Alert>
              ) : medicalQuery.data ? (
                <MedicalProfileDisplay conditions={medicalQuery.data.conditions} />
              ) : null}
              <Controller
                name={'confirmations.medical_profile' as never}
                control={form.control}
                render={({ field, fieldState }) => (
                  <Label className="grid grid-cols-[auto_1fr] items-start gap-3">
                    <Checkbox
                      id="confirm-medical-profile"
                      checked={Boolean(field.value)}
                      onChange={(next) => field.onChange(next)}
                      aria-invalid={fieldState.error != null}
                    />
                    <p>I confirm my medical profile summary is accurate.</p>
                  </Label>
                )}
              />
            </section>
          ) : null}

          {confirmationKeys.includes('additional_contacts') ? (
            <section className="grid gap-2" aria-label="Additional contacts confirmation">
              <h3>Additional contacts</h3>
              {contactsQuery.isLoading ? <LoadingSpinner label="Loading contacts…" /> : null}
              {contactsQuery.isError ? (
                <Alert variant="destructive">
                  <AlertTitle>Additional contacts</AlertTitle>
                  <AlertDescription>
                    {contactsQuery.error instanceof Error
                      ? contactsQuery.error.message
                      : 'Could not load additional contacts.'}
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <ul>
                    {(contactsQuery.data ?? []).map((c) => (
                      <li key={c.contact_id}>
                        {c.first_name} {c.last_name} — {c.contact_type_name}
                      </li>
                    ))}
                  </ul>
                  {(contactsQuery.data ?? []).length === 0 ? <p>No additional contacts on file.</p> : null}
                </>
              )}
              <Controller
                name={'confirmations.additional_contacts' as never}
                control={form.control}
                render={({ field, fieldState }) => (
                  <Label className="grid grid-cols-[auto_1fr] items-start gap-3">
                    <Checkbox
                      id="confirm-additional-contacts"
                      checked={Boolean(field.value)}
                      onChange={(next) => field.onChange(next)}
                      aria-invalid={fieldState.error != null}
                    />
                    <p>I confirm my additional contacts are up to date.</p>
                  </Label>
                )}
              />
            </section>
          ) : null}
        </fieldset>
      </CardContent>
    </Card>
  );
}
