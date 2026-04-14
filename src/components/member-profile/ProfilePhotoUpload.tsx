import { useMemo, useState } from 'react';
import { Button } from '@solvera/pace-core/components';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { useFileDisplay } from '@solvera/pace-core/hooks';
import type { FileMetadata, FileReference } from '@solvera/pace-core/types';
import type { Database } from '@/types/pace-database';
import { toSupabaseClientLike } from '@/lib/supabase-typed';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
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
  },
  personId: string,
  organisationId: string | null,
  appId: string
): FileReference {
  const meta = row.file_metadata;
  const file_metadata: FileMetadata =
    meta !== null && typeof meta === 'object' && !Array.isArray(meta)
      ? ({
          fileName: 'profile',
          fileType: 'image/jpeg',
          ...(meta as Record<string, unknown>),
        } as FileMetadata)
      : { fileName: 'profile', fileType: 'image/jpeg' };

  return {
    id: row.id,
    table_name: 'core_person',
    record_id: personId,
    file_path: row.file_path,
    file_metadata,
    organisation_id: organisationId,
    app_id: appId,
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
 * Circular avatar with initials fallback or file URL via useFileDisplay; opens upload dialog.
 */
export function ProfilePhotoUpload({ person, organisationId, appId }: ProfilePhotoUploadProps) {
  const { user } = useUnifiedAuthContext();
  const secure = useSecureSupabase();
  const storageClient = toSupabaseClientLike(secure);
  const [dialogOpen, setDialogOpen] = useState(false);

  const effectiveAppId = useResolvedAppId() || appId || '';
  const { data: photoRows } = useProfilePhotoFileRows(person.id, organisationId, Boolean(effectiveAppId));

  const latestRef = useMemo((): FileReference | null => {
    if (!photoRows?.length || !effectiveAppId) return null;
    const sorted = [...photoRows].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const row = sorted[0];
    return mapToFileReference(row, person.id, organisationId, effectiveAppId);
  }, [effectiveAppId, organisationId, person.id, photoRows]);

  const { url, isLoading } = useFileDisplay(latestRef, { client: storageClient });

  const label = initialsFromPerson(person);

  return (
    <>
      <section className="grid place-items-center gap-2" aria-label="Profile photo">
        {/* Presentational avatar frame; not body copy (Standard 7 semantic rule exception). */}
        {/* eslint-disable-next-line pace-core-compliance/prefer-semantic-html -- circular crop for photo/initials */}
        <span className="grid h-24 w-24 place-items-center overflow-hidden rounded-full border border-sec-200 bg-sec-100">
          {isLoading ? <span aria-busy="true">…</span> : null}
          {!isLoading && url ? (
            <img src={url} alt="Profile photo" className="h-full w-full object-cover" />
          ) : null}
          {!isLoading && !url ? <span aria-hidden="true">{label}</span> : null}
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
          userId={user.id}
        />
      ) : null}
    </>
  );
}
