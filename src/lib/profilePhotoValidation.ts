import type { ApiResult } from '@solvera/pace-core/types';
import { err, ok } from '@solvera/pace-core/types';
import {
  PROFILE_PHOTO_ACCEPT,
  PROFILE_PHOTO_MAX_BYTES,
} from '@/constants/fileUpload';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** Validates a single profile image file before upload (PR03). */
export function validateProfileImageFile(file: File): ApiResult<File> {
  if (file.size > PROFILE_PHOTO_MAX_BYTES) {
    return err({
      code: 'PROFILE_PHOTO_TOO_LARGE',
      message: 'Image must be 5 MB or smaller.',
    });
  }
  if (!ALLOWED.has(file.type)) {
    return err({
      code: 'PROFILE_PHOTO_TYPE',
      message: 'Use JPG, PNG, or WebP only.',
    });
  }
  return ok(file);
}

export function isAcceptedProfileImageType(mime: string): boolean {
  return ALLOWED.has(mime);
}

export { PROFILE_PHOTO_ACCEPT, PROFILE_PHOTO_MAX_BYTES };
