import { ACTION_PLAN_MAX_BYTES } from '@/constants/fileUpload';

/** Re-export for tests and call sites that import validation only. */
export { ACTION_PLAN_MAX_BYTES };

export const ACTION_PLAN_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type ActionPlanFileValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function validateActionPlanFile(file: File): ActionPlanFileValidationResult {
  const type = file.type?.trim() ?? '';
  if (type && !ACTION_PLAN_ALLOWED_MIME_TYPES.includes(type as (typeof ACTION_PLAN_ALLOWED_MIME_TYPES)[number])) {
    return {
      ok: false,
      message: 'Use a PDF or image file (JPEG, PNG, or WebP).',
    };
  }
  if (!type) {
    return {
      ok: false,
      message: 'Could not detect file type. Use a PDF or image file (JPEG, PNG, or WebP).',
    };
  }
  if (file.size > ACTION_PLAN_MAX_BYTES) {
    return {
      ok: false,
      message: 'File is too large. Maximum size is 10 MB.',
    };
  }
  return { ok: true };
}
