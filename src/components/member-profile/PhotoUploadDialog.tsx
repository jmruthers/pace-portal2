import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogTitle,
  FileUpload,
} from '@solvera/pace-core/components';
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
  const [uploadError, setUploadError] = useState<string | null>(null);
  const canUpload = Boolean(organisationId && appId.trim() !== '' && supabase);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setUploadError(null);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogContent className="w-full max-w-lg">
          <DialogHeader>
            <DialogTitle>Update profile photo</DialogTitle>
          </DialogHeader>
          <DialogBody className="grid gap-4">
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
          </DialogBody>
          <DialogFooter className="text-right">
            <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
