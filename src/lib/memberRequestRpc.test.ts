import { describe, expect, it, vi } from 'vitest';
import { isOk } from '@solvera/pace-core/types';
import { createOrganisationId } from '@solvera/pace-core/types';
import { submitMemberRequest } from '@/lib/memberRequestRpc';

describe('submitMemberRequest', () => {
  it('calls app_submit_member_request for join', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { request_id: 'req-1', member_id: 'mem-1' },
      error: null,
    });
    const client = { rpc } as never;

    const r = await submitMemberRequest(client, {
      organisationId: createOrganisationId('org-target'),
      requestType: 'join',
      membershipTypeId: 3,
      subjectPersonId: 'person-1',
      subjectMemberId: null,
      sourceOrganisationId: null,
      targetOrganisationId: createOrganisationId('org-target'),
      formResponseId: 'resp-1',
    });

    expect(isOk(r)).toBe(true);
    expect(rpc).toHaveBeenCalledWith('app_submit_member_request', {
      p_organisation_id: 'org-target',
      p_request_type: 'join',
      p_membership_type_id: 3,
      p_subject_person_id: 'person-1',
      p_subject_member_id: undefined,
      p_source_organisation_id: undefined,
      p_target_organisation_id: 'org-target',
      p_applicant_member_number: undefined,
      p_reason: undefined,
      p_form_response_id: 'resp-1',
    });
  });

  it('includes source org for transfer', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { request_id: 'req-2', member_id: 'mem-2' },
      error: null,
    });
    const client = { rpc } as never;

    await submitMemberRequest(client, {
      organisationId: createOrganisationId('org-target'),
      requestType: 'transfer',
      membershipTypeId: 2,
      subjectPersonId: 'person-1',
      subjectMemberId: 'mem-src',
      sourceOrganisationId: createOrganisationId('org-source'),
      targetOrganisationId: createOrganisationId('org-target'),
      formResponseId: null,
    });

    expect(rpc).toHaveBeenCalledWith(
      'app_submit_member_request',
      expect.objectContaining({
        p_request_type: 'transfer',
        p_source_organisation_id: 'org-source',
        p_target_organisation_id: 'org-target',
        p_subject_member_id: 'mem-src',
        p_form_response_id: undefined,
      })
    );
  });
});
