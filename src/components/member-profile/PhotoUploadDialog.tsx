import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle, Button, FileUpload } from '@solvera/pace-core/components';
import { clearFileDisplayCache } from '@solvera/pace-core/hooks';
import type { FileUploadResult } from '@solvera/pace-core/types';
import { useStorageCapableClient } from '@solvera/pace-core/rbac';
import { NormalizeSupabaseError } from '@solvera/pace-core/utils';
import { FILE_STORAGE_BUCKET, FILE_UPLOAD_NO_EVENT_ID } from '@/constants/fileStorage';
import {
  PROFILE_PHOTO_CATEGORY,
  PROFILE_PHOTO_FOLDER,
  PROFILE_PHOTO_MAX_BYTES,
  PROFILE_PHOTO_PAGE_CONTEXT,
} from '@/constants/fileUpload';
import { PhotoGuidelines } from '@/components/member-profile/PhotoGuidelines';

export type PhotoUploadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personId: string;
  organisationId: string | null;
  appId: string;
  onUploaded?: (result: FileUploadResult) => void;
};

/**
 * Authenticated profile photo upload using pace-core FileUpload (PR03).
 */
export function PhotoUploadDialog({
  open,
  onOpenChange,
  personId,
  organisationId,
  appId,
  onUploaded,
}: PhotoUploadDialogProps) {
  const supabase = useStorageCapableClient();
  const queryClient = useQueryClient();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const canUpload = Boolean(organisationId && appId.trim() !== '' && supabase);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setUploadError(null);
    }
    onOpenChange(next);
  };

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open) {
      if (!d.open) d.showModal();
    } else if (d.open) {
      d.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 max-h-screen w-full max-w-none border-0 bg-main-950/40 p-4 backdrop:bg-main-950/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <article className="mx-auto grid max-h-[90vh] w-full max-w-lg gap-4 overflow-y-auto rounded-lg border border-sec-200 bg-background p-4 shadow-lg">
        <header>
          <h2>Update profile photo</h2>
        </header>
        <PhotoGuidelines />
        {uploadError ? (
          <Alert variant="destructive">
            <AlertTitle>Upload failed</AlertTitle>
            <AlertDescription>{uploadError}</AlertDescription>
          </Alert>
        ) : null}
        {!canUpload ? (
          <Alert variant="destructive">
            <AlertTitle>Upload unavailable</AlertTitle>
            <AlertDescription>
              Select an organisation in the header and wait for the app to finish loading, then try
              again.
            </AlertDescription>
          </Alert>
        ) : (
          <FileUpload
            supabase={supabase}
            bucket={FILE_STORAGE_BUCKET}
            table_name="core_person"
            record_id={personId}
            organisation_id={organisationId as string}
            event_id={FILE_UPLOAD_NO_EVENT_ID}
            app_id={appId}
            category={PROFILE_PHOTO_CATEGORY}
            folder={PROFILE_PHOTO_FOLDER}
            pageContext={PROFILE_PHOTO_PAGE_CONTEXT}
            accept="image/jpeg,image/png,image/webp"
            maxSize={PROFILE_PHOTO_MAX_BYTES}
            multiple={false}
            label="Choose image"
            disabled={!canUpload}
            onUploadError={(error) => {
              const { message } = NormalizeSupabaseError(
                error,
                'Could not upload the image. Try again or contact support.'
              );
              setUploadError(message);
            }}
            onUploadSuccess={(result) => {
              setUploadError(null);
              clearFileDisplayCache();
              onUploaded?.(result);
              void queryClient.refetchQueries({ queryKey: ['profilePhoto'] });
              void queryClient.invalidateQueries({ queryKey: ['enhancedLanding'] });
              handleOpenChange(false);
            }}
          />
        )}
        <footer className="grid justify-items-end">
          <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
        </footer>
      </article>
    </dialog>
  );
}
