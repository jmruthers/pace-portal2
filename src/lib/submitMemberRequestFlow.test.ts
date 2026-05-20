import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createOrganisationId, createUserId, isOk } from '@solvera/pace-core/types';
import { submitMemberRequestFlow } from '@/lib/submitMemberRequestFlow';

const fetchOrgMembershipTypesMock = vi.hoisted(() => vi.fn());
const validateMock = vi.hoisted(() => vi.fn());
const persistMock = vi.hoisted(() => vi.fn());
const submitRpcMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/fetchOrgMembershipTypes', () => ({
  fetchOrgMembershipTypes: (...args: unknown[]) => fetchOrgMembershipTypesMock(...args),
}));

vi.mock('@/lib/validateMemberRequestPreSubmit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/validateMemberRequestPreSubmit')>();
  return {
    ...actual,
    validateMemberRequestPreSubmit: (...args: unknown[]) => validateMock(...args),
  };
});

vi.mock('@/lib/persistOrgSignupFormResponse', () => ({
  persistOrgSignupFormResponse: (...args: unknown[]) => persistMock(...args),
}));

vi.mock('@/lib/memberRequestRpc', () => ({
  submitMemberRequest: (...args: unknown[]) => submitRpcMock(...args),
}));

describe('submitMemberRequestFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchOrgMembershipTypesMock.mockResolvedValue({
      ok: true,
      data: [
        {
          id: 1,
          name: 'Adult',
          minAge: null,
          maxAge: null,
          organisationId: createOrganisationId('org-target'),
        },
      ],
    });
    validateMock.mockReturnValue({ ok: true, data: undefined });
    submitRpcMock.mockResolvedValue({
      ok: true,
      data: { memberId: 'mem-1', requestId: 'req-1' },
    });
  });

  it('submits join request without org signup form', async () => {
    const res = await submitMemberRequestFlow(
      {} as never,
      {
        actingUserId: createUserId('user-1'),
        personId: 'person-1',
        requestType: 'join',
        targetOrganisationId: createOrganisationId('org-target'),
        targetOrganisationName: 'Target Org',
        membershipTypeId: 1,
        sourceOrganisationId: null,
        formValues: null,
        orgSignupForm: null,
        existingMemberships: [],
        personDob: '1990-01-01',
        personForProgress: {
          first_name: 'A',
          last_name: 'B',
          email: 'a@b.c',
          date_of_birth: '1990-01-01',
          preferred_name: null,
          gender_id: null,
          pronoun_id: null,
        },
        memberForProgress: null,
      },
      []
    );

    expect(isOk(res)).toBe(true);
    expect(persistMock).not.toHaveBeenCalled();
    expect(submitRpcMock).toHaveBeenCalled();
  });

  it('returns guard error without calling RPC', async () => {
    validateMock.mockReturnValue({
      ok: false,
      error: { code: 'PROFILE_INCOMPLETE', message: 'Complete profile' },
    });

    const res = await submitMemberRequestFlow(
      {} as never,
      {
        actingUserId: createUserId('user-1'),
        personId: 'person-1',
        requestType: 'join',
        targetOrganisationId: createOrganisationId('org-target'),
        targetOrganisationName: 'Target Org',
        membershipTypeId: 1,
        sourceOrganisationId: null,
        formValues: null,
        orgSignupForm: null,
        existingMemberships: [],
        personDob: null,
        personForProgress: null,
        memberForProgress: null,
      },
      []
    );

    expect(isOk(res)).toBe(false);
    expect(submitRpcMock).not.toHaveBeenCalled();
  });

  it('persists org signup form before RPC when form and values provided', async () => {
    persistMock.mockResolvedValue({ ok: true, data: 'resp-99' });

    const res = await submitMemberRequestFlow(
      {} as never,
      {
        actingUserId: createUserId('user-1'),
        personId: 'person-1',
        requestType: 'join',
        targetOrganisationId: createOrganisationId('org-target'),
        targetOrganisationName: 'Target Org',
        membershipTypeId: 1,
        sourceOrganisationId: null,
        formValues: { field_a: 'x' },
        orgSignupForm: {
          formId: 'form-1',
          formTitle: 'Signup',
          formDescription: null,
          fieldRows: [],
          confirmationKeys: [],
        },
        existingMemberships: [],
        personDob: '1990-01-01',
        personForProgress: null,
        memberForProgress: null,
      },
      []
    );

    expect(isOk(res)).toBe(true);
    expect(persistMock).toHaveBeenCalled();
    expect(submitRpcMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ formResponseId: 'resp-99' })
    );
  });

  it('passes transfer source org to RPC args', async () => {
    const res = await submitMemberRequestFlow(
      {} as never,
      {
        actingUserId: createUserId('user-1'),
        personId: 'person-1',
        requestType: 'transfer',
        targetOrganisationId: createOrganisationId('org-target'),
        targetOrganisationName: 'Target Org',
        membershipTypeId: 1,
        sourceOrganisationId: createOrganisationId('org-src'),
        formValues: null,
        orgSignupForm: null,
        existingMemberships: [
          {
            memberId: 'm-src',
            organisationId: createOrganisationId('org-src'),
            organisationName: 'Source',
            membershipStatus: 'Active',
            membershipTypeId: 1,
            membershipTypeName: 'A',
            membershipNumber: '1',
            requestId: null,
            requestStatus: null,
            requestSubmittedAt: null,
            displayKind: 'active',
            displayLabel: 'Active',
            showApplyAgain: false,
          },
        ],
        personDob: '1990-01-01',
        personForProgress: null,
        memberForProgress: null,
      },
      []
    );

    expect(isOk(res)).toBe(true);
    expect(submitRpcMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        requestType: 'transfer',
        sourceOrganisationId: createOrganisationId('org-src'),
        subjectMemberId: 'm-src',
      })
    );
  });
});
