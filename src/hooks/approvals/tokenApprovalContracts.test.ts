import { describe, expect, it } from 'vitest';
import {
  BA07_ERROR_MESSAGES,
  checkTypeHeading,
  isParticipantSafeTerminalResolveMessage,
  isParticipantSafeTerminalSubmitLookupMessage,
  parseResolvePayload,
  parseSubmitPayload,
} from '@/hooks/approvals/tokenApprovalContracts';

const validResolve = {
  check_id: '11111111-1111-4111-8111-111111111111',
  application_id: '22222222-2222-4222-8222-222222222222',
  requirement_id: '33333333-3333-4333-8333-333333333333',
  expires_at: null,
  check_type: 'referee',
  event_title: 'Summer Camp',
  registration_type_name: 'Youth',
  applicant_display_name: 'Alex Member',
};

describe('tokenApprovalContracts (PR20 BA07)', () => {
  it('parseResolvePayload accepts a valid shape', () => {
    const r = parseResolvePayload(validResolve);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.event_title).toBe('Summer Camp');
  });

  it('parseResolvePayload rejects extra keys', () => {
    expect(parseResolvePayload({ ...validResolve, extra: true }).ok).toBe(false);
  });

  it('parseSubmitPayload accepts satisfied outcome', () => {
    const r = parseSubmitPayload({
      check_id: validResolve.check_id,
      previous_status: 'pending',
      new_status: 'satisfied',
    });
    expect(r.ok).toBe(true);
  });

  it('parseSubmitPayload rejects invalid new_status', () => {
    expect(
      parseSubmitPayload({
        check_id: validResolve.check_id,
        previous_status: 'pending',
        new_status: 'unknown',
      }).ok
    ).toBe(false);
  });

  it('maps check types to participant headings', () => {
    expect(checkTypeHeading('guardian_approval')).toMatch(/guardian/i);
    expect(checkTypeHeading('referee')).toMatch(/referee/i);
    expect(checkTypeHeading('other')).toMatch(/approval request/i);
  });

  it('identifies participant-safe terminal resolve messages', () => {
    expect(isParticipantSafeTerminalResolveMessage(BA07_ERROR_MESSAGES.TOKEN_REQUIRED)).toBe(true);
    expect(isParticipantSafeTerminalResolveMessage('random')).toBe(false);
  });

  it('identifies participant-safe terminal submit lookup messages', () => {
    expect(isParticipantSafeTerminalSubmitLookupMessage(BA07_ERROR_MESSAGES.INVALID_EXPIRED_OR_USED)).toBe(
      true
    );
  });
});
