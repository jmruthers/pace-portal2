import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { useFormBySlug } from '@/hooks/events/useFormBySlug';
import { useFormFieldData } from '@/hooks/events/useFormFieldData';
import { useDraftApplication } from '@/hooks/events/useDraftApplication';
import { useFormFillTargetPerson } from '@/hooks/events/useFormFillTargetPerson';
import { FormRenderer } from '@/components/events/FormRenderer';

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
            <FormRenderer
              eventTitle={ready.event.event_name}
              formTitle={ready.form.title ?? ready.form.name}
              formDescription={ready.form.description ?? null}
              fieldMetas={fieldData.fieldMetas}
              confirmationKeys={ready.confirmationKeys}
              personId={effectivePersonId}
              memberId={memberId}
              personFirstName={displayPerson?.first_name ?? null}
              personLastName={displayPerson?.last_name ?? null}
              personEmail={displayPerson?.email ?? null}
              fieldDefaults={fieldData.fieldDefaults}
              draftValues={draft.valueByFieldId}
              prefillWarning={fieldData.prefillWarning}
              isDraftHydrating={draft.isHydrating || fieldData.isLoading}
              draftHydrateError={draft.hydrateError}
              scheduleSaveDraft={draft.scheduleSaveDraft}
              isSavingDraft={draft.isSavingDraft}
              saveDraftError={draft.saveDraftError}
            />
          </main>
        );
      })()}
    </PagePermissionGuard>
  );
}
