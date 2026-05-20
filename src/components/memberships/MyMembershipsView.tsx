import { useCallback, useEffect, useState } from 'react';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { useOrganisationsContextOptional } from '@solvera/pace-core/providers';
import { Button, LoadingSpinner } from '@solvera/pace-core/components';
import { isOk } from '@solvera/pace-core/types';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { MembershipStateCard } from '@/components/memberships/MembershipStateCard';
import { MemberRequestFlowPanel } from '@/components/memberships/MemberRequestFlowPanel';
import { useMembershipList } from '@/hooks/memberships/useMembershipList';
import { useMemberRequestFlow } from '@/hooks/memberships/useMemberRequestFlow';
import { fetchCurrentPersonMember } from '@/shared/lib/utils/userUtils';

/** PR22 — Membership list, empty state, and inline join/transfer flow. */
export function MyMembershipsView() {
  const { user } = useUnifiedAuthContext();
  const secure = useSecureSupabase();
  const orgCtx = useOrganisationsContextOptional();
  const organisationId = orgCtx?.selectedOrganisation?.id ?? null;

  const list = useMembershipList();
  const [personId, setPersonId] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [personFirstName, setPersonFirstName] = useState<string | null>(null);
  const [personLastName, setPersonLastName] = useState<string | null>(null);
  const [personEmail, setPersonEmail] = useState<string | null>(null);

  const onSubmitted = useCallback(
    (item: import('@/lib/memberRequestTypes').MembershipListItem) => {
      list.upsertListItem(item);
      void list.refetch();
    },
    [list]
  );

  const flow = useMemberRequestFlow({
    existingMemberships: list.items,
    onSubmitted,
  });

  useEffect(() => {
    if (!secure || !user?.id || !organisationId) return;
    void fetchCurrentPersonMember(secure, user.id, organisationId).then((res) => {
      if (!isOk(res)) return;
      setPersonId(res.data.person.id);
      setMemberId(res.data.member?.id ?? null);
      setPersonFirstName(res.data.person.first_name);
      setPersonLastName(res.data.person.last_name);
      setPersonEmail(res.data.person.email);
    });
  }, [secure, user?.id, organisationId]);

  const showList = flow.flowStep === 'idle' || flow.flowStep === 'confirmation';
  const isEmpty = !list.isLoading && list.items.length === 0 && flow.flowStep === 'idle';

  if (list.isLoading && list.items.length === 0 && flow.flowStep === 'idle') {
    return (
      <main className="mx-auto grid max-w-(--app-width) gap-4 p-4" aria-busy="true">
        <h1>My memberships</h1>
        <LoadingSpinner label="Loading memberships…" />
      </main>
    );
  }

  if (list.isError) {
    return (
      <main className="mx-auto grid max-w-(--app-width) gap-4 p-4">
        <h1>My memberships</h1>
        <p role="alert">{list.errorMessage ?? 'Could not load memberships.'}</p>
        <fieldset className="text-right">
          <Button type="button" variant="default" onClick={() => void list.refetch()}>
            Retry
          </Button>
        </fieldset>
      </main>
    );
  }

  return (
    <main className="mx-auto grid max-w-(--app-width) gap-4 p-4">
      <header className="grid gap-2">
        <h1>My memberships</h1>
        {showList && flow.flowStep === 'idle' && !isEmpty ? (
          <fieldset className="text-right">
            <Button type="button" variant="default" onClick={() => flow.startFlow()}>
              Add Organisation
            </Button>
          </fieldset>
        ) : null}
      </header>

      {isEmpty ? (
        <section className="grid place-items-center gap-4 py-12" aria-label="No memberships">
          <p>You are not yet a member of any organisations.</p>
          <Button type="button" variant="default" onClick={() => flow.startFlow()}>
            Add Organisation
          </Button>
        </section>
      ) : null}

      {showList && list.items.length > 0 ? (
        <section className="grid gap-4" aria-label="Membership list">
          {list.items.map((item) => (
            <MembershipStateCard
              key={item.memberId}
              item={item}
              onApplyAgain={(orgId, orgName) =>
                flow.startFlow({ prefilledOrgId: orgId, prefilledOrgName: orgName })
              }
            />
          ))}
        </section>
      ) : null}

      <MemberRequestFlowPanel
        flow={flow}
        personId={personId}
        memberId={memberId}
        personFirstName={personFirstName}
        personLastName={personLastName}
        personEmail={personEmail}
      />
    </main>
  );
}
