import { useQuery } from '@tanstack/react-query';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { PROFILE_PHOTO_CATEGORY } from '@/constants/fileUpload';

type PhotoRow = {
  id: string;
  file_path: string;
  file_metadata: unknown;
  is_public: boolean;
  created_at: string;
};

/** Legacy uploads used uppercase category before canonical `profile_photo`. */
const PROFILE_PHOTO_CATEGORY_LEGACY = 'PROFILE_PHOTOS';

/**
 * Latest profile photo file rows for `core_person` (by category), for dashboard avatar.
 */
export function useProfilePhotoFileRows(
  personId: string | null,
  organisationId: string | null,
  enabled: boolean
) {
  const { user } = useUnifiedAuthContext();
  const secure = useSecureSupabase();

  return useQuery({
    queryKey: ['profilePhoto', personId, organisationId, user?.id],
    enabled: Boolean(secure && personId && user?.id && enabled),
    queryFn: async () => {
      if (!secure || !user?.id || !personId) return [] as PhotoRow[];
      const listForCategory = async (org: string | undefined, category: string) =>
        (await secure.rpc('data_file_reference_by_category_list', {
          p_category: category,
          p_record_id: personId,
          p_table_name: 'core_person',
          p_organisation_id: org,
          p_user_id: user.id,
        })) as { data: unknown; error: Error | null };

      const list = async (org: string | undefined) => {
        for (const cat of [PROFILE_PHOTO_CATEGORY, PROFILE_PHOTO_CATEGORY_LEGACY]) {
          const res = await listForCategory(org, cat);
          if (res.error) throw res.error;
          const rows = (res.data ?? []) as PhotoRow[];
          if (rows.length > 0) return rows;
        }
        return [] as PhotoRow[];
      };

      const primary = await list(organisationId ?? undefined);
      if (primary.length > 0 || !organisationId) {
        return primary;
      }
      return list(undefined);
    },
  });
}
