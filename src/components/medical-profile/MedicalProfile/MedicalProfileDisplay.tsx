import { Card, CardContent, CardHeader, CardTitle } from '@solvera/pace-core/components';
import type { MediConditionDetail } from '@/hooks/medical-profile/useMedicalProfileData';

export type MedicalProfileDisplayProps = {
  conditions: MediConditionDetail[];
};

/**
 * PR09 read-only condition list for form confirmation previews (no add/edit/delete on this surface).
 */
export function MedicalProfileDisplay({ conditions }: MedicalProfileDisplayProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recorded conditions</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p>
          Quick reference for conditions on file. Use add, edit, or delete below for full details and action-plan
          documents.
        </p>
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
  );
}
