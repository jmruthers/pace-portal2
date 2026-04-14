import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResult } from '@solvera/pace-core/types';
import { err, ok } from '@solvera/pace-core/types';
import type { RBACSupabaseClient } from '@solvera/pace-core/rbac';
import type { Database } from '@/types/pace-database';
import { getOrCreateCached } from '@/shared/lib/utils/userDataCache';
import { toTypedSupabase } from '@/lib/supabase-typed';

export type CurrentPersonMember = {
  person: Database['public']['Tables']['core_person']['Row'];
  member: Database['public']['Tables']['core_member']['Row'] | null;
  /** True when the reduced-field fallback path was used (org-scoped primary query did not return a row). */
  usedReducedFieldFallback: boolean;
};

type ReducedPerson = Pick<
  Database['public']['Tables']['core_person']['Row'],
  'id' | 'user_id' | 'first_name' | 'last_name' | 'email'
>;

function cacheKey(userId: string, organisationId: string): string {
  return `personMember:${userId}:${organisationId}`;
}

/**
 * Primary path: organisation-scoped `core_member` joined with `core_person` for the auth user.
 * Fallback (single documented path): load minimal `core_person` by `user_id`, then optional `core_member` for that person in the organisation — no other bypasses.
 */
export async function fetchCurrentPersonMember(
  client: RBACSupabaseClient | null,
  userId: string,
  organisationId: string
): Promise<ApiResult<CurrentPersonMember>> {
  const db = toTypedSupabase(client);
  if (!db) {
    return err({
      code: 'USER_DATA_NO_CLIENT',
      message: 'Client is not available.',
    });
  }

  return getOrCreateCached(
    cacheKey(userId, organisationId),
    async (): Promise<ApiResult<CurrentPersonMember>> => {
      const primary = await db
        .from('core_person')
        .select(
          `
          *,
          core_member!inner (*)
        `
        )
        .eq('user_id', userId)
        .eq('core_member.organisation_id', organisationId)
        .maybeSingle();

      if (primary.error) {
        return fallbackPath(db, userId, organisationId);
      }

      const row = primary.data as
        | (Database['public']['Tables']['core_person']['Row'] & {
            core_member:
              | Database['public']['Tables']['core_member']['Row']
              | Database['public']['Tables']['core_member']['Row'][];
          })
        | null;

      const embedded = row?.core_member;
      const memberRow = Array.isArray(embedded) ? embedded[0] : embedded;
      if (row && memberRow) {
        const { core_member: _removed, ...person } = row;
        void _removed;
        return ok({
          person: person as Database['public']['Tables']['core_person']['Row'],
          member: memberRow,
          usedReducedFieldFallback: false,
        });
      }

      return fallbackPath(db, userId, organisationId);
    }
  );
}

async function fallbackPath(
  client: SupabaseClient<Database>,
  userId: string,
  organisationId: string
): Promise<ApiResult<CurrentPersonMember>> {
  const reduced = await client
    .from('core_person')
    .select('id, user_id, first_name, last_name, email')
    .eq('user_id', userId)
    .maybeSingle();

  if (reduced.error) {
    return err({
      code: 'USER_DATA_PERSON_FALLBACK',
      message: 'Could not load profile.',
    });
  }

  const personPartial = reduced.data as ReducedPerson | null;
  if (!personPartial?.id) {
    return err({
      code: 'USER_DATA_NOT_FOUND',
      message: 'Could not load profile.',
    });
  }

  const memberRes = await client
    .from('core_member')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('person_id', personPartial.id)
    .maybeSingle();

  if (memberRes.error) {
    return err({
      code: 'USER_DATA_MEMBER_FALLBACK',
      message: 'Could not load membership.',
    });
  }

  const fullPerson = await client.from('core_person').select('*').eq('id', personPartial.id).maybeSingle();

  if (fullPerson.error || !fullPerson.data) {
    return err({
      code: 'USER_DATA_PERSON_LOAD',
      message: 'Could not load profile.',
    });
  }

  return ok({
    person: fullPerson.data,
    member: memberRes.data,
    usedReducedFieldFallback: true,
  });
}
