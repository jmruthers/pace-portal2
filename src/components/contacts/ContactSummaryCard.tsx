import { Card, CardContent, CardHeader, CardTitle } from '@solvera/pace-core/components';
import { useUnifiedAuthContext } from '@solvera/pace-core';
import type { Database } from '@/types/pace-database';
import { ProfilePhotoUpload } from '@/components/member-profile/ProfilePhotoUpload';

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
  const { appId } = useUnifiedAuthContext();
  const phoneSummary =
    phones.length === 0 ? 'No phone on file' : `${phones.length} phone number(s) on file`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact</CardTitle>
      </CardHeader>
      <CardContent
        className={
          readOnly ? 'grid gap-2' : 'grid gap-4 md:grid-cols-[auto_1fr] md:items-start'
        }
      >
        {readOnly ? null : (
          <ProfilePhotoUpload person={person} organisationId={organisationId} appId={appId} />
        )}
        {readOnly ? (
          <>
            <p>
              {person.first_name} {person.last_name}
            </p>
            {person.email ? <p>{person.email}</p> : null}
            <p>{phoneSummary}</p>
          </>
        ) : (
          <section className="grid gap-2">
            <p>
              {person.first_name} {person.last_name}
            </p>
            {person.email ? <p>{person.email}</p> : null}
            <p>{phoneSummary}</p>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
