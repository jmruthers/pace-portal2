import { describe, expect, it } from 'vitest';
import { mapMemberRequestRpcMessage, preSubmitFailureMessage } from '@/lib/memberRequestRules';

describe('mapMemberRequestRpcMessage (PR22 RPC errors)', () => {
  it('maps duplicate / pending / unique violation to MEMBER_REQUEST_DUPLICATE', () => {
    expect(mapMemberRequestRpcMessage('duplicate key').code).toBe('MEMBER_REQUEST_DUPLICATE');
    expect(mapMemberRequestRpcMessage('request already pending').participantMessage).toMatch(
      /pending request/i
    );
    expect(mapMemberRequestRpcMessage('23505 unique_violation').code).toBe('MEMBER_REQUEST_DUPLICATE');
  });

  it('maps access / permission errors to MEMBER_REQUEST_ACCESS_DENIED', () => {
    const r = mapMemberRequestRpcMessage('access denied for this organisation');
    expect(r.code).toBe('MEMBER_REQUEST_ACCESS_DENIED');
    expect(r.participantMessage).toMatch(/permission/i);
  });

  it('maps age / ineligibility to MEMBER_REQUEST_VALIDATION', () => {
    const r = mapMemberRequestRpcMessage('age ineligible for membership type');
    expect(r.code).toBe('MEMBER_REQUEST_VALIDATION');
    expect(r.participantMessage).toMatch(/age/i);
  });

  it('maps profile / complete hints to MEMBER_REQUEST_VALIDATION', () => {
    const r = mapMemberRequestRpcMessage('profile must be complete');
    expect(r.code).toBe('MEMBER_REQUEST_VALIDATION');
    expect(r.participantMessage).toMatch(/profile/i);
  });

  it('falls back to MEMBER_REQUEST_RPC_FAILED with message passthrough', () => {
    const r = mapMemberRequestRpcMessage('Upstream timeout');
    expect(r.code).toBe('MEMBER_REQUEST_RPC_FAILED');
    expect(r.participantMessage).toBe('Upstream timeout');
  });

  it('uses generic copy when RPC message is empty', () => {
    const r = mapMemberRequestRpcMessage('   ');
    expect(r.code).toBe('MEMBER_REQUEST_RPC_FAILED');
    expect(r.participantMessage).toMatch(/try again/i);
  });
});

describe('preSubmitFailureMessage (PR22 pre-submit guard)', () => {
  it('maps PROFILE_INCOMPLETE', () => {
    expect(preSubmitFailureMessage('PROFILE_INCOMPLETE')).toMatch(/profile/i);
  });

  it('maps DUPLICATE_REQUEST', () => {
    expect(preSubmitFailureMessage('DUPLICATE_REQUEST')).toMatch(/pending/i);
  });

  it('maps AGE_INELIGIBLE', () => {
    expect(preSubmitFailureMessage('AGE_INELIGIBLE')).toMatch(/age/i);
  });

  it('maps TRANSFER_SOURCE_REQUIRED', () => {
    expect(preSubmitFailureMessage('TRANSFER_SOURCE_REQUIRED')).toMatch(/leaving/i);
  });
});
