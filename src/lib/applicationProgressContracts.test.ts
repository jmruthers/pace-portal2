import { describe, expect, it } from 'vitest';
import {
  APPLICATION_PROGRESS_ACCESS_DENIED_MARKER,
  SENSITIVE_PROGRESS_KEYS,
  isApplicationProgressAccessDenied,
  parseApplicationProgressPayload,
} from '@/lib/applicationProgressContracts';

describe('applicationProgressContracts', () => {
  const validPayload = {
    application: {
      id: '11111111-1111-4111-a111-111111111111',
      event_id: '22222222-2222-4222-a222-222222222222',
      organisation_id: '33333333-3333-4333-a333-333333333333',
      person_id: '44444444-4444-4444-a444-444444444444',
      registration_type_id: '55555555-5555-4555-a555-555555555555',
      form_id: '66666666-6666-4666-a666-666666666666',
      referee_name: 'Alex Ref',
      status: 'under_review',
      submitted_at: '2026-01-02T03:04:05.000Z',
    },
    registration_type: {
      id: '77777777-7777-4777-a777-777777777777',
      name: 'Day camp',
      description: null,
    },
    checks: [
      {
        id: '88888888-8888-4888-a888-888888888888',
        requirement_id: '99999999-9999-4999-a999-999999999999',
        sort_order: 1,
        check_type: 'payment',
        participant_check_label: 'Payment',
        status: 'pending',
      },
      {
        id: 'aaaaaaaa-bbbb-4ccc-addd-eeeeeeeeeeee',
        requirement_id: 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb',
        sort_order: 2,
        check_type: 'referee',
        participant_check_label: 'Referee approval',
        status: 'satisfied',
      },
    ],
  };

  it('parses a valid BA05-shaped payload', () => {
    const r = parseApplicationProgressPayload(validPayload);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.application.status).toBe('under_review');
    expect(r.data.checks).toHaveLength(2);
    expect(r.data.checks[0].status).toBe('pending');
    expect(r.data.checks[1].status).toBe('satisfied');
  });

  it('rejects extra root keys', () => {
    const r = parseApplicationProgressPayload({ ...validPayload, extra: true });
    expect(r.ok).toBe(false);
  });

  it('rejects missing application keys', () => {
    const { referee_name: _r, ...app } = validPayload.application;
    void _r;
    const r = parseApplicationProgressPayload({ ...validPayload, application: app });
    expect(r.ok).toBe(false);
  });

  it('rejects invalid check status', () => {
    const bad = {
      ...validPayload,
      checks: [{ ...validPayload.checks[0], status: 'unknown' }],
    };
    const r = parseApplicationProgressPayload(bad);
    expect(r.ok).toBe(false);
  });

  it('rejects application objects that include sensitive keys', () => {
    const r = parseApplicationProgressPayload({
      ...validPayload,
      application: { ...validPayload.application, token_hash: 'secret' },
    });
    expect(r.ok).toBe(false);
  });

  it('detects access denied marker in messages', () => {
    expect(isApplicationProgressAccessDenied('base_application_access_denied')).toBe(true);
    expect(isApplicationProgressAccessDenied('Error: base_application_access_denied')).toBe(true);
    expect(isApplicationProgressAccessDenied('validation_error')).toBe(false);
  });

  it('documents sensitive keys for consumer tests', () => {
    expect(SENSITIVE_PROGRESS_KEYS).toContain('token_hash');
    expect(SENSITIVE_PROGRESS_KEYS).toContain('referee_person_id');
    expect(APPLICATION_PROGRESS_ACCESS_DENIED_MARKER).toBe('base_application_access_denied');
  });
});
