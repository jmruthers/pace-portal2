import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@solvera/pace-core/components';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import { useSecureSupabase } from '@solvera/pace-core/rbac';

/**
 * Linked profiles delegated to the current user (PR03).
 */
export function LinkedProfilesSection() {
  const { user } = useUnifiedAuthContext();
  const secure = useSecureSupabase();

  const { data, isLoading, error } = useQuery({
    queryKey: ['linkedProfiles', user?.id],
    enabled: Boolean(secure && user?.id),
    queryFn: async () => {
      if (!secure || !user?.id) return [];
      const r = (await secure.rpc('data_pace_linked_profiles_list', { p_user_id: user.id })) as {
        data: unknown;
        error: Error | null;
      };
      if (r.error) throw r.error;
      return (r.data ?? []) as {
        person_id: string;
        first_name: string;
        last_name: string;
        organisation_name: string;
        permission_type: string;
      }[];
    },
  });

  if (isLoading) {
    return (
      <section aria-label="Linked profiles" aria-busy="true">
        <p>Loading linked profiles…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section role="alert" aria-label="Linked profiles">
        <p>Linked profiles could not be loaded.</p>
      </section>
    );
  }

  if (!data?.length) {
    return (
      <section aria-label="Linked profiles">
        <Card>
          <CardHeader>
            <CardTitle>Linked profiles</CardTitle>
          </CardHeader>
          <CardContent>
            <p>No linked profiles yet.</p>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section aria-label="Linked profiles">
      <Card>
        <CardHeader>
          <CardTitle>Linked profiles</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <ul className="grid gap-2">
            {data.map((row) => (
              <li key={row.person_id}>
                <p>
                  {row.first_name} {row.last_name}
                </p>
                <p>
                  {row.organisation_name} — {row.permission_type}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
