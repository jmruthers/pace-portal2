import { useMemo, useState } from 'react';
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
};

/**
 * Circular avatar via pace-core FileDisplay (PR03); upload via FileUpload in PhotoUploadDialog.
 */
export function ProfilePhotoUpload({ person, organisationId, appId }: ProfilePhotoUploadProps) {
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

  return (
    <>
      <section className="grid place-items-center gap-2" aria-label="Profile photo">
        {/* Presentational avatar frame; not body copy (Standard 7 semantic rule exception). */}
        {/* eslint-disable-next-line pace-core-compliance/prefer-semantic-html -- circular crop for photo/initials */}
        <span className="grid h-24 w-24 place-items-center overflow-hidden rounded-full border border-sec-200 bg-sec-100">
          {busy ? <span aria-busy="true">…</span> : null}
          {!busy && displayUrl ? (
            <img
              key={latestRef?.id ?? 'preview'}
              src={displayUrl}
              alt="Profile photo"
              className="h-full w-full object-cover"
            />
          ) : null}
          {showInitials ? <span aria-hidden="true">{label}</span> : null}
        </span>
        {effectiveAppId && user?.id ? (
          <Button type="button" variant="secondary" onClick={() => setDialogOpen(true)}>
            Change photo
          </Button>
        ) : null}
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
