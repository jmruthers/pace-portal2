import { Link } from 'react-router-dom';
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  LoadingSpinner,
} from '@solvera/pace-core/components';
import { MemberRequestOrgFormStep } from '@/components/memberships/MemberRequestOrgFormStep';
import type { UseMemberRequestFlowResult } from '@/lib/memberRequestTypes';

export type MemberRequestFlowPanelProps = {
  flow: UseMemberRequestFlowResult;
  personId: string | null;
  memberId: string | null;
  personFirstName: string | null;
  personLastName: string | null;
  personEmail: string | null;
};

/** PR22 — Inline join/transfer steps (same route, component state). */
export function MemberRequestFlowPanel({
  flow,
  personId,
  memberId,
  personFirstName,
  personLastName,
  personEmail,
}: MemberRequestFlowPanelProps) {
  const step = flow.flowStep;
  if (step === 'idle') {
    return null;
  }

  if (step === 'confirmation' && flow.confirmationOrgName) {
    return (
      <section className="grid gap-4" aria-label="Request submitted">
        <h2>Request submitted</h2>
        <p>
          Your request has been submitted. {flow.confirmationOrgName} will be in touch.
        </p>
        <fieldset className="text-right">
          <Button type="button" variant="default" onClick={flow.cancelFlow}>
            Return to list
          </Button>
        </fieldset>
      </section>
    );
  }

  const showNav = step !== 'confirmation' && step !== 'org_form';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add organisation</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {flow.preSubmitError ? (
          <p role="alert">
            {flow.preSubmitError}{' '}
            {flow.preSubmitCode === 'PROFILE_INCOMPLETE' ? (
              <Link to="/member-profile">Complete your profile</Link>
            ) : null}
          </p>
        ) : null}

        {step === 'request_type' ? (
          <fieldset className="grid gap-2">
            <legend>Request type</legend>
            <Button
              type="button"
              variant={flow.requestType === 'join' ? 'default' : 'outline'}
              onClick={() => flow.setRequestType('join')}
            >
              Join (new member)
            </Button>
            <Button
              type="button"
              variant={flow.requestType === 'transfer' ? 'default' : 'outline'}
              onClick={() => flow.setRequestType('transfer')}
            >
              Transfer from another organisation
            </Button>
          </fieldset>
        ) : null}

        {step === 'org_search' ? (
          <section className="grid gap-2" aria-label="Organisation search">
            <Label htmlFor="org-search-input">Search organisations</Label>
            <Input
              id="org-search-input"
              type="search"
              value={flow.orgSearchQuery}
              onChange={(value) => flow.setOrgSearchQuery(value)}
              autoComplete="off"
            />
            {flow.orgSearchLoading ? <LoadingSpinner label="Searching…" /> : null}
            {flow.orgSearchError && flow.orgSearchQuery.trim().length >= 2 ? (
              <p role="alert">{flow.orgSearchError}</p>
            ) : null}
            {flow.selectedOrg ? (
              <p>
                Selected: <strong>{flow.selectedOrg.displayName}</strong>
              </p>
            ) : null}
            <ul>
              {flow.orgSearchResults.map((org) => (
                <li key={org.id}>
                  <Button type="button" variant="outline" onClick={() => flow.selectOrg(org)}>
                    {org.displayName}
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {step === 'source_org' ? (
          <fieldset className="grid gap-2">
            <legend>Organisation you are leaving</legend>
            {flow.activeSourceMemberships.length === 0 ? (
              <p>You need an active membership to transfer from another organisation.</p>
            ) : (
              flow.activeSourceMemberships.map((m) => (
                <Button
                  key={m.memberId}
                  type="button"
                  variant={flow.sourceOrgId === m.organisationId ? 'default' : 'outline'}
                  onClick={() => flow.setSourceOrgId(m.organisationId)}
                >
                  {m.organisationName}
                </Button>
              ))
            )}
          </fieldset>
        ) : null}

        {step === 'membership_type' ? (
          <fieldset className="grid gap-2">
            <legend>Membership type</legend>
            {flow.eligibleMembershipTypes.length === 0 ? (
              <p>No membership types are available for your age at this organisation.</p>
            ) : (
              flow.eligibleMembershipTypes.map((t) => (
                <Button
                  key={t.id}
                  type="button"
                  variant={flow.selectedMembershipTypeId === t.id ? 'default' : 'outline'}
                  onClick={() => flow.setSelectedMembershipTypeId(t.id)}
                >
                  {t.name}
                </Button>
              ))
            )}
          </fieldset>
        ) : null}

        {step === 'org_form' ? (
          flow.orgFormLoading ? (
            <LoadingSpinner label="Loading form…" />
          ) : (
            <MemberRequestOrgFormStep
              organisationId={flow.selectedOrg?.id ?? ''}
              organisationName={flow.selectedOrg?.displayName ?? 'Organisation'}
              personId={personId}
              memberId={memberId}
              personFirstName={personFirstName}
              personLastName={personLastName}
              personEmail={personEmail}
              orgSignupForm={flow.orgSignupForm}
              submitPending={flow.submitPending}
              submitError={flow.submitError}
              preSubmitError={flow.preSubmitError}
              onSubmit={(values) => void flow.submitRequest(values)}
            />
          )
        ) : null}
      </CardContent>
      {showNav ? (
        <CardFooter className="grid grid-cols-2 gap-2 text-right">
          <Button type="button" variant="outline" onClick={flow.goBack}>
            Back
          </Button>
          <Button type="button" variant="default" onClick={flow.goNext}>
            Continue
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
