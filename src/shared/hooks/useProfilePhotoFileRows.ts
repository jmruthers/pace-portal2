import { useQuery } from '@tanstack/react-query';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { PROFILE_PHOTO_CATEGORY } from '@/constants/fileUpload';

/** Legacy metadata category (plural) still present on older rows. */
const PROFILE_PHOTO_CATEGORY_LEGACY_PLURAL = 'profile_photos';
import { toTypedSupabase } from '@/lib/supabase-typed';

type PhotoRow = {
  id: string;
  file_path: string;
  file_metadata: unknown;
  is_public: boolean;
  created_at: string;
  app_id: string | null;
};

/** Legacy uploads used uppercase category before canonical `profile_photo`. */
const PROFILE_PHOTO_CATEGORY_LEGACY = 'PROFILE_PHOTOS';

function isProfilePhotoCategory(metadata: unknown): boolean {
  if (metadata === null || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return false;
  }
  const category = (metadata as Record<string, unknown>).category;
  return (
    category === PROFILE_PHOTO_CATEGORY ||
    category === PROFILE_PHOTO_CATEGORY_LEGACY ||
    category === PROFILE_PHOTO_CATEGORY_LEGACY_PLURAL
  );
}

/**
 * Latest profile photo file rows for `core_person` (by category), for dashboard avatar.
 * Uses table SELECT + RLS (same pattern as PR14 {@link useFileReferences}).
 * Does not depend on app id resolution — only on secure client + person scope.
 */
export function useProfilePhotoFileRows(personId: string | null, organisationId: string | null) {
  const { user } = useUnifiedAuthContext();
  const secure = useSecureSupabase();
  const client = toTypedSupabase(secure);

  return useQuery({
    queryKey: ['profilePhoto', 'v3', personId, organisationId, user?.id],
    enabled: Boolean(client && personId && user?.id),
    queryFn: async () => {
      if (!client || !personId) return [] as PhotoRow[];

      const refsRes = await client
        .from('core_file_references')
        .select('id, file_path, file_metadata, is_public, created_at, app_id')
        .eq('table_name', 'core_person')
        .eq('record_id', personId)
        .order('created_at', { ascending: false });

      if (refsRes.error) {
        throw refsRes.error;
      }

      return ((refsRes.data ?? []) as PhotoRow[]).filter((row) =>
        isProfilePhotoCategory(row.file_metadata)
      );
    },
  });
}
