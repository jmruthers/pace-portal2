import { useLayoutEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useOrganisationsContextOptional } from '@solvera/pace-core/providers';
import { Alert, AlertDescription, AlertTitle, Button, LoadingSpinner } from '@solvera/pace-core/components';
import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';
import { ContactSummaryCard } from '@/components/contacts/ContactSummaryCard';
import { EventList } from '@/components/events/EventList';
import { ProfilePrompts } from '@/components/member-profile/ProfilePrompts';
import { useProxyDashboard } from '@/shared/hooks/useProxyDashboard';
import { useProxyMode } from '@/shared/hooks/useProxyMode';
import { ProxyModeBanner } from '@/shared/components/ProxyModeBanner';

function ProfileEditProxyContent() {
  const navigate = useNavigate();
  const { memberId = '' } = useParams();
  const org = useOrganisationsContextOptional();
  const organisationId = org?.selectedOrganisation?.id ?? null;
  const proxy = useProxyMode();
  const {
    setProxyTargetMemberId,
    validationError,
    isValidating,
    isProxyActive,
    targetMemberId: activeTargetMemberId,
  } = proxy;
  const { data, isLoading, isError, error } = useProxyDashboard({
    isProxyActive: proxy.isProxyActive,
    targetMemberId: proxy.targetMemberId,
    targetPersonId: proxy.targetPersonId,
  });

  useLayoutEffect(() => {
    if (!memberId) return;
    setProxyTargetMemberId(memberId);
  }, [memberId, setProxyTargetMemberId]);

  if (!organisationId) {
    return (
      <main className="grid gap-4 px-4">
        <Alert variant="destructive">
          <AlertTitle>Organisation required</AlertTitle>
          <AlertDescription>Select an organisation before using the delegated workspace.</AlertDescription>
        </Alert>
      </main>
    );
  }

  if (!memberId) {
    return (
      <main className="grid gap-4 px-4">
        <Alert variant="destructive">
          <AlertTitle>Invalid link</AlertTitle>
          <AlertDescription>Missing member id.</AlertDescription>
        </Alert>
      </main>
    );
  }

  if (activeTargetMemberId !== memberId && !validationError) {
    return (
      <main className="grid min-h-[40vh] place-items-center px-4" aria-busy="true">
        <LoadingSpinner label="Starting delegated session…" />
      </main>
    );
  }

  if (isValidating) {
    return (
      <main className="grid min-h-[40vh] place-items-center px-4" aria-busy="true">
        <LoadingSpinner label="Validating delegated access…" />
      </main>
    );
  }

  if (validationError) {
    return (
      <main className="grid gap-4 px-4">
        <Alert variant="destructive">
          <AlertTitle>Delegated access</AlertTitle>
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
        <Button type="button" variant="secondary" onClick={() => navigate('/')}>
          Back to dashboard
        </Button>
      </main>
    );
  }

  if (!isProxyActive) {
    return (
      <main className="grid gap-4 px-4">
        <Alert variant="destructive">
          <AlertTitle>Delegated session unavailable</AlertTitle>
          <AlertDescription>
            Proxy context could not be activated. Open this page from a linked profile with edit access.
          </AlertDescription>
        </Alert>
        <Button type="button" variant="secondary" onClick={() => navigate('/')}>
          Back to dashboard
        </Button>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="grid min-h-[40vh] place-items-center px-4" aria-busy="true">
        <LoadingSpinner label="Loading delegated workspace…" />
      </main>
    );
  }

  if (isError || !data?.person) {
    return (
      <main className="grid gap-4 px-4">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Could not load delegated workspace.'}
          </AlertDescription>
        </Alert>
        <Button type="button" variant="secondary" onClick={() => navigate('/')}>
          Back to dashboard
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto grid max-w-(--app-width) gap-6 p-4">
      <h1>Delegated workspace</h1>
      <ProxyModeBanner />
      <ContactSummaryCard
        person={data.person}
        phones={data.phones}
        organisationId={data.member?.organisation_id ?? organisationId}
      />
      <ProfilePrompts
        profileProgress={data.profileProgress}
        navContext={{ kind: 'delegated', memberId }}
      />
      <EventList eventsByCategory={data.eventsByCategory} />
      <Button type="button" variant="secondary" onClick={() => navigate('/')}>
        Back to dashboard
      </Button>
    </main>
  );
}

/**
 * Delegated dashboard-style workspace for a target member (PR08). Establishes validated proxy context; billing excluded.
 */
export function ProfileEditProxyPage() {
  return (
    <PagePermissionGuard
      pageName="member-profile"
      operation="read"
      loading={
        <main className="grid min-h-[50vh] place-items-center px-4" aria-busy="true">
          <LoadingSpinner label="Checking access…" />
        </main>
      }
      fallback={<AccessDenied />}
    >
      <section aria-label="Delegated profile edit">
        <ProfileEditProxyContent />
      </section>
    </PagePermissionGuard>
  );
}
