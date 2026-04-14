import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, FileUpload } from '@solvera/pace-core/components';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { toSupabaseClientLike } from '@/lib/supabase-typed';
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
  userId: string;
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
  userId,
}: PhotoUploadDialogProps) {
  const secure = useSecureSupabase();
  const supabase = toSupabaseClientLike(secure);
  const queryClient = useQueryClient();
  const dialogRef = useRef<HTMLDialogElement>(null);

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
        <FileUpload
          supabase={supabase}
          table_name="core_person"
          record_id={personId}
          organisation_id={organisationId}
          app_id={appId}
          category={PROFILE_PHOTO_CATEGORY}
          folder={PROFILE_PHOTO_FOLDER}
          pageContext={PROFILE_PHOTO_PAGE_CONTEXT}
          userId={userId}
          accept="image/jpeg,image/png,image/webp"
          maxSize={PROFILE_PHOTO_MAX_BYTES}
          multiple={false}
          label="Choose image"
          onUploadSuccess={() => {
            void queryClient.invalidateQueries({ queryKey: ['enhancedLanding'] });
            void queryClient.invalidateQueries({ queryKey: ['profilePhoto'] });
            onOpenChange(false);
          }}
        />
        <footer className="grid justify-items-end">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </footer>
      </article>
    </dialog>
  );
}
