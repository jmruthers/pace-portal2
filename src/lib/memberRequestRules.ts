/**
 * PR22 — Participant-facing RPC error mapping for member request submit.
 */
import type { MemberRequestPreSubmitFailureCode } from '@/lib/validateMemberRequestPreSubmit';

export type MemberRequestRpcErrorCode =
  | 'MEMBER_REQUEST_ACCESS_DENIED'
  | 'MEMBER_REQUEST_DUPLICATE'
  | 'MEMBER_REQUEST_VALIDATION'
  | 'MEMBER_REQUEST_RPC_FAILED'
  | 'MEMBER_REQUEST_SHAPE';

export function mapMemberRequestRpcMessage(message: string): {
  code: MemberRequestRpcErrorCode;
  participantMessage: string;
} {
  const m = message.trim().toLowerCase();
  if (
    m.includes('duplicate') ||
    m.includes('pending') ||
    m.includes('already') ||
    m.includes('23505')
  ) {
    return {
      code: 'MEMBER_REQUEST_DUPLICATE',
      participantMessage:
        'You already have a pending request for this organisation. Wait for a decision before submitting again.',
    };
  }
  if (
    m.includes('access') ||
    m.includes('denied') ||
    m.includes('permission') ||
    m.includes('authorization')
  ) {
    return {
      code: 'MEMBER_REQUEST_ACCESS_DENIED',
      participantMessage: 'You do not have permission to submit this request.',
    };
  }
  if (m.includes('age') || m.includes('ineligib')) {
    return {
      code: 'MEMBER_REQUEST_VALIDATION',
      participantMessage: 'The selected membership type is not available for your age.',
    };
  }
  if (m.includes('profile') || m.includes('complete')) {
    return {
      code: 'MEMBER_REQUEST_VALIDATION',
      participantMessage: 'Complete your member profile before submitting a request.',
    };
  }
  return {
    code: 'MEMBER_REQUEST_RPC_FAILED',
    participantMessage: message.trim() || 'Could not submit your request. Try again later.',
  };
}

export function preSubmitFailureMessage(code: MemberRequestPreSubmitFailureCode): string {
  switch (code) {
    case 'PROFILE_INCOMPLETE':
      return 'Complete your member profile before requesting to join an organisation.';
    case 'DUPLICATE_REQUEST':
      return 'You already have a pending or on-hold request for this organisation.';
    case 'AGE_INELIGIBLE':
      return 'The selected membership type is not available for your age.';
    case 'TRANSFER_SOURCE_REQUIRED':
      return 'Select the organisation you are leaving before submitting a transfer.';
    default:
      return 'This request cannot be submitted right now.';
  }
}
