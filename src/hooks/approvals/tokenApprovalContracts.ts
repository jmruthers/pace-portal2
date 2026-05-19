/** BA07 §7 — token approval RPC contracts (pace-portal consumer). */

export const BA07_ERROR_MESSAGES = {
  TOKEN_REQUIRED: 'Token is required',
  INVALID_OR_EXPIRED_TOKEN: 'Invalid or expired token',
  INVALID_EXPIRED_OR_USED: 'Invalid, expired, or already used token',
  OUTCOME_INVALID: 'Outcome must be approve or reject',
  COMMENTS_REQUIRED_FOR_REJECT: 'Comments are required for reject',
} as const;

/** Participant-safe copy for resolve failures and consumed/invalid submit lookup (BA07 §3 portal denial). */
export const TOKEN_APPROVAL_LINK_UNAVAILABLE =
  'This link is no longer available. If you still need to respond, ask the organiser to send a new link.';

export type TokenApprovalResolvePayload = {
  check_id: string;
  application_id: string;
  requirement_id: string;
  expires_at: string | null;
  check_type: string;
  event_title: string;
  registration_type_name: string;
  applicant_display_name: string;
};

export type TokenApprovalSubmitPayload = {
  check_id: string;
  previous_status: string;
  new_status: string;
};

const RESOLVE_KEYS: (keyof TokenApprovalResolvePayload)[] = [
  'check_id',
  'application_id',
  'requirement_id',
  'expires_at',
  'check_type',
  'event_title',
  'registration_type_name',
  'applicant_display_name',
];

const SUBMIT_KEYS: (keyof TokenApprovalSubmitPayload)[] = ['check_id', 'previous_status', 'new_status'];

function isUuidLike(s: unknown): s is string {
  return typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function isNonEmptyString(s: unknown): s is string {
  return typeof s === 'string' && s.length > 0;
}

export function parseResolvePayload(data: unknown): { ok: true; data: TokenApprovalResolvePayload } | { ok: false } {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false };
  }
  const obj = data as Record<string, unknown>;
  const keys = Object.keys(obj);
  if (keys.length !== RESOLVE_KEYS.length) {
    return { ok: false };
  }
  for (const k of RESOLVE_KEYS) {
    if (!(k in obj)) {
      return { ok: false };
    }
  }
  for (const k of keys) {
    if (!RESOLVE_KEYS.includes(k as keyof TokenApprovalResolvePayload)) {
      return { ok: false };
    }
  }

  const {
    check_id,
    application_id,
    requirement_id,
    expires_at,
    check_type,
    event_title,
    registration_type_name,
    applicant_display_name,
  } = obj;

  if (!isUuidLike(check_id) || !isUuidLike(application_id) || !isUuidLike(requirement_id)) {
    return { ok: false };
  }
  if (expires_at !== null && typeof expires_at !== 'string') {
    return { ok: false };
  }
  if (!isNonEmptyString(check_type) || !isNonEmptyString(event_title)) {
    return { ok: false };
  }
  if (!isNonEmptyString(registration_type_name) || !isNonEmptyString(applicant_display_name)) {
    return { ok: false };
  }

  return {
    ok: true,
    data: {
      check_id,
      application_id,
      requirement_id,
      expires_at: expires_at === null ? null : expires_at,
      check_type,
      event_title,
      registration_type_name,
      applicant_display_name,
    },
  };
}

export function parseSubmitPayload(data: unknown): { ok: true; data: TokenApprovalSubmitPayload } | { ok: false } {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false };
  }
  const obj = data as Record<string, unknown>;
  const keys = Object.keys(obj);
  if (keys.length !== SUBMIT_KEYS.length) {
    return { ok: false };
  }
  for (const k of SUBMIT_KEYS) {
    if (!(k in obj)) {
      return { ok: false };
    }
  }
  for (const k of keys) {
    if (!SUBMIT_KEYS.includes(k as keyof TokenApprovalSubmitPayload)) {
      return { ok: false };
    }
  }

  const { check_id, previous_status, new_status } = obj;
  if (!isUuidLike(check_id) || typeof previous_status !== 'string' || typeof new_status !== 'string') {
    return { ok: false };
  }
  if (new_status !== 'satisfied' && new_status !== 'failed') {
    return { ok: false };
  }

  return {
    ok: true,
    data: { check_id, previous_status, new_status },
  };
}

/** Resolve-path messages that must map to a single participant-safe terminal (BA07 §3.5). */
export function isParticipantSafeTerminalResolveMessage(message: string): boolean {
  return (
    message === BA07_ERROR_MESSAGES.TOKEN_REQUIRED || message === BA07_ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN
  );
}

/** Submit lookup / consumed token — same generic terminal copy as resolve failures. */
export function isParticipantSafeTerminalSubmitLookupMessage(message: string): boolean {
  return (
    message === BA07_ERROR_MESSAGES.TOKEN_REQUIRED ||
    message === BA07_ERROR_MESSAGES.INVALID_EXPIRED_OR_USED
  );
}

export function checkTypeHeading(checkType: string): string {
  if (checkType === 'guardian_approval') {
    return 'Guardian approval';
  }
  if (checkType === 'referee') {
    return 'Referee approval';
  }
  return 'Approval request';
}
