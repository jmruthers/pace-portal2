import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@solvera/pace-core/components';
import type { EmailPersonMatch } from '@/hooks/contacts/useContactFormState';

export type MatchConfirmationStepProps = {
  match: EmailPersonMatch;
  onBack: () => void;
  onCancel: () => void;
  onLinkExisting: () => void;
  onCreateNew: () => void;
};

export function MatchConfirmationStep({
  match,
  onBack,
  onCancel,
  onLinkExisting,
  onCreateNew,
}: MatchConfirmationStepProps) {
  const displayName = `${match.first_name} ${match.last_name}`.trim();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Matching person found</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] md:items-center">
        <article
          className="grid gap-1 rounded-md border border-main-200 bg-main-100 p-4"
          aria-label="Matched person"
        >
          <p>
            <strong>{displayName}</strong>
          </p>
          <p>{match.email ?? 'No email available'}</p>
        </article>
        <p>Link this existing person or continue by creating a new contact record.</p>
      </CardContent>
      <CardFooter className="border-t border-border">
        <fieldset className="m-0 w-full border-0 p-0 grid grid-cols-3 items-center gap-2">
          <Button type="button" variant="ghost" onClick={onBack}>
            Back
          </Button>
          <section className="grid justify-items-center">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          </section>
          <section className="grid justify-items-end gap-2 sm:grid-flow-col">
            <Button type="button" variant="default" onClick={onLinkExisting}>
              Link existing person
            </Button>
            <Button type="button" variant="secondary" onClick={onCreateNew}>
              Create new contact
            </Button>
          </section>
        </fieldset>
      </CardFooter>
    </Card>
  );
}
