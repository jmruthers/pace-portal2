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
import type { UseMemberRequestFlowResult } from '@/lib/memberRequestFlowTypes';

type MemberRequestFlowPanelProps = {
  flow: UseMemberRequestFlowResult;
  personId: string | null;
  memberId: string | null;
  personFirstName: string | null;
  personLastName: string | null;
  personEmail: string | null;
};

function MemberRequestConfirmationCard({
  organisationName,
  onReturn,
}: {
  organisationName: string;
  onReturn: () => void;
}) {
  return (
    <Card aria-label="Request submitted">
      <CardHeader>
        <CardTitle>Request submitted</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Your request has been submitted. {organisationName} will be in touch.</p>
      </CardContent>
      <CardFooter className="text-right">
        <Button type="button" variant="default" onClick={onReturn}>
          Return to list
        </Button>
      </CardFooter>
    </Card>
  );
}

function MemberRequestPreSubmitAlert({
  message,
  showProfileLink,
}: {
  message: string;
  showProfileLink: boolean;
}) {
  return (
    <p role="alert">
      {message}{' '}
      {showProfileLink ? <Link to="/member-profile">Complete your profile</Link> : null}
    </p>
  );
}

function MemberRequestTypeStep({
  requestType,
  onSelect,
}: {
  requestType: UseMemberRequestFlowResult['requestType'];
  onSelect: (type: 'join' | 'transfer') => void;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend>Request type</legend>
      <Button
        type="button"
        variant={requestType === 'join' ? 'default' : 'outline'}
        onClick={() => onSelect('join')}
      >
        Join (new member)
      </Button>
      <Button
        type="button"
        variant={requestType === 'transfer' ? 'default' : 'outline'}
        onClick={() => onSelect('transfer')}
      >
        Transfer from another organisation
      </Button>
    </fieldset>
  );
}

function MemberRequestOrgSearchStep({ flow }: { flow: UseMemberRequestFlowResult }) {
  return (
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
  );
}

function MemberRequestSourceOrgStep({ flow }: { flow: UseMemberRequestFlowResult }) {
  return (
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
  );
}

function MemberRequestMembershipTypeStep({ flow }: { flow: UseMemberRequestFlowResult }) {
  return (
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
  );
}

function MemberRequestOrgFormContent({
  flow,
  personId,
  memberId,
  personFirstName,
  personLastName,
  personEmail,
}: MemberRequestFlowPanelProps) {
  if (flow.orgFormLoading) {
    return <LoadingSpinner label="Loading form…" />;
  }

  return (
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
  );
}

/** PR22 — Inline join/transfer steps (same route, component state). */
export function MemberRequestFlowPanel(props: MemberRequestFlowPanelProps) {
  const { flow } = props;
  const step = flow.flowStep;

  if (step === 'idle') {
    return null;
  }

  if (step === 'confirmation' && flow.confirmationOrgName) {
    return (
      <MemberRequestConfirmationCard
        organisationName={flow.confirmationOrgName}
        onReturn={flow.cancelFlow}
      />
    );
  }

  const orgFormFieldCount = flow.orgSignupForm?.fieldRows?.length ?? 0;
  const showEmptyOrgFormFooter =
    step === 'org_form' &&
    !flow.orgFormLoading &&
    (flow.orgSignupForm == null || orgFormFieldCount === 0);
  const showNav = step !== 'confirmation' && step !== 'org_form';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add organisation</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {flow.preSubmitError ? (
          <MemberRequestPreSubmitAlert
            message={flow.preSubmitError}
            showProfileLink={flow.preSubmitCode === 'PROFILE_INCOMPLETE'}
          />
        ) : null}

        {step === 'request_type' ? (
          <MemberRequestTypeStep requestType={flow.requestType} onSelect={flow.setRequestType} />
        ) : null}

        {step === 'org_search' ? <MemberRequestOrgSearchStep flow={flow} /> : null}

        {step === 'source_org' ? <MemberRequestSourceOrgStep flow={flow} /> : null}

        {step === 'membership_type' ? <MemberRequestMembershipTypeStep flow={flow} /> : null}

        {step === 'org_form' ? <MemberRequestOrgFormContent {...props} /> : null}
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
      {showEmptyOrgFormFooter ? (
        <CardFooter className="border-t border-border">
          <fieldset className="m-0 w-full border-0 p-0 grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={flow.goBack}>
              Back
            </Button>
            <Button
              type="button"
              variant="default"
              disabled={flow.submitPending}
              onClick={() => void flow.submitRequest({})}
            >
              {flow.submitPending ? 'Submitting…' : 'Submit'}
            </Button>
          </fieldset>
        </CardFooter>
      ) : null}
    </Card>
  );
}
