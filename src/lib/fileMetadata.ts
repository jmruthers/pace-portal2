import type { FileMetadata } from '@solvera/pace-core/types';
import { FILE_STORAGE_BUCKET } from '@/constants/fileStorage';

/** Normalises DB or fallback metadata to pace-core {@link FileMetadata}. */
export function toFileMetadata(
  meta: unknown,
  fallback: Pick<FileMetadata, 'fileName' | 'fileType'>
): FileMetadata {
  if (meta !== null && typeof meta === 'object' && !Array.isArray(meta)) {
    const record = meta as Record<string, unknown>;
    return {
      ...record,
      fileName: String(record.fileName ?? fallback.fileName),
      fileType: String(record.fileType ?? fallback.fileType),
      bucket: String(record.bucket ?? FILE_STORAGE_BUCKET),
    } as FileMetadata;
  }
  return { ...fallback, bucket: FILE_STORAGE_BUCKET };
}
