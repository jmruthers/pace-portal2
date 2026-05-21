import { Card, CardContent, CardHeader, CardTitle } from '@solvera/pace-core/components';
import type { Database } from '@/types/pace-database';
import { ProfilePhotoUpload } from '@/components/member-profile/ProfilePhotoUpload';
import { useResolvedAppId } from '@/shared/hooks/useResolvedAppId';

type PersonRow = Database['public']['Tables']['core_person']['Row'];
type PhoneRow = Database['public']['Tables']['core_phone']['Row'];

export type ContactSummaryCardProps = {
  person: PersonRow;
  phones: PhoneRow[];
  organisationId: string | null;
  /** When true, hides photo upload (e.g. read-only delegated view, PR08). */
  readOnly?: boolean;
};

/**
 * Contact summary with profile photo entry point (PR03).
 */
export function ContactSummaryCard({
  person,
  phones,
  organisationId,
  readOnly = false,
}: ContactSummaryCardProps) {
  const appId = useResolvedAppId();
  const phoneSummary =
    phones.length === 0 ? 'No phone on file' : `${phones.length} phone number(s) on file`;

  if (readOnly) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          <p>
            {person.first_name} {person.last_name}
          </p>
          {person.email ? <p>{person.email}</p> : null}
          <p>{phoneSummary}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="grid items-stretch gap-4 md:grid-cols-[1fr_auto]">
        <section className="grid content-start gap-2">
          <CardTitle>Contact</CardTitle>
          <p>
            {person.first_name} {person.last_name}
          </p>
          {person.email ? <p>{person.email}</p> : null}
          <p>{phoneSummary}</p>
        </section>
        <ProfilePhotoUpload
          person={person}
          organisationId={organisationId}
          appId={appId}
          className="h-full min-h-0 w-full self-stretch"
        />
      </CardContent>
    </Card>
  );
}
