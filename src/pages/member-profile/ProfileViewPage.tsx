import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useOrganisationsContextOptional } from '@solvera/pace-core/providers';
import { Alert, AlertDescription, AlertTitle, Button, LoadingSpinner } from '@solvera/pace-core/components';
import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';
import { ContactSummaryCard } from '@/components/contacts/ContactSummaryCard';
import { useDelegatedProfileView } from '@/hooks/member-profile/useDelegatedProfileView';
import { useLinkedProfiles } from '@/shared/hooks/useLinkedProfiles';
import { hasDelegatedEditPermission } from '@/shared/lib/utils/delegatedProfilePermissions';

function ProfileViewContent() {
  const navigate = useNavigate();
  const { memberId = '' } = useParams();
  const org = useOrganisationsContextOptional();
  const organisationId = org?.selectedOrganisation?.id ?? null;
  const { data: linkedRows } = useLinkedProfiles();
  const { data, isLoading, isError, error } = useDelegatedProfileView(memberId || null);

  const canEdit = useMemo(() => {
    if (!memberId || !linkedRows?.length) return false;
    const row = linkedRows.find((r) => r.member_id === memberId);
    return row ? hasDelegatedEditPermission(row.permission_type) : false;
  }, [linkedRows, memberId]);

  if (!organisationId) {
    return (
      <main className="grid gap-4 px-4">
        <Alert variant="destructive">
          <AlertTitle>Organisation required</AlertTitle>
          <AlertDescription>Select an organisation to view a delegated profile.</AlertDescription>
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

  if (isLoading) {
    return (
      <main className="grid min-h-[40vh] place-items-center px-4" aria-busy="true">
        <LoadingSpinner label="Loading profile…" />
      </main>
    );
  }

  if (isError) {
    return (
      <main className="grid gap-4 px-4">
        <Alert variant="destructive">
          <AlertTitle>Access denied</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'You cannot view this profile.'}
          </AlertDescription>
        </Alert>
        <Button type="button" variant="secondary" onClick={() => navigate('/')}>
          Back to dashboard
        </Button>
      </main>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <main className="mx-auto grid max-w-(--app-width) gap-6 p-4">
      <h1>Delegated profile</h1>
      <ContactSummaryCard
        person={data.person}
        phones={data.phones}
        organisationId={organisationId}
        readOnly
      />
      <section
        className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(10rem,1fr))]"
        aria-label="Delegated profile actions"
      >
        {canEdit ? (
          <Button
            type="button"
            variant="default"
            onClick={() => navigate(`/profile/edit/${memberId}`)}
          >
            Edit on their behalf
          </Button>
        ) : null}
        <Button type="button" variant="secondary" onClick={() => navigate('/')}>
          Back to dashboard
        </Button>
      </section>
    </main>
  );
}

/**
 * Read-only delegated profile (PR08). Does not set proxy localStorage; edit route establishes proxy session.
 */
export function ProfileViewPage() {
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
      <section aria-label="Delegated profile view">
        <ProfileViewContent />
      </section>
    </PagePermissionGuard>
  );
}
