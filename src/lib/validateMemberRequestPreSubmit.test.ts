import { describe, expect, it } from 'vitest';
import { createOrganisationId } from '@solvera/pace-core/types';
import { isOk } from '@solvera/pace-core/types';
import { validateMemberRequestPreSubmit } from '@/lib/validateMemberRequestPreSubmit';

describe('validateMemberRequestPreSubmit', () => {
  const basePerson = {
    first_name: 'A',
    last_name: 'B',
    email: 'a@b.c',
    date_of_birth: '1990-01-01',
    preferred_name: 'A',
    gender_id: 1,
    pronoun_id: 1,
  };

  it('blocks incomplete profile', () => {
    const r = validateMemberRequestPreSubmit({
      targetOrganisationId: createOrganisationId('org-target'),
      membershipTypeId: 1,
      membershipTypes: [
        {
          id: 1,
          name: 'Adult',
          minAge: null,
          maxAge: null,
          organisationId: createOrganisationId('org-target'),
        },
      ],
      personDob: '1990-01-01',
      progressInput: { person: { ...basePerson, first_name: '' }, member: null },
      existingMemberships: [],
      pendingRequests: [],
    });
    expect(isOk(r)).toBe(false);
    if (!isOk(r)) expect(r.error.code).toBe('PROFILE_INCOMPLETE');
  });

  it('blocks duplicate pending request', () => {
    const r = validateMemberRequestPreSubmit({
      targetOrganisationId: createOrganisationId('org-target'),
      membershipTypeId: 1,
      membershipTypes: [
        {
          id: 1,
          name: 'Adult',
          minAge: null,
          maxAge: null,
          organisationId: createOrganisationId('org-target'),
        },
      ],
      personDob: '1990-01-01',
      progressInput: {
        person: basePerson,
        member: { membership_type_id: 1, membership_number: '1' },
      },
      existingMemberships: [],
      pendingRequests: [{ targetOrganisationId: 'org-target', status: 'pending' }],
    });
    expect(isOk(r)).toBe(false);
    if (!isOk(r)) expect(r.error.code).toBe('DUPLICATE_REQUEST');
  });

  it('blocks age ineligible type', () => {
    const r = validateMemberRequestPreSubmit({
      targetOrganisationId: createOrganisationId('org-target'),
      membershipTypeId: 2,
      membershipTypes: [
        {
          id: 1,
          name: 'Child',
          minAge: 0,
          maxAge: 12,
          organisationId: createOrganisationId('org-target'),
        },
        {
          id: 2,
          name: 'Adult',
          minAge: 18,
          maxAge: null,
          organisationId: createOrganisationId('org-target'),
        },
      ],
      personDob: '2015-01-01',
      progressInput: {
        person: basePerson,
        member: { membership_type_id: 1, membership_number: '1' },
      },
      existingMemberships: [],
      pendingRequests: [],
    });
    expect(isOk(r)).toBe(false);
    if (!isOk(r)) expect(r.error.code).toBe('AGE_INELIGIBLE');
  });

  it('blocks transfer without source organisation', () => {
    const r = validateMemberRequestPreSubmit({
      requestType: 'transfer',
      sourceOrganisationId: null,
      targetOrganisationId: createOrganisationId('org-target'),
      membershipTypeId: 1,
      membershipTypes: [
        {
          id: 1,
          name: 'Adult',
          minAge: null,
          maxAge: null,
          organisationId: createOrganisationId('org-target'),
        },
      ],
      personDob: '1990-01-01',
      progressInput: {
        person: basePerson,
        member: { membership_type_id: 1, membership_number: '1' },
      },
      existingMemberships: [],
      pendingRequests: [],
    });
    expect(isOk(r)).toBe(false);
    if (!isOk(r)) expect(r.error.code).toBe('TRANSFER_SOURCE_REQUIRED');
  });

  it('blocks transfer without active source membership', () => {
    const r = validateMemberRequestPreSubmit({
      requestType: 'transfer',
      sourceOrganisationId: createOrganisationId('org-src'),
      targetOrganisationId: createOrganisationId('org-target'),
      membershipTypeId: 1,
      membershipTypes: [
        {
          id: 1,
          name: 'Adult',
          minAge: null,
          maxAge: null,
          organisationId: createOrganisationId('org-target'),
        },
      ],
      personDob: '1990-01-01',
      progressInput: {
        person: basePerson,
        member: { membership_type_id: 1, membership_number: '1' },
      },
      existingMemberships: [],
      pendingRequests: [],
    });
    expect(isOk(r)).toBe(false);
    if (!isOk(r)) expect(r.error.code).toBe('TRANSFER_SOURCE_REQUIRED');
  });

  it('passes when guards satisfied', () => {
    const r = validateMemberRequestPreSubmit({
      targetOrganisationId: createOrganisationId('org-target'),
      membershipTypeId: 2,
      membershipTypes: [
        {
          id: 2,
          name: 'Adult',
          minAge: 18,
          maxAge: null,
          organisationId: createOrganisationId('org-target'),
        },
      ],
      personDob: '1990-01-01',
      progressInput: {
        person: basePerson,
        member: { membership_type_id: 2, membership_number: '1' },
      },
      existingMemberships: [],
      pendingRequests: [],
    });
    expect(isOk(r)).toBe(true);
  });
});
