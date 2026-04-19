import {
  Alert,
  AlertDescription,
  AlertTitle,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@solvera/pace-core/components';
import type { MedicalConditionSummaryRow } from '@/hooks/medical-profile/useMedicalProfileData';

export type MedicalProfileDisplayProps = {
  conditions: MedicalConditionSummaryRow[];
};

/**
 * PR09 read-only handoff: condition summary list and boundary notice (no CRUD; PR10/PR11 own editing and files).
 */
export function MedicalProfileDisplay({ conditions }: MedicalProfileDisplayProps) {
  return (
    <>
      <Alert>
        <AlertTitle>Conditions and supporting documents</AlertTitle>
        <AlertDescription>
          This page is your medical summary. Recorded conditions are listed for reference only. Detailed
          condition editing and action-plan documents are handled outside this summary screen.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Recorded conditions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {conditions.length === 0 ? (
            <p>No conditions are recorded yet.</p>
          ) : (
            <ul className="grid gap-2">
              {conditions.map((c) => {
                const label = (c.name ?? 'Condition').trim();
                const inactive = c.is_active === false;
                return (
                  <li key={c.id} className="grid gap-1 border border-sec-200 rounded-md">
                    <p>
                      {label}
                      {inactive ? ' (inactive)' : ''}
                      {c.severity != null ? ` — ${String(c.severity)}` : ''}
                      {c.medical_alert ? ' — Medical alert' : ''}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
