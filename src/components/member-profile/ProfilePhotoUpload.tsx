import { useMemo, useState, type ReactNode } from 'react';
import type { FileUploadResult } from '@solvera/pace-core/types';
import { Button } from '@solvera/pace-core/components';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import type { FileReference } from '@solvera/pace-core/types';
import { useFileDisplay } from '@solvera/pace-core/hooks';
import { useStorageCapableClient } from '@solvera/pace-core/rbac';
import { toFileMetadata } from '@/lib/fileMetadata';
import type { Database } from '@/types/pace-database';
import { FILE_STORAGE_BUCKET } from '@/constants/fileStorage';
import { useProfilePhotoFileRows } from '@/shared/hooks/useProfilePhotoFileRows';
import { useResolvedAppId } from '@/shared/hooks/useResolvedAppId';
import { PhotoUploadDialog } from '@/components/member-profile/PhotoUploadDialog';

type PersonRow = Database['public']['Tables']['core_person']['Row'];

function ProfilePhotoChangeButton({
  children,
  onOpenDialog,
}: {
  children: ReactNode;
  onOpenDialog: () => void;
}) {
  return (
    <section className="group relative grid size-50 shrink-0 overflow-hidden rounded-full border border-sec-200 bg-sec-100">
      <Button
        type="button"
        variant="ghost"
        className="grid h-full w-full p-0"
        aria-label="Change photo"
        onClick={onOpenDialog}
      >
        {children}
      </Button>
      <small
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 grid content-center justify-center rounded-full bg-main-50/70 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        Change photo
      </small>
    </section>
  );
}

function initialsFromPerson(person: PersonRow): string {
  const a = person.first_name?.trim().charAt(0) ?? '';
  const b = person.last_name?.trim().charAt(0) ?? '';
  const s = `${a}${b}`.trim();
  return s.length > 0 ? s.toUpperCase() : '?';
}

function mapToFileReference(
  row: {
    id: string;
    file_path: string;
    file_metadata: unknown;
    is_public: boolean;
    created_at: string;
    app_id: string | null;
  },
  personId: string,
  organisationId: string | null,
  fallbackAppId: string
): FileReference {
  const file_metadata = toFileMetadata(row.file_metadata, {
    fileName: 'profile',
    fileType: 'image/jpeg',
  });

  return {
    id: row.id,
    table_name: 'core_person',
    record_id: personId,
    file_path: row.file_path,
    file_metadata,
    organisation_id: organisationId,
    app_id: row.app_id?.trim() || fallbackAppId,
    is_public: row.is_public,
    created_at: row.created_at,
    updated_at: row.created_at,
  };
}

export type ProfilePhotoUploadProps = {
  person: PersonRow;
  organisationId: string | null;
  appId: string | null;
  /** Layout classes from {@link ContactSummaryCard} (e.g. column height). */
  className?: string;
};

/**
 * Contact-card profile photo (PR03): full-height circular avatar rail on the right; upload via PhotoUploadDialog.
 */
export function ProfilePhotoUpload({
  person,
  organisationId,
  appId,
  className,
}: ProfilePhotoUploadProps) {
  const { user } = useUnifiedAuthContext();
  const storageClient = useStorageCapableClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadedPreview, setUploadedPreview] = useState<{
    url: string;
    personId: string;
    organisationId: string | null;
  } | null>(null);

  const effectiveAppId = useResolvedAppId() || appId || '';
  const { data: photoRows, isLoading: photoRowsLoading } = useProfilePhotoFileRows(
    person.id,
    organisationId
  );

  const uploadedPreviewUrl =
    uploadedPreview?.personId === person.id && uploadedPreview.organisationId === organisationId
      ? uploadedPreview.url
      : null;

  const latestRef = useMemo((): FileReference | null => {
    if (!photoRows?.length) return null;
    const sorted = [...photoRows].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const row = sorted[0];
    return mapToFileReference(row, person.id, organisationId, effectiveAppId);
  }, [effectiveAppId, organisationId, person.id, photoRows]);

  const { url: resolvedUrl, isLoading: urlLoading } = useFileDisplay(latestRef, {
    client: storageClient,
    bucket: FILE_STORAGE_BUCKET,
  });
  const displayUrl = uploadedPreviewUrl ?? resolvedUrl;

  const handleUploaded = (result: FileUploadResult) => {
    const immediate = result.signed_url ?? result.file_url;
    if (immediate) {
      setUploadedPreview({ url: immediate, personId: person.id, organisationId });
    }
  };

  const label = initialsFromPerson(person);
  const busy = photoRowsLoading || (Boolean(latestRef) && urlLoading && !displayUrl);
  const showInitials = !busy && !displayUrl;
  const canChangePhoto = Boolean(effectiveAppId && user?.id);

  const avatarFrame = (
    <>
      {busy ? (
        <output className="grid h-full content-center justify-center" aria-busy="true">
          …
        </output>
      ) : null}
      {!busy && displayUrl ? (
        <img
          key={latestRef?.id ?? 'preview'}
          src={displayUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : null}
      {showInitials ? (
        <strong className="grid h-full content-center justify-center" aria-hidden="true">
          {label}
        </strong>
      ) : null}
    </>
  );

  return (
    <>
      <section
        className={`grid h-full min-h-0 content-start justify-items-center py-2 pe-3 ps-2${className ? ` ${className}` : ''}`}
        aria-label="Profile photo"
      >
        {canChangePhoto ? (
          <ProfilePhotoChangeButton onOpenDialog={() => setDialogOpen(true)}>
            {avatarFrame}
          </ProfilePhotoChangeButton>
        ) : (
          <section
            aria-label="Profile photo preview"
            className="grid size-50 shrink-0 content-center justify-center overflow-hidden rounded-full border border-sec-200 bg-sec-100"
          >
            {avatarFrame}
          </section>
        )}
      </section>
      {effectiveAppId && user?.id ? (
        <PhotoUploadDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          personId={person.id}
          organisationId={organisationId}
          appId={effectiveAppId}
          onUploaded={handleUploaded}
        />
      ) : null}
    </>
  );
}
