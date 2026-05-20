import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@solvera/pace-core/components';
import type { MembershipListItem } from '@/lib/memberRequestTypes';

export type MembershipStateCardProps = {
  item: MembershipListItem;
  onApplyAgain?: (organisationId: string, organisationName: string) => void;
};

function formatSubmittedDate(iso: string | null): string | null {
  if (iso == null || iso.trim() === '') return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** PR22 — One membership row card with derived display state. */
export function MembershipStateCard({ item, onApplyAgain }: MembershipStateCardProps) {
  const submitted = formatSubmittedDate(item.requestSubmittedAt);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{item.organisationName}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        <Badge>{item.displayLabel}</Badge>
        {item.displayKind === 'active' && item.membershipNumber ? (
          <p>Member number: {item.membershipNumber}</p>
        ) : null}
        {item.displayKind === 'active' && item.membershipTypeName ? (
          <p>Membership type: {item.membershipTypeName}</p>
        ) : null}
        {item.displayKind === 'awaiting_approval' && submitted ? (
          <p>Submitted {submitted}</p>
        ) : null}
      </CardContent>
      {item.showApplyAgain && onApplyAgain ? (
        <CardFooter className="text-right">
          <Button
            type="button"
            variant="default"
            onClick={() => onApplyAgain(item.organisationId, item.organisationName)}
          >
            Apply again
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
