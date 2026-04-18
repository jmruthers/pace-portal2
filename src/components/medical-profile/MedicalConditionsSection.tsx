import { useState } from 'react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, ConfirmationDialog } from '@solvera/pace-core/components';
import type { MediConditionDetail } from '@/hooks/medical-profile/useMedicalProfileData';
import { useMediConditionTypes } from '@/hooks/medical-profile/useMediConditionTypes';
import { useMedicalConditions } from '@/hooks/medical-profile/useMedicalConditions';
import { MedicalConditionForm } from '@/components/medical-profile/MedicalConditionForm';
import { buildConditionTypePathLabel } from '@/utils/medical-profile/conditionTypeLabel';

function SummaryLine({ label, value }: { label: string; value: string | null | undefined }) {
  const t = value?.trim();
  if (!t) return null;
  return (
    <p>
      {label}: {t}
    </p>
  );
}

export type MedicalConditionsSectionProps = {
  conditions: MediConditionDetail[];
  profileId: string | null;
  organisationId: string | null;
  appId: string | null;
};

export function MedicalConditionsSection({
  conditions,
  profileId,
  organisationId,
  appId,
}: MedicalConditionsSectionProps) {
  const [editor, setEditor] = useState<{
    open: boolean;
    condition: MediConditionDetail | null;
  }>({ open: false, condition: null });

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const { deleteCondition } = useMedicalConditions({ profileId, organisationId });
  const typesQuery = useMediConditionTypes();

  const canEdit = Boolean(profileId && organisationId && appId);

  return (
    <>
      <Card>
        <CardHeader className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
          <CardTitle>Medical conditions</CardTitle>
          <fieldset className="m-0 border-0 p-0 text-right">
            <Button
              type="button"
              variant="default"
              disabled={!canEdit}
              onClick={() => setEditor({ open: true, condition: null })}
            >
              Add condition
            </Button>
          </fieldset>
        </CardHeader>
        <CardContent className="grid gap-3">
          {!canEdit ? (
            <p role="status">Save your medical profile summary first, then you can manage conditions.</p>
          ) : null}
          {conditions.length === 0 && canEdit ? <p>No conditions are recorded yet.</p> : null}
          <ul className="grid gap-3">
            {conditions.map((c) => {
              const label = (c.custom_name ?? c.name ?? 'Condition').trim();
              const inactive = c.is_active === false;
              const typePath =
                typesQuery.data && c.condition_type_id
                  ? buildConditionTypePathLabel(c.condition_type_id, typesQuery.data)
                  : '';
              return (
                <li key={c.id}>
                  <article className="grid gap-3 rounded-md border border-sec-200 p-3">
                    <header className="grid gap-2">
                      <p>
                        <strong>{label}</strong>
                        {inactive ? ' (inactive)' : ''}
                      </p>
                      <p className="grid grid-flow-col auto-cols-max gap-2">
                        {!typesQuery.isLoading && typePath ? (
                          <Badge variant="outline-sec-muted">{typePath}</Badge>
                        ) : null}
                        {c.severity != null ? (
                          <Badge variant="solid-sec-muted">{String(c.severity)}</Badge>
                        ) : null}
                        {c.medical_alert ? (
                          <Badge variant="solid-acc-normal">Medical alert</Badge>
                        ) : null}
                      </p>
                    </header>
                    {c.name?.trim() && c.custom_name?.trim() && c.name.trim() !== c.custom_name.trim() ? (
                      <p>Diagnosis label: {c.name}</p>
                    ) : null}
                    <SummaryLine label="Diagnosed by" value={c.diagnosed_by} />
                    <SummaryLine label="Diagnosed date" value={c.diagnosed_date} />
                    <SummaryLine label="Last episode date" value={c.last_episode_date} />
                    {c.medical_alert ? <SummaryLine label="Alert description" value={c.alert_description} /> : null}
                    <SummaryLine label="Treatment" value={c.treatment} />
                    <SummaryLine label="Medication" value={c.medication} />
                    <SummaryLine label="Triggers" value={c.triggers} />
                    <SummaryLine label="Emergency protocol" value={c.emergency_protocol} />
                    <SummaryLine label="Notes" value={c.notes} />
                    <SummaryLine label="Management plan" value={c.management_plan} />
                    <SummaryLine label="Reaction" value={c.reaction} />
                    <SummaryLine label="Aid" value={c.aid} />
                    <fieldset className="m-0 grid grid-flow-col auto-cols-max justify-end gap-2 border-0 p-0">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!canEdit}
                        onClick={() => setEditor({ open: true, condition: c })}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={!canEdit}
                        onClick={() => setDeleteTargetId(c.id)}
                      >
                        Delete
                      </Button>
                    </fieldset>
                  </article>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {profileId && organisationId && appId ? (
        <MedicalConditionForm
          open={editor.open}
          onOpenChange={(o) => {
            if (!o) setEditor({ open: false, condition: null });
          }}
          condition={editor.condition}
          profileId={profileId}
          organisationId={organisationId}
          appId={appId}
        />
      ) : null}

      <ConfirmationDialog
        open={deleteTargetId != null}
        onOpenChange={(o) => {
          if (!o) setDeleteTargetId(null);
        }}
        title="Delete this condition?"
        description="The linked action-plan file will be removed as well."
        variant="destructive"
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deleteTargetId) {
            await deleteCondition.mutateAsync(deleteTargetId);
          }
        }}
        isPending={deleteCondition.isPending}
      />
    </>
  );
}
