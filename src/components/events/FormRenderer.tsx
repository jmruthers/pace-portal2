import { Fragment, useEffect, useMemo } from 'react';
import { useZodForm } from '@solvera/pace-core/hooks';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Label,
  LoadingSpinner,
} from '@solvera/pace-core/components';
import { Controller, FormProvider, resolveFieldRenderer, type FormFieldMeta } from '@solvera/pace-core/forms';
import {
  buildConfirmationZodSchema,
  composeDynamicFormSchema,
  createEventFormFieldRegistry,
} from '@/shared/lib/formFieldMeta';
import { usePhoneNumbers } from '@/hooks/auth/usePhoneNumbers';
import { useMedicalProfileData } from '@/hooks/medical-profile/useMedicalProfileData';
import { useFormAdditionalContactsPreview } from '@/hooks/events/useFormAdditionalContactsPreview';
import { MedicalProfileDisplay } from '@/components/medical-profile/MedicalProfile/MedicalProfileDisplay';

export type FormRendererProps = {
  eventTitle: string;
  formTitle: string;
  formDescription: string | null;
  fieldMetas: FormFieldMeta[];
  confirmationKeys: string[];
  personId: string | null;
  memberId: string | null;
  personFirstName: string | null;
  personLastName: string | null;
  personEmail: string | null;
  fieldDefaults: Record<string, unknown>;
  draftValues: Record<string, unknown>;
  prefillWarning: string | null;
  isDraftHydrating: boolean;
  draftHydrateError: string | null;
  scheduleSaveDraft: (dynamicValues: Record<string, unknown>) => void;
  isSavingDraft: boolean;
  saveDraftError: string | null;
};

function emptyAddress() {
  return {
    line1: '',
    line2: '',
    locality: '',
    region: '',
    postalCode: '',
    countryCode: '',
  };
}

function buildDefaultValues(
  fieldMetas: FormFieldMeta[],
  fieldDefaults: Record<string, unknown>,
  draftValues: Record<string, unknown>,
  confirmationKeys: string[]
): Record<string, unknown> {
  const conf: Record<string, boolean> = {};
  for (const k of confirmationKeys) {
    conf[k] = false;
  }
  const out: Record<string, unknown> = { confirmations: conf };
  for (const m of fieldMetas) {
    const v = draftValues[m.id] ?? fieldDefaults[m.id];
    if (m.fieldType === 'address') {
      out[m.id] =
        v != null && typeof v === 'object' && !Array.isArray(v)
          ? v
          : emptyAddress();
    } else if (m.fieldType === 'checkbox') {
      out[m.id] = v === true || v === 'true';
    } else {
      out[m.id] = v == null || v === '' ? '' : String(v);
    }
  }
  return out;
}

/**
 * PR15 dynamic event form: single `useZodForm` boundary, CR20 registry, confirmation blocks in-schema.
 */
export function FormRenderer({
  eventTitle,
  formTitle,
  formDescription,
  fieldMetas,
  confirmationKeys,
  personId,
  memberId,
  personFirstName,
  personLastName,
  personEmail,
  fieldDefaults,
  draftValues,
  prefillWarning,
  isDraftHydrating,
  draftHydrateError,
  scheduleSaveDraft,
  isSavingDraft,
  saveDraftError,
}: FormRendererProps) {
  const registry = useMemo(() => createEventFormFieldRegistry(), []);
  const dynamicSchema = useMemo(
    () => composeDynamicFormSchema(registry, fieldMetas),
    [registry, fieldMetas]
  );
  const confirmationSchema = useMemo(
    () => buildConfirmationZodSchema(confirmationKeys),
    [confirmationKeys]
  );

  const fullSchema = useMemo(
    () => dynamicSchema.extend({ confirmations: confirmationSchema }),
    [dynamicSchema, confirmationSchema]
  );

  const defaultValues = useMemo(
    () => buildDefaultValues(fieldMetas, fieldDefaults, draftValues, confirmationKeys),
    [fieldMetas, fieldDefaults, draftValues, confirmationKeys]
  );

  const form = useZodForm<Record<string, unknown>>({
    schema: fullSchema,
    defaultValues,
    mode: 'onSubmit',
  });

  useEffect(() => {
    if (!isDraftHydrating) {
      form.reset(buildDefaultValues(fieldMetas, fieldDefaults, draftValues, confirmationKeys));
    }
  }, [isDraftHydrating, fieldMetas, fieldDefaults, draftValues, confirmationKeys, form]);

  useEffect(() => {
    const subscription = form.watch((value) => {
      if (isDraftHydrating || draftHydrateError) return;
      if (value == null || typeof value !== 'object') return;
      const w = value as Record<string, unknown>;
      const dynamic: Record<string, unknown> = {};
      for (const k of Object.keys(w)) {
        if (k === 'confirmations') continue;
        dynamic[k] = w[k];
      }
      scheduleSaveDraft(dynamic);
    });
    return () => subscription.unsubscribe();
  }, [form, scheduleSaveDraft, isDraftHydrating, draftHydrateError]);

  const phonesQuery = usePhoneNumbers(personId);
  const medicalQuery = useMedicalProfileData(memberId);
  const contactsQuery = useFormAdditionalContactsPreview(memberId);

  const hasDraftRestore = useMemo(
    () => Object.keys(draftValues).some((k) => draftValues[k] !== undefined && draftValues[k] !== ''),
    [draftValues]
  );

  if (draftHydrateError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Form</AlertTitle>
        <AlertDescription>{draftHydrateError}</AlertDescription>
      </Alert>
    );
  }

  return (
    <FormProvider {...form}>
      <section className="grid max-w-(--app-width) gap-4">
        <h1>{eventTitle}</h1>
        <h2>{formTitle}</h2>

        {prefillWarning ? (
          <Alert variant="default">
            <AlertTitle>Prefill</AlertTitle>
            <AlertDescription>{prefillWarning}</AlertDescription>
          </Alert>
        ) : null}

        {hasDraftRestore ? (
          <Alert variant="default">
            <AlertTitle>Resuming your application</AlertTitle>
            <AlertDescription>Your saved answers for this form have been restored.</AlertDescription>
          </Alert>
        ) : null}

        {formDescription ? (
          <Card>
            <CardHeader>
              <CardTitle>About this form</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{formDescription}</p>
            </CardContent>
          </Card>
        ) : null}

        {confirmationKeys.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Confirmations</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              {confirmationKeys.includes('member_profile') ? (
                <section className="grid gap-2" aria-label="Member profile confirmation">
                  <h3>Member profile</h3>
                  <Card>
                    <CardContent className="grid gap-2">
                      <p>
                        {(personFirstName ?? '').trim()} {(personLastName ?? '').trim()}
                      </p>
                      <p>{(personEmail ?? '').trim()}</p>
                      <ul>
                        {(phonesQuery.data ?? []).map((ph) => (
                          <li key={ph.id}>
                            {ph.phone_number}
                            {ph.phone_type_id != null ? ` (type ${ph.phone_type_id})` : ''}
                          </li>
                        ))}
                      </ul>
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
                  {medicalQuery.data ? (
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
                  <ul>
                    {(contactsQuery.data ?? []).map((c) => (
                      <li key={c.contact_id}>
                        {c.first_name} {c.last_name} — {c.contact_type_name}
                      </li>
                    ))}
                  </ul>
                  {(contactsQuery.data ?? []).length === 0 ? <p>No additional contacts on file.</p> : null}
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
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Form fields</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {isDraftHydrating ? (
              <section className="grid place-items-center py-4" aria-busy="true">
                <LoadingSpinner label="Loading draft…" />
              </section>
            ) : null}

            {fieldMetas.length === 0 ? <p>This form has no fields yet.</p> : null}

            {fieldMetas.map((meta) => (
              <Fragment key={meta.id}>
                {resolveFieldRenderer(registry, meta, {
                  control: form.control,
                  name: meta.id,
                })}
              </Fragment>
            ))}

            {saveDraftError ? (
              <Alert variant="destructive">
                <AlertTitle>Draft save</AlertTitle>
                <AlertDescription>{saveDraftError}</AlertDescription>
              </Alert>
            ) : null}

            <output aria-live="polite" className="grid min-h-0">
              {isSavingDraft && !saveDraftError ? (
                <LoadingSpinner label="Saving draft…" />
              ) : null}
            </output>

            <fieldset className="text-right">
              <Button type="button" variant="secondary" disabled>
                Submit
              </Button>
            </fieldset>
            <p>Submission is not available in this release (PR16).</p>
          </CardContent>
        </Card>
      </section>
    </FormProvider>
  );
}
