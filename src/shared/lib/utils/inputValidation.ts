import type { ApiResult } from '@solvera/pace-core/types';
import { err, ok } from '@solvera/pace-core/types';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

/** RFC 4122 UUID (any version). */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safePublicMessage(message: string): string {
  return message.replace(/[\r\n]+/g, ' ').slice(0, 200);
}

/** Validates URL path slugs used in routes (e.g. event slug). */
export function validateSlug(value: string | null | undefined): ApiResult<string> {
  if (value == null || value === '') {
    return err({ code: 'VALIDATION_SLUG_EMPTY', message: 'A value is required.' });
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 200) {
    return err({ code: 'VALIDATION_SLUG_LENGTH', message: 'That value is not valid.' });
  }
  if (!SLUG_PATTERN.test(trimmed)) {
    return err({ code: 'VALIDATION_SLUG_FORMAT', message: 'That value is not valid.' });
  }
  return ok(trimmed);
}

/** Validates UUID strings for IDs used in URLs and payloads. */
export function validateUuid(value: string | null | undefined): ApiResult<string> {
  if (value == null || value === '') {
    return err({ code: 'VALIDATION_UUID_EMPTY', message: 'An identifier is required.' });
  }
  const trimmed = value.trim();
  if (!UUID_PATTERN.test(trimmed)) {
    return err({ code: 'VALIDATION_UUID_FORMAT', message: 'That identifier is not valid.' });
  }
  return ok(trimmed.toLowerCase());
}

/**
 * Allows only same-origin relative redirects (`/path`), blocking protocols and `//`.
 */
export function validateSafeRedirect(
  value: string | null | undefined
): ApiResult<string> {
  if (value == null || value === '') {
    return err({ code: 'VALIDATION_REDIRECT_EMPTY', message: 'A destination is required.' });
  }
  const trimmed = value.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return err({ code: 'VALIDATION_REDIRECT_UNSAFE', message: 'That destination is not allowed.' });
  }
  if (trimmed.includes('://') || trimmed.includes('\\')) {
    return err({ code: 'VALIDATION_REDIRECT_UNSAFE', message: 'That destination is not allowed.' });
  }
  if (trimmed.length > 2048) {
    return err({ code: 'VALIDATION_REDIRECT_LENGTH', message: 'That destination is not allowed.' });
  }
  return ok(trimmed);
}

/** Normalises unknown errors into ApiResult failure with a safe message (no stack leakage). */
export function sanitiseToApiResult<T>(
  error: unknown,
  code: string,
  fallbackMessage: string
): ApiResult<T> {
  if (error !== null && typeof error === 'object' && 'message' in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === 'string' && m.length > 0) {
      return err({ code, message: safePublicMessage(m) });
    }
  }
  return err({ code, message: fallbackMessage });
}
