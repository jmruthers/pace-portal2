import { useEffect, useRef } from 'react';
import { useOrganisationsContextOptional } from '@solvera/pace-core/providers';
import { Alert, AlertDescription, AlertTitle, LoadingSpinner } from '@solvera/pace-core/components';
import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';
import { useEnhancedLanding } from '@/shared/hooks/useEnhancedLanding';
import { useProxyMode } from '@/shared/hooks/useProxyMode';
import { ContactSummaryCard } from '@/components/contacts/ContactSummaryCard';
import { LinkedProfilesSection } from '@/components/contacts/LinkedProfilesSection';
import { EventList } from '@/components/events/EventList';
import { ProfilePrompts } from '@/components/member-profile/ProfilePrompts';
import { ProfileSetupPrompt } from '@/components/member-profile/ProfileSetupPrompt';

function DashboardContent() {
  const org = useOrganisationsContextOptional();
  const organisationId = org?.selectedOrganisation?.id ?? null;
  const { clearProxy } = useProxyMode();
  const { data, isLoading, isError, error, refetch } = useEnhancedLanding();
  const didRefetch = useRef(false);

  useEffect(() => {
    clearProxy();
  }, [clearProxy]);

  useEffect(() => {
    if (didRefetch.current) return;
    didRefetch.current = true;
    void refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <main className="grid min-h-[40vh] place-items-center px-4" aria-busy="true">
        <LoadingSpinner label="Loading dashboard…" />
      </main>
    );
  }

  if (isError) {
    return (
      <main className="grid gap-4 px-4">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error instanceof Error ? error.message : 'Something went wrong.'}</AlertDescription>
        </Alert>
      </main>
    );
  }

  if (!data) {
    return null;
  }

  if (data.needsProfileSetup || !data.person) {
    return (
      <main className="grid gap-6 px-4">
        <h1>Dashboard</h1>
        <ProfileSetupPrompt />
      </main>
    );
  }

  return (
    <main className="grid gap-6 px-4">
      <h1>Dashboard</h1>
      <ContactSummaryCard person={data.person} phones={data.phones} organisationId={organisationId} />
      <ProfilePrompts profileProgress={data.profileProgress} />
      <EventList eventsByCategory={data.eventsByCategory} />
      <LinkedProfilesSection />
    </main>
  );
}

/**
 * Member dashboard composition (PR03): landing data, prompts, events slot, linked profiles; no billing.
 */
export function DashboardPage() {
  return (
    <PagePermissionGuard
      pageName="dashboard"
      operation="read"
      loading={
        <main className="grid min-h-[50vh] place-items-center px-4" aria-busy="true">
          <LoadingSpinner label="Checking access…" />
        </main>
      }
      fallback={<AccessDenied />}
    >
      <section aria-label="Dashboard">
        <DashboardContent />
      </section>
    </PagePermissionGuard>
  );
}
