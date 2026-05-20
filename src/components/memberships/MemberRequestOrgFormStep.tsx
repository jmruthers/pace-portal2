import { useMemo } from 'react';
import { Button, LoadingSpinner } from '@solvera/pace-core/components';
import { FormRenderer } from '@/components/events/FormRenderer';
import { useFormFieldData } from '@/hooks/events/useFormFieldData';
import type { OrgSignupFormReady } from '@/lib/memberRequestTypes';

export type MemberRequestOrgFormStepProps = {
  organisationId: string;
  organisationName: string;
  personId: string | null;
  memberId: string | null;
  personFirstName: string | null;
  personLastName: string | null;
  personEmail: string | null;
  orgSignupForm: OrgSignupFormReady | null;
  submitPending: boolean;
  submitError: string | null;
  preSubmitError: string | null;
  onSubmit: (values: Record<string, unknown>) => void;
};

/** PR22 — Org signup form step via shared FormRenderer. */
export function MemberRequestOrgFormStep(props: MemberRequestOrgFormStepProps) {
  const {
    organisationId,
    organisationName,
    personId,
    memberId,
    personFirstName,
    personLastName,
    personEmail,
    orgSignupForm,
    submitPending,
    submitError,
    preSubmitError,
    onSubmit,
  } = props;

  const fieldRows = orgSignupForm?.fieldRows ?? [];
  const { fieldMetas, fieldDefaults, prefillWarning, isLoading, fetchErrorMessage } =
    useFormFieldData(personId, organisationId, null, fieldRows);

  const noopSave = useMemo(() => () => undefined, []);

  if (orgSignupForm == null || fieldRows.length === 0) {
    return (
      <section className="grid gap-4" aria-label="Review request">
        <h2>Review and submit</h2>
        <p>
          You are requesting to join <strong>{organisationName}</strong>. No additional form fields
          are required.
        </p>
        {preSubmitError ? (
          <p role="alert">{preSubmitError}</p>
        ) : null}
        {submitError ? (
          <p role="alert">{submitError}</p>
        ) : null}
        <fieldset className="text-right">
          <Button type="button" disabled={submitPending} onClick={() => onSubmit({})}>
            {submitPending ? 'Submitting…' : 'Submit'}
          </Button>
        </fieldset>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="grid place-items-center gap-4 py-8" aria-busy="true">
        <LoadingSpinner label="Loading form…" />
      </section>
    );
  }

  return (
    <section className="grid gap-4" aria-label="Organisation signup form">
      {fetchErrorMessage ? (
        <p role="alert">{fetchErrorMessage}</p>
      ) : null}
      {preSubmitError ? (
        <p role="alert">{preSubmitError}</p>
      ) : null}
      <FormRenderer
        eventTitle="My memberships"
        formTitle={orgSignupForm.formTitle}
        formDescription={orgSignupForm.formDescription}
        fieldMetas={fieldMetas}
        confirmationKeys={orgSignupForm.confirmationKeys}
        personId={personId}
        memberId={memberId}
        personFirstName={personFirstName}
        personLastName={personLastName}
        personEmail={personEmail}
        fieldDefaults={fieldDefaults}
        draftValues={{}}
        prefillWarning={prefillWarning}
        isDraftHydrating={false}
        draftHydrateError={null}
        scheduleSaveDraft={noopSave}
        isSavingDraft={false}
        saveDraftError={null}
        onSubmitForm={onSubmit}
        isSubmitting={submitPending}
        submitError={submitError}
      />
    </section>
  );
}
