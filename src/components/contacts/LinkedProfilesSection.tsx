import { Card, CardContent, CardHeader, CardTitle } from '@solvera/pace-core/components';
import { useLinkedProfiles } from '@/shared/hooks/useLinkedProfiles';

/**
 * Linked profiles delegated to the current user (PR03).
 */
export function LinkedProfilesSection() {
  const { data, isLoading, error } = useLinkedProfiles();

  if (isLoading) {
    return (
      <section aria-label="Linked profiles" aria-busy="true">
        <p>Loading linked profiles…</p>
      </section>
    );
  }

  if (error) {
    const detail =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: unknown }).message)
          : '';
    return (
      <section role="alert" aria-label="Linked profiles">
        <p>Linked profiles could not be loaded.</p>
        {import.meta.env.DEV && detail ? (
          <p>
            <small>{detail}</small>
          </p>
        ) : null}
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
