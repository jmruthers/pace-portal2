import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProxyModeBanner } from '@/shared/components/ProxyModeBanner';
import { NO_PERSON_PROFILE_ERROR_CODE } from '@/shared/lib/utils/userUtils';
import { createEventId } from '@solvera/pace-core/types';
import { useFileReferences } from '@/hooks/events/useFileReferences';
import { buildEventFormPresentation } from '@/lib/eventFormDisplayContext';
import type { FormEntrypoint } from '@/lib/formEntrypointResolution';
import type { useFormJourneyShellSetup } from '@/hooks/forms/useFormJourneyShellSetup';
import { FormJourneyFillReady } from '@/components/form-journey/FormJourneyShell';

type Setup = ReturnType<typeof useFormJourneyShellSetup>;

export function FormJourneyShellBody({
  entrypoint,
  extension,
  setup,
}: {
  entrypoint: FormEntrypoint;
  extension: ReactNode;
  setup: Setup;
}) {
  const navigate = useNavigate();
  const {
    user,
    organisationId,
    writeOrganisationId,
    secureClient,
    proxy,
    entry,
    ready,
    personQuery,
    pm,
    selfPerson,
    targetPersonQuery,
    effectivePersonId,
    memberId,
    fieldData,
    draft,
    journey,
    displayPerson,
  } = setup;

  const eventLogoScopes =
    ready?.kind === 'event' &&
    typeof ready.event.organisation_id === 'string' &&
    ready.event.organisation_id.trim() !== ''
      ? [{ event_id: ready.event.event_id, organisation_id: ready.event.organisation_id }]
      : [];
  const { refByEventId, isLoading: logoBusy, isError: logoRefsFailed } = useFileReferences(eventLogoScopes);
  const eventPresentation =
    ready?.kind === 'event'
      ? buildEventFormPresentation(
          ready.event,
          refByEventId.get(createEventId(ready.event.event_id)) ?? null,
          logoBusy,
          logoRefsFailed
        )
      : null;

  if (!organisationId) {
    return renderOrganisationGate(organisationId);
  }

  const resolvedWriteOrganisationId = writeOrganisationId ?? organisationId;

  const personLoadingGate = renderPersonLoadingGate({
    proxy,
    user,
    organisationId,
    secureClient,
    personQuery,
  });
  if (personLoadingGate) {
    return personLoadingGate;
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

  const memberContextView = renderMemberContextGate({
    proxy,
    pm,
    entry,
    navigate,
    selfPerson,
    targetPersonQuery,
    effectivePersonId,
  });
  if (memberContextView) {
    return memberContextView;
  }

  if (!effectivePersonId) {
    return <NotFoundPage />;
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

  const entryErrorView = renderEntryErrorGate({ entrypoint, entry, navigate });
  if (entryErrorView) {
    return entryErrorView;
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
    return renderFieldDataErrorGate({
      entrypoint,
      entry,
      proxy,
      navigate,
      message: fieldData.fetchErrorMessage,
    });
  }

  return (
    <main className="mx-auto grid max-w-(--app-width) gap-4 p-4">
      {proxy.isProxyActive ? <ProxyModeBanner /> : null}
      {extension}
      {fieldData.isLoading && journey.phase === 'filling' ? (
        <LoadingSpinner label="Loading field defaults…" />
      ) : null}
      <FormJourneyFillReady
        entrypoint={entrypoint}
        ready={ready}
        phase={journey.phase}
        submittedSnapshot={journey.submittedSnapshot}
        userId={user!.id}
        writeOrganisationId={resolvedWriteOrganisationId}
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
        eventPresentation={eventPresentation}
      />
    </main>
  );
}

function renderOrganisationGate(organisationId: string | null): ReactNode {
  if (organisationId) {
    return null;
  }

  return (
    <main className="grid gap-4 px-4">
      <Alert variant="destructive">
        <AlertTitle>Organisation required</AlertTitle>
        <AlertDescription>Select an organisation before opening this form.</AlertDescription>
      </Alert>
    </main>
  );
}

function renderPersonLoadingGate(args: {
  proxy: Setup['proxy'];
  user: Setup['user'];
  organisationId: string | null;
  secureClient: Setup['secureClient'];
  personQuery: Setup['personQuery'];
}): ReactNode {
  const { proxy, user, organisationId, secureClient, personQuery } = args;

  if (proxy.isValidating) {
    return (
      <main className="grid min-h-[40vh] place-items-center px-4" aria-busy="true">
        <LoadingSpinner label="Checking delegated access…" />
      </main>
    );
  }

  const personContextPending = Boolean(user?.id && organisationId && !secureClient);
  if (personContextPending || personQuery.isLoading) {
    return (
      <main className="grid min-h-[40vh] place-items-center px-4" aria-busy="true">
        <LoadingSpinner label="Loading profile…" />
      </main>
    );
  }

  return null;
}

function renderFieldDataErrorGate(args: {
  entrypoint: FormEntrypoint;
  entry: Setup['entry'];
  proxy: Setup['proxy'];
  navigate: ReturnType<typeof useNavigate>;
  message: string;
}): ReactNode {
  const { entrypoint, entry, proxy, navigate, message } = args;
  const backTarget =
    entrypoint.kind !== 'org_form' && entry.routeEventSlug
      ? `/${encodeURIComponent(entry.routeEventSlug)}`
      : '/';

  return (
    <main className="mx-auto grid max-w-(--app-width) gap-4 p-4">
      {proxy.isProxyActive ? <ProxyModeBanner /> : null}
      <Alert variant="destructive">
        <AlertTitle>Field data</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
      <Button type="button" variant="secondary" onClick={() => navigate(backTarget)}>
        {entrypoint.kind === 'org_form' ? 'Back to home' : 'Back to event'}
      </Button>
    </main>
  );
}

function renderMemberContextGate(args: {
  proxy: Setup['proxy'];
  pm: Setup['pm'];
  entry: Setup['entry'];
  navigate: ReturnType<typeof useNavigate>;
  selfPerson: Setup['selfPerson'];
  targetPersonQuery: Setup['targetPersonQuery'];
  effectivePersonId: string | null;
}): ReactNode {
  const { proxy, pm, entry, navigate, selfPerson, targetPersonQuery, effectivePersonId } = args;

  if (!proxy.isProxyActive && pm && !isOk(pm)) {
    if (pm.error.code === NO_PERSON_PROFILE_ERROR_CODE) {
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

    const memberMsg = pm.error.message?.trim() || 'Could not load member context.';
    return (
      <main className="mx-auto grid max-w-(--app-width) gap-4 p-4">
        <Alert variant="destructive">
          <AlertTitle>Member context</AlertTitle>
          <AlertDescription>{memberMsg}</AlertDescription>
        </Alert>
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

  return null;
}

function renderEntryErrorGate(args: {
  entrypoint: FormEntrypoint;
  entry: Setup['entry'];
  navigate: ReturnType<typeof useNavigate>;
}): ReactNode {
  const { entrypoint, entry, navigate } = args;
  if (!entry.error) {
    return null;
  }
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
