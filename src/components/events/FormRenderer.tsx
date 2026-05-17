import { Fragment, useEffect, useMemo, useRef } from 'react';
import type { UseFormReturn } from '@solvera/pace-core/forms';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Form,
  Label,
  LoadingSpinner,
} from '@solvera/pace-core/components';
import { Controller, resolveFieldRenderer, type FormFieldMeta } from '@solvera/pace-core/forms';
import {
  buildConfirmationZodSchema,
  composeDynamicFormSchema,
  createEventFormFieldRegistry,
} from '@/shared/lib/formFieldMeta';
import { usePhoneNumbers } from '@/hooks/auth/usePhoneNumbers';
import { useMedicalProfileData } from '@/hooks/medical-profile/useMedicalProfileData';
import { useFormAdditionalContactsPreview } from '@/hooks/events/useFormAdditionalContactsPreview';
import { MedicalProfileDisplay } from '@/components/medical-profile/MedicalProfile/MedicalProfileDisplay';
import type { EventFormRegistry } from '@/shared/lib/formFieldMeta';

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
  /** PR16 final submit */
  onSubmitForm: (values: Record<string, unknown>) => void | Promise<void>;
  isSubmitting: boolean;
  submitError: string | null;
};

type FormRendererBodyProps = FormRendererProps & {
  form: UseFormReturn<Record<string, unknown>>;
  registry: EventFormRegistry;
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

/* eslint-disable complexity -- PR15/16 shell: confirmations, draft autosave, and dynamic fields share one form contract. */
function FormRendererBody({
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
  isSubmitting,
  submitError,
  form,
  registry,
}: FormRendererBodyProps) {
  /** Blocks one `watch` emission after programmatic `reset` (draft/field hydrate) so autosave cannot echo defaults. */
  const skipDraftPersistenceRef = useRef(false);

  useEffect(() => {
    if (isDraftHydrating) return;
    skipDraftPersistenceRef.current = true;
    form.reset(buildDefaultValues(fieldMetas, fieldDefaults, draftValues, confirmationKeys));
    const t = window.setTimeout(() => {
      skipDraftPersistenceRef.current = false;
    }, 0);
    return () => {
      window.clearTimeout(t);
      skipDraftPersistenceRef.current = false;
    };
  }, [isDraftHydrating, fieldMetas, fieldDefaults, draftValues, confirmationKeys, form]);

  useEffect(() => {
    const subscription = form.watch((value) => {
      if (skipDraftPersistenceRef.current) return;
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

  return (
    <>
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

          {submitError ? (
            <Alert variant="destructive">
              <AlertTitle>Submit</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          ) : null}

          <output aria-live="polite" className="grid min-h-0">
            {isSavingDraft && !saveDraftError ? <LoadingSpinner label="Saving draft…" /> : null}
          </output>
        </CardContent>
        <CardFooter className="text-right">
          <Button
            type="submit"
            variant="default"
            disabled={
              isDraftHydrating || Boolean(draftHydrateError) || isSavingDraft || isSubmitting
            }
          >
            {isSubmitting ? 'Submitting…' : 'Submit'}
          </Button>
        </CardFooter>
      </Card>
    </>
  );
}
/* eslint-enable complexity */

/**
 * PR15 dynamic event form: pace-core `Form` + CR20 registry, confirmation blocks in-schema; PR16 submit wired to the same RHF instance.
 */
export function FormRenderer(props: FormRendererProps) {
  const { onSubmitForm, draftHydrateError } = props;

  const registry = useMemo(() => createEventFormFieldRegistry(), []);
  const dynamicSchema = useMemo(
    () => composeDynamicFormSchema(registry, props.fieldMetas),
    [registry, props.fieldMetas]
  );
  const confirmationSchema = useMemo(
    () => buildConfirmationZodSchema(props.confirmationKeys),
    [props.confirmationKeys]
  );

  const fullSchema = useMemo(
    () => dynamicSchema.extend({ confirmations: confirmationSchema }),
    [dynamicSchema, confirmationSchema]
  );

  const defaultValues = useMemo(
    () =>
      buildDefaultValues(
        props.fieldMetas,
        props.fieldDefaults,
        props.draftValues,
        props.confirmationKeys
      ),
    [props.fieldMetas, props.fieldDefaults, props.draftValues, props.confirmationKeys]
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
    <Form
      className="grid max-w-(--app-width) gap-4"
      schema={fullSchema}
      defaultValues={defaultValues}
      mode="onSubmit"
      onSubmit={(data) => {
        void onSubmitForm(data as Record<string, unknown>);
      }}
    >
      {(form) => <FormRendererBody {...props} form={form} registry={registry} />}
    </Form>
  );
}
