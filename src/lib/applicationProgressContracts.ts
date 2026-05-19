/**
 * BA05b — Participant application progress RPC payload parsing (participant-safe subset).
 */
import { isOk } from '@solvera/pace-core/types';
import { validateUuid } from '@/shared/lib/utils/inputValidation';

export const APPLICATION_PROGRESS_ACCESS_DENIED_MARKER = 'base_application_access_denied';

/** Keys BA05b §6.4 / §7.3 must never appear in serialised progress JSON (consumer test surface). */
export const SENSITIVE_PROGRESS_KEYS = [
  'token_hash',
  'token_expires_at',
  'carer_person_id',
  'referee_person_id',
  'actioned_by',
  'actioned_at',
  'notes',
  'created_at',
  'updated_at',
  'created_by',
  'updated_by',
  'status_updated_at',
  'status_updated_by',
] as const;

export type ApplicationProgressCheckStatus = 'pending' | 'satisfied' | 'failed' | 'waived';

export type ApplicationProgressApplication = {
  id: string;
  event_id: string;
  organisation_id: string;
  person_id: string;
  registration_type_id: string;
  form_id: string | null;
  referee_name: string | null;
  status: string;
  submitted_at: string | null;
};

export type ApplicationProgressRegistrationType = {
  id: string;
  name: string;
  description: string | null;
};

export type ApplicationProgressCheckRow = {
  id: string;
  requirement_id: string;
  sort_order: number;
  check_type: string;
  participant_check_label: string;
  status: ApplicationProgressCheckStatus;
};

export type ApplicationProgressPayload = {
  application: ApplicationProgressApplication;
  registration_type: ApplicationProgressRegistrationType;
  checks: ApplicationProgressCheckRow[];
};

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && isOk(validateUuid(value));
}

const CHECK_STATUSES: ApplicationProgressCheckStatus[] = ['pending', 'satisfied', 'failed', 'waived'];

function isCheckStatus(v: unknown): v is ApplicationProgressCheckStatus {
  return typeof v === 'string' && (CHECK_STATUSES as readonly string[]).includes(v);
}

const APPLICATION_KEYS: (keyof ApplicationProgressApplication)[] = [
  'id',
  'event_id',
  'organisation_id',
  'person_id',
  'registration_type_id',
  'form_id',
  'referee_name',
  'status',
  'submitted_at',
];

const REG_TYPE_KEYS: (keyof ApplicationProgressRegistrationType)[] = ['id', 'name', 'description'];

const CHECK_KEYS: (keyof ApplicationProgressCheckRow)[] = [
  'id',
  'requirement_id',
  'sort_order',
  'check_type',
  'participant_check_label',
  'status',
];

function hasExactKeys<K extends string>(obj: Record<string, unknown>, keys: readonly K[]): boolean {
  const got = Object.keys(obj);
  if (got.length !== keys.length) return false;
  for (const k of keys) {
    if (!(k in obj)) return false;
  }
  for (const k of got) {
    if (!keys.includes(k as K)) return false;
  }
  return true;
}

function parseApplication(o: unknown): ApplicationProgressApplication | null {
  if (o === null || typeof o !== 'object' || Array.isArray(o)) return null;
  const obj = o as Record<string, unknown>;
  if (!hasExactKeys(obj, APPLICATION_KEYS)) return null;

  const {
    id,
    event_id,
    organisation_id,
    person_id,
    registration_type_id,
    form_id,
    referee_name,
    status,
    submitted_at,
  } = obj;

  if (
    !isUuid(id) ||
    !isUuid(event_id) ||
    !isUuid(organisation_id) ||
    !isUuid(person_id) ||
    !isUuid(registration_type_id)
  ) {
    return null;
  }
  if (form_id !== null && !isUuid(form_id)) return null;
  if (referee_name !== null && typeof referee_name !== 'string') return null;
  if (typeof status !== 'string' || status.trim() === '') return null;
  if (submitted_at !== null && typeof submitted_at !== 'string') return null;

  return {
    id,
    event_id,
    organisation_id,
    person_id,
    registration_type_id,
    form_id: form_id as string | null,
    referee_name: referee_name as string | null,
    status,
    submitted_at,
  };
}

function parseRegistrationType(o: unknown): ApplicationProgressRegistrationType | null {
  if (o === null || typeof o !== 'object' || Array.isArray(o)) return null;
  const obj = o as Record<string, unknown>;
  if (!hasExactKeys(obj, REG_TYPE_KEYS)) return null;
  const { id, name, description } = obj;
  if (!isUuid(id) || typeof name !== 'string' || name.trim() === '') return null;
  if (description !== null && typeof description !== 'string') return null;
  return { id, name, description };
}

function parseCheckRow(o: unknown): ApplicationProgressCheckRow | null {
  if (o === null || typeof o !== 'object' || Array.isArray(o)) return null;
  const obj = o as Record<string, unknown>;
  if (!hasExactKeys(obj, CHECK_KEYS)) return null;
  const { id, requirement_id, sort_order, check_type, participant_check_label, status } = obj;
  if (!isUuid(id) || !isUuid(requirement_id)) return null;
  if (typeof sort_order !== 'number' || !Number.isFinite(sort_order)) return null;
  if (typeof check_type !== 'string' || check_type.trim() === '') return null;
  if (typeof participant_check_label !== 'string' || participant_check_label.trim() === '') return null;
  if (!isCheckStatus(status)) return null;
  return {
    id,
    requirement_id,
    sort_order,
    check_type,
    participant_check_label,
    status,
  };
}

export function parseApplicationProgressPayload(
  data: unknown
): { ok: true; data: ApplicationProgressPayload } | { ok: false } {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false };
  }
  const root = data as Record<string, unknown>;
  const rootKeys = Object.keys(root);
  if (rootKeys.length !== 3 || !('application' in root) || !('registration_type' in root) || !('checks' in root)) {
    return { ok: false };
  }

  const application = parseApplication(root.application);
  const registration_type = parseRegistrationType(root.registration_type);
  if (!application || !registration_type) {
    return { ok: false };
  }

  if (!Array.isArray(root.checks)) {
    return { ok: false };
  }
  const checks: ApplicationProgressCheckRow[] = [];
  for (const row of root.checks) {
    const parsed = parseCheckRow(row);
    if (!parsed) return { ok: false };
    checks.push(parsed);
  }

  return { ok: true, data: { application, registration_type, checks } };
}

export function isApplicationProgressAccessDenied(message: string): boolean {
  return message.includes(APPLICATION_PROGRESS_ACCESS_DENIED_MARKER);
}
