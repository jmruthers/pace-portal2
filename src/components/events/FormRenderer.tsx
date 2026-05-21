import { Fragment, useMemo, type ReactNode } from 'react';
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
  Form,
  LoadingSpinner,
} from '@solvera/pace-core/components';
import { resolveFieldRenderer, type FormFieldMeta } from '@solvera/pace-core/forms';
import { FormRendererConfirmations } from '@/components/events/FormRendererConfirmations';
import { buildConfirmationZodSchema } from '@/shared/lib/formFieldMeta';
import { computeFormRendererDefaultValues } from '@/lib/formRendererDefaultValues';
import { useFormRendererDraftSync } from '@/hooks/events/useFormRendererDraftSync';
import {
  composeDynamicFormSchema,
  createEventFormFieldRegistry,
  type EventFormRegistry,
} from '@/shared/lib/formFieldRegistry';

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
  /** When true, suppresses autosave, disables fields, and hides submit (PR17 view-submitted). */
  readOnly?: boolean;
  /** Placed immediately after the read-only submitted banner when `readOnly` (PR18 application progress deep link). */
  participantProgressAction?: ReactNode;
};

type FormRendererBodyProps = FormRendererProps & {
  form: UseFormReturn<Record<string, unknown>>;
  registry: EventFormRegistry;
};

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
  readOnly = false,
  participantProgressAction,
  form,
  registry,
}: FormRendererBodyProps) {
  useFormRendererDraftSync({
    form,
    fieldMetas,
    fieldDefaults,
    draftValues,
    confirmationKeys,
    readOnly,
    isDraftHydrating,
    draftHydrateError,
    scheduleSaveDraft,
  });

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

      {hasDraftRestore && !readOnly ? (
        <Alert variant="default">
          <AlertTitle>Resuming your application</AlertTitle>
          <AlertDescription>Your saved answers for this form have been restored.</AlertDescription>
        </Alert>
      ) : null}

      {readOnly ? (
        <Alert variant="default">
          <AlertTitle>Submitted</AlertTitle>
          <AlertDescription>This application was submitted. You can review your answers below.</AlertDescription>
        </Alert>
      ) : null}

      {readOnly && participantProgressAction ? participantProgressAction : null}

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

      {readOnly && confirmationKeys.length > 0 ? (
        <Alert variant="default">
          <AlertTitle>Confirmations</AlertTitle>
          <AlertDescription>
            Pre-submission requirements you acknowledged are on record. Review your answers below.
          </AlertDescription>
        </Alert>
      ) : null}

      {!readOnly && confirmationKeys.length > 0 ? (
        <FormRendererConfirmations
          confirmationKeys={confirmationKeys}
          personId={personId}
          memberId={memberId}
          personFirstName={personFirstName}
          personLastName={personLastName}
          personEmail={personEmail}
          form={form}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Form fields</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <fieldset disabled={readOnly} className="min-w-0 border-0 p-0 m-0 grid gap-4">
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

          </fieldset>

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
        {!readOnly ? (
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
        ) : null}
      </Card>
    </>
  );
}

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
      computeFormRendererDefaultValues(
        props.fieldMetas,
        props.fieldDefaults,
        props.draftValues,
        props.confirmationKeys,
        Boolean(props.readOnly)
      ),
    [props.fieldMetas, props.fieldDefaults, props.draftValues, props.confirmationKeys, props.readOnly]
  );

  if (draftHydrateError && !props.readOnly) {
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
        if (props.readOnly) return;
        void onSubmitForm(data as Record<string, unknown>);
      }}
    >
      {(form) => <FormRendererBody {...props} form={form} registry={registry} />}
    </Form>
  );
}
