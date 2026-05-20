import { describe, expect, it, vi } from 'vitest';
import { createOrganisationId, isOk } from '@solvera/pace-core/types';
import { fetchOrgSignupForm } from '@/lib/fetchOrgSignupForm';
import type { Database } from '@/types/pace-database';

type CoreFormRow = Database['public']['Tables']['core_forms']['Row'];

function buildFormRow(over: Partial<CoreFormRow> = {}): CoreFormRow {
  return {
    id: 'form-1',
    organisation_id: 'org-target',
    event_id: null,
    slug: 'signup',
    status: 'published',
    access_mode: 'authenticated_member',
    is_active: true,
    opens_at: null,
    closes_at: null,
    name: 'Signup',
    workflow_type: 'org_signup',
    workflow_config: {},
    ...over,
  } as CoreFormRow;
}

describe('fetchOrgSignupForm', () => {
  it('returns null when published form fails participant eligibility', async () => {
    const formChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: buildFormRow({ is_active: false }),
        error: null,
      }),
    };
    const client = { from: vi.fn().mockReturnValue(formChain) };

    const res = await fetchOrgSignupForm(client as never, createOrganisationId('org-target'));
    expect(isOk(res)).toBe(true);
    if (isOk(res)) expect(res.data).toBeNull();
  });

  it('loads fields for eligible published org_signup form', async () => {
    const formChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: buildFormRow(),
        error: null,
      }),
    };
    const fieldsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [{ id: 'f1', form_id: 'form-1' }], error: null }),
    };
    const client = {
      from: vi.fn((table: string) => (table === 'core_forms' ? formChain : fieldsChain)),
    };

    const res = await fetchOrgSignupForm(client as never, createOrganisationId('org-target'));
    expect(isOk(res)).toBe(true);
    if (isOk(res) && res.data) {
      expect(res.data.formId).toBe('form-1');
      expect(res.data.fieldRows).toHaveLength(1);
    }
  });
});
