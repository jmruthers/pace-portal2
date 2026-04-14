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
      const r = (await secure.rpc('data_file_reference_by_category_list', {
        p_category: PROFILE_PHOTO_CATEGORY,
        p_record_id: personId,
        p_table_name: 'core_person',
        p_organisation_id: organisationId ?? undefined,
        p_user_id: user.id,
      })) as { data: unknown; error: Error | null };
      if (r.error) throw r.error;
      return (r.data ?? []) as PhotoRow[];
    },
  });
}
