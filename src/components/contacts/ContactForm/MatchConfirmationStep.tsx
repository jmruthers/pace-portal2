import {
  Alert,
  AlertDescription,
  AlertTitle,
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Matching person found</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Alert>
          <AlertTitle>{`${match.first_name} ${match.last_name}`}</AlertTitle>
          <AlertDescription>{match.email ?? 'No email available'}</AlertDescription>
        </Alert>
        <p>Link this existing person or continue by creating a new contact record.</p>
      </CardContent>
      <CardFooter className="grid gap-2 md:grid-cols-2">
        <Button type="button" variant="default" onClick={onLinkExisting}>
          Link existing person
        </Button>
        <Button type="button" variant="secondary" onClick={onCreateNew}>
          Create new contact
        </Button>
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </CardFooter>
    </Card>
  );
}
