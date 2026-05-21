import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@solvera/pace-core/hooks';
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
} from '@solvera/pace-core/components';
import { isOk } from '@solvera/pace-core/types';
import type { FormFieldMeta } from '@solvera/pace-core/forms';
import { FormRenderer } from '@/components/events/FormRenderer';
import type { FormEntrypoint } from '@/lib/formEntrypointResolution';
import type { FormJourneyReady } from '@/hooks/forms/useFormEntrypoint';
import type { FormJourneyPhase } from '@/hooks/forms/useFormJourney';
import {
  mapSubmissionErrorToToast,
  useApplicationSubmission,
} from '@/hooks/events/useApplicationSubmission';
import type { EventSubmissionErrorCode } from '@/lib/eventApplicationSubmission';
import { resolveSubmitMode } from '@/lib/formSubmitAdapters';
import { ParticipantProgressActionSlot } from '@/components/form-journey/ParticipantProgressNav';
import type { SubmittedRegistrationSnapshot } from '@/lib/fetchSubmittedRegistrationSnapshot';
import type { CoreFormFieldRow } from '@/shared/lib/formFieldMeta';
import type { Database } from '@/types/pace-database';
import { useFormJourneyShellSetup } from '@/hooks/forms/useFormJourneyShellSetup';
import { FormJourneyShellBody } from '@/components/form-journey/FormJourneyShellBody';
import type { useDraftApplication } from '@/hooks/events/useDraftApplication';

type CoreFormRow = Database['public']['Tables']['core_forms']['Row'];

function dynamicValuesForDraft(values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(values)) {
    if (k === 'confirmations') continue;
    out[k] = values[k];
  }
  return out;
}

function readyToContext(ready: FormJourneyReady): {
  eventTitle: string;
  eventId: string | null;
  form: CoreFormRow;
  fieldRows: CoreFormFieldRow[];
  confirmationKeys: string[];
} {
  if (ready.kind === 'event') {
    return {
      eventTitle: ready.event.event_name,
      eventId: ready.event.event_id,
      form: ready.form,
      fieldRows: ready.fieldRows,
      confirmationKeys: ready.confirmationKeys,
    };
  }
  return {
    eventTitle: ready.shellTitle,
    eventId: null,
    form: ready.form,
    fieldRows: ready.fieldRows,
    confirmationKeys: ready.confirmationKeys,
  };
}

type JourneyFillProps = {
  entrypoint: FormEntrypoint;
  ready: FormJourneyReady;
  phase: FormJourneyPhase;
  submittedSnapshot: SubmittedRegistrationSnapshot | null;
  userId: string;
  organisationId: string;
  effectivePersonId: string;
  memberId: string | null;
  displayPerson: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
  proxyActive: boolean;
  fieldMetas: FormFieldMeta[];
  fieldDefaults: Record<string, unknown>;
  prefillWarning: string | null;
  fieldDataLoading: boolean;
  draft: ReturnType<typeof useDraftApplication>;
  onStart: () => void;
};

export function FormJourneyFillReady({
  entrypoint,
  ready,
  phase,
  submittedSnapshot,
  userId,
  organisationId,
  effectivePersonId,
  memberId,
  displayPerson,
  proxyActive,
  fieldMetas,
  fieldDefaults,
  prefillWarning,
  fieldDataLoading,
  draft,
  onStart,
}: JourneyFillProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const ctx = useMemo(() => readyToContext(ready), [ready]);
  const submitMode = useMemo(
    () => resolveSubmitMode(ctx.form.workflow_type ?? '', entrypoint),
    [ctx.form.workflow_type, entrypoint]
  );

  const submissionContext = useMemo(
    () => ({
      actingUserId: userId,
      applicantPersonId: effectivePersonId,
      organisationId,
      eventId: ctx.eventId!,
      formId: ctx.form.id,
      fieldRows: ctx.fieldRows,
    }),
    [userId, effectivePersonId, organisationId, ctx.eventId, ctx.form.id, ctx.fieldRows]
  );

  const submission = useApplicationSubmission(
    submitMode.mode === 'event_registration' && ctx.eventId != null ? submissionContext : null
  );

  const onSubmitForm = useCallback(
    async (values: Record<string, unknown>) => {
      if (submitMode.mode !== 'event_registration' || ctx.eventId == null) {
        return;
      }
      setSubmitError(null);
      try {
        await draft.saveDraftNow(dynamicValuesForDraft(values));
      } catch (e) {
        const desc =
          e instanceof Error ? e.message : 'Could not save your latest answers before submitting.';
        setSubmitError(desc);
        toast({
          title: 'Draft save',
          description: desc,
          variant: 'destructive',
        });
        return;
      }
      const result = await submission.submit(values);
      if (isOk(result)) {
        toast({
          title: 'Application submitted',
          description: proxyActive
            ? 'The application was submitted for the member you are assisting.'
            : 'Your application was submitted successfully.',
        });
        navigate('/');
      } else {
        const msg = mapSubmissionErrorToToast(
          result.error.code as EventSubmissionErrorCode,
          result.error.message ?? ''
        );
        setSubmitError(msg.description);
        toast({
          title: msg.title,
          description: msg.description,
          variant: msg.variant,
        });
      }
    },
    [ctx.eventId, draft, navigate, proxyActive, submission, submitMode.mode, toast]
  );

  const readOnly = phase === 'view_submitted';
  const draftValuesForRenderer =
    readOnly && submittedSnapshot ? submittedSnapshot.valueByFieldId : draft.valueByFieldId;

  const draftHydrateForRenderer = readOnly ? null : draft.hydrateError;
  const scheduleNoop = useCallback(() => {}, []);

  if (phase === 'intro') {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle>{ctx.form.title ?? ctx.form.name}</CardTitle>
          </CardHeader>
          <CardContent>
            {ctx.form.description ? (
              <p>{ctx.form.description}</p>
            ) : (
              <p>You are about to start this form.</p>
            )}
          </CardContent>
          <CardFooter className="text-right">
            <Button type="button" variant="default" onClick={onStart}>
              Start
            </Button>
          </CardFooter>
        </Card>
        {submitMode.mode === 'none' && entrypoint.kind === 'org_form' ? (
          <Alert variant="default">
            <AlertTitle>Submit</AlertTitle>
            <AlertDescription>{submitMode.reason}</AlertDescription>
          </Alert>
        ) : null}
      </>
    );
  }

  return (
    <>
      {submitMode.mode === 'none' && phase === 'filling' ? (
        <Alert variant="default">
          <AlertTitle>Submit</AlertTitle>
          <AlertDescription>{submitMode.reason}</AlertDescription>
        </Alert>
      ) : null}
      <FormRenderer
        eventTitle={ctx.eventTitle}
        formTitle={ctx.form.title ?? ctx.form.name}
        formDescription={ctx.form.description ?? null}
        fieldMetas={fieldMetas}
        confirmationKeys={ctx.confirmationKeys}
        personId={effectivePersonId}
        memberId={memberId}
        personFirstName={displayPerson?.first_name ?? null}
        personLastName={displayPerson?.last_name ?? null}
        personEmail={displayPerson?.email ?? null}
        fieldDefaults={fieldDefaults}
        draftValues={draftValuesForRenderer}
        prefillWarning={prefillWarning}
        isDraftHydrating={readOnly ? false : draft.isHydrating || fieldDataLoading}
        draftHydrateError={draftHydrateForRenderer}
        scheduleSaveDraft={readOnly ? scheduleNoop : draft.scheduleSaveDraft}
        isSavingDraft={readOnly ? false : draft.isSavingDraft}
        saveDraftError={readOnly ? null : draft.saveDraftError}
        onSubmitForm={readOnly ? () => {} : onSubmitForm}
        isSubmitting={readOnly ? false : submission.isSubmitting}
        submitError={readOnly ? null : submitError}
        readOnly={readOnly}
        participantProgressAction={
          <ParticipantProgressActionSlot
            entrypoint={entrypoint}
            phase={phase}
            submittedSnapshot={submittedSnapshot}
            proxyActive={proxyActive}
            onNavigate={navigate}
          />
        }
      />
    </>
  );
}

export type FormJourneyShellProps = {
  entrypoint: FormEntrypoint;
  /** PR17 extension slot for workflow-specific chrome (optional). */
  renderExtension?: () => ReactNode;
};

export function FormJourneyShell({ entrypoint, renderExtension }: FormJourneyShellProps) {
  const extension = renderExtension?.();
  const setup = useFormJourneyShellSetup(entrypoint);

  if (!setup.isAuthenticated) {
    return (
      <main className="mx-auto grid max-w-(--app-width) gap-4 p-4" aria-busy="true">
        <h1>Form</h1>
        <p>Redirecting to sign in…</p>
      </main>
    );
  }

  return <FormJourneyShellBody entrypoint={entrypoint} extension={extension} setup={setup} />;
}
