import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@solvera/pace-core/components';
import { useLinkedProfiles } from '@/shared/hooks/useLinkedProfiles';
import { hasDelegatedEditPermission } from '@/shared/lib/utils/delegatedProfilePermissions';

/**
 * Linked profiles delegated to the current user (PR03).
 */
export function LinkedProfilesSection() {
  const navigate = useNavigate();
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
        <CardContent>
          <ul className="grid list-none grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-3">
            {data.map((row) => (
              <li key={row.person_id}>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {row.first_name} {row.last_name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>
                      {row.organisation_name} — {row.permission_type}
                    </p>
                  </CardContent>
                  {row.member_id ? (
                    <CardFooter className="text-right">
                      <fieldset className="grid auto-cols-max grid-flow-col justify-end gap-2 border-0 p-0">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => navigate(`/profile/view/${row.member_id}`)}
                        >
                          View
                        </Button>
                        {hasDelegatedEditPermission(row.permission_type) ? (
                          <Button
                            type="button"
                            variant="default"
                            onClick={() => navigate(`/profile/edit/${row.member_id}`)}
                          >
                            Edit
                          </Button>
                        ) : null}
                      </fieldset>
                    </CardFooter>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
