import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@solvera/pace-core/hooks';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { useOrganisationsContextOptional } from '@solvera/pace-core/providers';
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
  LoadingSpinner,
} from '@solvera/pace-core/components';
import { isOk } from '@solvera/pace-core/types';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProxyModeBanner } from '@/shared/components/ProxyModeBanner';
import { useProxyMode } from '@/shared/hooks/useProxyMode';
import { fetchCurrentPersonMember, NO_PERSON_PROFILE_ERROR_CODE } from '@/shared/lib/utils/userUtils';
import { useFormFieldData } from '@/hooks/events/useFormFieldData';
import { useDraftApplication } from '@/hooks/events/useDraftApplication';
import {
  mapSubmissionErrorToToast,
  useApplicationSubmission,
} from '@/hooks/events/useApplicationSubmission';
import { useFormFillTargetPerson } from '@/hooks/events/useFormFillTargetPerson';
import type { EventSubmissionErrorCode } from '@/lib/eventApplicationSubmission';
import type { FormFieldMeta } from '@solvera/pace-core/forms';
import { FormRenderer } from '@/components/events/FormRenderer';
import type { FormEntrypoint } from '@/lib/formEntrypointResolution';
import { useFormEntrypoint, type FormJourneyReady } from '@/hooks/forms/useFormEntrypoint';
import { useFormJourney, type FormJourneyPhase } from '@/hooks/forms/useFormJourney';
import { resolveSubmitMode } from '@/lib/formSubmitAdapters';
import { ParticipantProgressActionSlot } from '@/components/form-journey/ParticipantProgressNav';
import type { SubmittedRegistrationSnapshot } from '@/lib/fetchSubmittedRegistrationSnapshot';
import type { CoreFormFieldRow } from '@/shared/lib/formFieldMeta';
import type { Database } from '@/types/pace-database';

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

function FormJourneyFillReady({
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

/* eslint-disable complexity -- PR17 shell: auth, journey phases, gates, and renderer handoff are sequential. */
export function FormJourneyShell({ entrypoint, renderExtension }: FormJourneyShellProps) {
  const extension = renderExtension?.();

  const { isAuthenticated, user } = useUnifiedAuthContext();
  const navigate = useNavigate();
  const org = useOrganisationsContextOptional();
  const organisationId = org?.selectedOrganisation?.id ?? null;
  const secure = useSecureSupabase();
  const proxy = useProxyMode();
  const [userStartedFilling, setUserStartedFilling] = useState(false);

  const entry = useFormEntrypoint(entrypoint);
  const ready = entry.data;

  const ctxRows = ready ? readyToContext(ready).fieldRows : [];
  const ctxEventId = ready && ready.kind === 'event' ? ready.event.event_id : null;
  const ctxFormId = ready?.form.id ?? null;

  const personQuery = useQuery({
    queryKey: ['formFillPersonMember', 'v1', user?.id, organisationId],
    enabled: Boolean(isAuthenticated && user?.id && organisationId),
    staleTime: 15_000,
    queryFn: async () => fetchCurrentPersonMember(secure, user!.id!, organisationId!),
  });

  const pm = personQuery.data;
  const selfPerson = pm && isOk(pm) ? pm.data.person : null;
  const selfMember = pm && isOk(pm) ? pm.data.member : null;

  const effectivePersonId =
    proxy.isProxyActive && proxy.targetPersonId ? proxy.targetPersonId : selfPerson?.id ?? null;

  const targetPersonQuery = useFormFillTargetPerson(proxy, effectivePersonId);

  const memberId =
    proxy.isProxyActive && proxy.targetMemberId ? proxy.targetMemberId : selfMember?.id ?? null;

  const fieldData = useFormFieldData(effectivePersonId, organisationId, ctxEventId, ctxRows);

  const draft = useDraftApplication(
    effectivePersonId,
    organisationId,
    ctxEventId,
    ctxFormId,
    ctxRows
  );

  const journey = useFormJourney({
    entry,
    ready,
    draft,
    effectivePersonId,
    userStartedFilling,
  });

  const displayPerson =
    proxy.isProxyActive && targetPersonQuery.data
      ? targetPersonQuery.data
      : selfPerson
        ? {
            first_name: selfPerson.first_name,
            last_name: selfPerson.last_name,
            email: selfPerson.email,
          }
        : null;

  if (!isAuthenticated) {
    return (
      <main className="mx-auto grid max-w-(--app-width) gap-4 p-4" aria-busy="true">
        <h1>Form</h1>
        <p>Redirecting to sign in…</p>
      </main>
    );
  }

  return (
    <>
      {(() => {
        if (!organisationId) {
          return (
            <main className="grid gap-4 px-4">
              <Alert variant="destructive">
                <AlertTitle>Organisation required</AlertTitle>
                <AlertDescription>Select an organisation before opening this form.</AlertDescription>
              </Alert>
            </main>
          );
        }

        if (proxy.isValidating) {
          return (
            <main className="grid min-h-[40vh] place-items-center px-4" aria-busy="true">
              <LoadingSpinner label="Checking delegated access…" />
            </main>
          );
        }

        if (personQuery.isLoading) {
          return (
            <main className="grid min-h-[40vh] place-items-center px-4" aria-busy="true">
              <LoadingSpinner label="Loading profile…" />
            </main>
          );
        }

        if (personQuery.isError) {
          return (
            <main className="grid gap-4 px-4">
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>Could not load member context.</AlertDescription>
              </Alert>
            </main>
          );
        }

        if (
          !proxy.isProxyActive &&
          pm &&
          !isOk(pm) &&
          pm.error.code === NO_PERSON_PROFILE_ERROR_CODE
        ) {
          const ev = entry.routeEventSlug;
          const fs = entry.routeFormSlug;
          const qs =
            ev != null && fs != null && fs.trim() !== ''
              ? `?eventSlug=${encodeURIComponent(ev)}&formSlug=${encodeURIComponent(fs.trim())}`
              : ev != null
                ? `?eventSlug=${encodeURIComponent(ev)}`
                : '';
          return (
            <main className="mx-auto grid max-w-(--app-width) gap-4 p-4">
              <h1>Profile required</h1>
              <Card>
                <CardHeader>
                  <CardTitle>Complete your profile</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>You need a member profile in this organisation before you can complete this form.</p>
                </CardContent>
                <CardFooter className="text-right">
                  <Button type="button" variant="default" onClick={() => navigate(`/profile-complete${qs}`)}>
                    Start setup
                  </Button>
                </CardFooter>
              </Card>
            </main>
          );
        }

        if (
          !effectivePersonId ||
          (!proxy.isProxyActive && !selfPerson) ||
          (proxy.isProxyActive && targetPersonQuery.isLoading)
        ) {
          return (
            <main className="grid min-h-[40vh] place-items-center px-4" aria-busy="true">
              <LoadingSpinner label="Loading member…" />
            </main>
          );
        }

        if (proxy.isProxyActive && targetPersonQuery.isError) {
          return (
            <main className="grid gap-4 px-4">
              <Alert variant="destructive">
                <AlertTitle>Delegated profile</AlertTitle>
                <AlertDescription>Could not load the target member profile.</AlertDescription>
              </Alert>
            </main>
          );
        }

        if (entry.reservedSlug) {
          return <NotFoundPage />;
        }

        if (entry.isLoading) {
          return (
            <main className="grid min-h-[40vh] place-items-center px-4" aria-busy="true">
              <LoadingSpinner label="Loading form…" />
            </main>
          );
        }

        if (entry.error) {
          if (entry.notFound) {
            return <NotFoundPage />;
          }
          const msg = entry.error.message ?? 'Could not load this form.';
          const backTarget =
            entrypoint.kind !== 'org_form' && entry.routeEventSlug
              ? `/${encodeURIComponent(entry.routeEventSlug)}`
              : '/';
          return (
            <main className="mx-auto grid max-w-(--app-width) gap-4 p-4">
              <Alert variant="destructive">
                <AlertTitle>Form unavailable</AlertTitle>
                <AlertDescription>{msg}</AlertDescription>
              </Alert>
              <Button type="button" variant="secondary" onClick={() => navigate(backTarget)}>
                {entrypoint.kind === 'org_form' ? 'Back to home' : 'Back to event'}
              </Button>
            </main>
          );
        }

        if (!ready) {
          return <NotFoundPage />;
        }

        if (journey.phase === 'loading') {
          return (
            <main className="grid min-h-[40vh] place-items-center px-4" aria-busy="true">
              <LoadingSpinner label="Loading form…" />
            </main>
          );
        }

        if (fieldData.fetchErrorMessage) {
          const backTarget =
            entrypoint.kind !== 'org_form' && entry.routeEventSlug
              ? `/${encodeURIComponent(entry.routeEventSlug)}`
              : '/';
          return (
            <main className="mx-auto grid max-w-(--app-width) gap-4 p-4">
              {proxy.isProxyActive ? <ProxyModeBanner /> : null}
              <Alert variant="destructive">
                <AlertTitle>Field data</AlertTitle>
                <AlertDescription>{fieldData.fetchErrorMessage}</AlertDescription>
              </Alert>
              <Button type="button" variant="secondary" onClick={() => navigate(backTarget)}>
                {entrypoint.kind === 'org_form' ? 'Back to home' : 'Back to event'}
              </Button>
            </main>
          );
        }

        return (
          <main className="mx-auto grid max-w-(--app-width) gap-4 p-4">
            {proxy.isProxyActive ? <ProxyModeBanner /> : null}
            {extension}
            {fieldData.isLoading && journey.phase !== 'intro' ? (
              <LoadingSpinner label="Loading field defaults…" />
            ) : null}
            <FormJourneyFillReady
              entrypoint={entrypoint}
              ready={ready}
              phase={journey.phase}
              submittedSnapshot={journey.submittedSnapshot}
              userId={user!.id}
              organisationId={organisationId!}
              effectivePersonId={effectivePersonId}
              memberId={memberId}
              displayPerson={
                displayPerson
                  ? {
                      first_name: displayPerson.first_name,
                      last_name: displayPerson.last_name,
                      email: displayPerson.email,
                    }
                  : null
              }
              proxyActive={proxy.isProxyActive}
              fieldMetas={fieldData.fieldMetas}
              fieldDefaults={fieldData.fieldDefaults}
              prefillWarning={fieldData.prefillWarning}
              fieldDataLoading={fieldData.isLoading}
              draft={draft}
              onStart={() => setUserStartedFilling(true)}
            />
          </main>
        );
      })()}
    </>
  );
}
