import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { AccessDenied, PagePermissionGuard, useSecureSupabase } from '@solvera/pace-core/rbac';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProxyModeBanner } from '@/shared/components/ProxyModeBanner';
import { useProxyMode } from '@/shared/hooks/useProxyMode';
import { fetchCurrentPersonMember, NO_PERSON_PROFILE_ERROR_CODE } from '@/shared/lib/utils/userUtils';
import { useFormBySlug, type FormBySlugReady } from '@/hooks/events/useFormBySlug';
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

function dynamicValuesForDraft(values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(values)) {
    if (k === 'confirmations') continue;
    out[k] = values[k];
  }
  return out;
}

type EventFormFillReadyProps = {
  ready: FormBySlugReady;
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
};

function EventFormFillReady({
  ready,
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
}: EventFormFillReadyProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submissionContext = useMemo(
    () => ({
      actingUserId: userId,
      applicantPersonId: effectivePersonId,
      organisationId,
      eventId: ready.event.event_id,
      formId: ready.form.id,
      fieldRows: ready.fieldRows,
    }),
    [userId, effectivePersonId, organisationId, ready.event.event_id, ready.form.id, ready.fieldRows]
  );

  const submission = useApplicationSubmission(submissionContext);

  const onSubmitForm = useCallback(
    async (values: Record<string, unknown>) => {
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
    [draft, submission, toast, navigate, proxyActive]
  );

  return (
    <FormRenderer
      eventTitle={ready.event.event_name}
      formTitle={ready.form.title ?? ready.form.name}
      formDescription={ready.form.description ?? null}
      fieldMetas={fieldMetas}
      confirmationKeys={ready.confirmationKeys}
      personId={effectivePersonId}
      memberId={memberId}
      personFirstName={displayPerson?.first_name ?? null}
      personLastName={displayPerson?.last_name ?? null}
      personEmail={displayPerson?.email ?? null}
      fieldDefaults={fieldDefaults}
      draftValues={draft.valueByFieldId}
      prefillWarning={prefillWarning}
      isDraftHydrating={draft.isHydrating || fieldDataLoading}
      draftHydrateError={draft.hydrateError}
      scheduleSaveDraft={draft.scheduleSaveDraft}
      isSavingDraft={draft.isSavingDraft}
      saveDraftError={draft.saveDraftError}
      onSubmitForm={onSubmitForm}
      isSubmitting={submission.isSubmitting}
      submitError={submitError}
    />
  );
}

export interface FormFillPageProps {
  eventSlug: string;
  /** `null` when opened via `/:eventSlug/application` (primary entrypoint). */
  formSlug: string | null;
}

/**
 * Authenticated event form fill (PR15): profile gate, dynamic fields, confirmations, draft autosave.
 *
 * Participant route (with {@link EventHubPage}): reuses {@link PagePermissionGuard} `pageName="dashboard"`
 * until `rbac_app_pages` includes a dedicated participant form row; access is also enforced by
 * `ProtectedRoute`, organisation context, and form visibility checks in {@link useFormBySlug}.
 */
/* eslint-disable complexity -- PR15 shell: auth, proxy, profile gate, form load, and renderer handoff are intentionally sequential. */
export function FormFillPage({ eventSlug, formSlug }: FormFillPageProps) {
  const { isAuthenticated, user } = useUnifiedAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const org = useOrganisationsContextOptional();
  const organisationId = org?.selectedOrganisation?.id ?? null;
  const secure = useSecureSupabase();
  const proxy = useProxyMode();

  useEffect(() => {
    if (isAuthenticated) return;
    if (location.pathname.startsWith('/login')) return;
    const returnTo = `${location.pathname}${location.search}`;
    navigate(`/login?redirect=${encodeURIComponent(returnTo)}`, { replace: true });
  }, [isAuthenticated, location.pathname, location.search, navigate]);

  const formLoad = useFormBySlug(eventSlug, formSlug);

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

  const fieldRows = formLoad.data?.fieldRows ?? [];

  const fieldData = useFormFieldData(
    effectivePersonId,
    organisationId,
    formLoad.data?.event.event_id ?? null,
    fieldRows
  );

  const draft = useDraftApplication(
    effectivePersonId,
    organisationId,
    formLoad.data?.event.event_id ?? null,
    formLoad.data?.form.id ?? null,
    fieldRows
  );

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
        <h1>Event form</h1>
        <p>Redirecting to sign in…</p>
      </main>
    );
  }

  return (
    <PagePermissionGuard
      pageName="dashboard"
      operation="read"
      loading={
        <main className="grid min-h-[40vh] place-items-center px-4" aria-busy="true">
          <LoadingSpinner label="Checking access…" />
        </main>
      }
      fallback={<AccessDenied />}
    >
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
          const qs =
            formSlug != null && formSlug.trim() !== ''
              ? `?eventSlug=${encodeURIComponent(eventSlug)}&formSlug=${encodeURIComponent(formSlug.trim())}`
              : `?eventSlug=${encodeURIComponent(eventSlug)}`;
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

        if (formLoad.reservedSlug) {
          return <NotFoundPage />;
        }

        if (formLoad.isLoading) {
          return (
            <main className="grid min-h-[40vh] place-items-center px-4" aria-busy="true">
              <LoadingSpinner label="Loading form…" />
            </main>
          );
        }

        if (formLoad.error) {
          if (formLoad.notFound) {
            return <NotFoundPage />;
          }
          const msg = formLoad.error.message ?? 'Could not load this form.';
          return (
            <main className="mx-auto grid max-w-(--app-width) gap-4 p-4">
              <Alert variant="destructive">
                <AlertTitle>Form unavailable</AlertTitle>
                <AlertDescription>{msg}</AlertDescription>
              </Alert>
              <Button type="button" variant="secondary" onClick={() => navigate(`/${encodeURIComponent(eventSlug)}`)}>
                Back to event
              </Button>
            </main>
          );
        }

        if (!formLoad.data) {
          return <NotFoundPage />;
        }

        const ready = formLoad.data;

        if (fieldData.fetchErrorMessage) {
          return (
            <main className="mx-auto grid max-w-(--app-width) gap-4 p-4">
              {proxy.isProxyActive ? <ProxyModeBanner /> : null}
              <Alert variant="destructive">
                <AlertTitle>Field data</AlertTitle>
                <AlertDescription>{fieldData.fetchErrorMessage}</AlertDescription>
              </Alert>
              <Button type="button" variant="secondary" onClick={() => navigate(`/${encodeURIComponent(eventSlug)}`)}>
                Back to event
              </Button>
            </main>
          );
        }

        return (
          <main className="mx-auto grid max-w-(--app-width) gap-4 p-4">
            {proxy.isProxyActive ? <ProxyModeBanner /> : null}
            {fieldData.isLoading ? <LoadingSpinner label="Loading field defaults…" /> : null}
            <EventFormFillReady
              ready={ready}
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
            />
          </main>
        );
      })()}
    </PagePermissionGuard>
  );
}
