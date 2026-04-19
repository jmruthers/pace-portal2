import { useEffect, useState } from 'react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, ConfirmationDialog } from '@solvera/pace-core/components';
import { FileDisplay } from '@solvera/pace-core/components';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { MediConditionDetail } from '@/hooks/medical-profile/useMedicalProfileData';
import { toSupabaseClientLike } from '@/lib/supabase-typed';
import { useActionPlanForCondition } from '@/hooks/medical-profile/useActionPlans';
import { useMediConditionTypes } from '@/hooks/medical-profile/useMediConditionTypes';
import { useMedicalConditions } from '@/hooks/medical-profile/useMedicalConditions';
import { MedicalConditionForm } from '@/components/medical-profile/MedicalConditionForm';
import { buildConditionTypePathLabel } from '@/utils/medical-profile/conditionTypeLabel';

function ConditionAttachmentLink({ conditionId }: { conditionId: string }) {
  const secure = useSecureSupabase();
  const storageClient = toSupabaseClientLike(secure);
  const actionPlanQuery = useActionPlanForCondition(conditionId);
  const fileReference = actionPlanQuery.data?.fileReference ?? null;
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolveUrl() {
      if (!fileReference || !storageClient) {
        setAttachmentUrl(null);
        return;
      }

      const bucketApi = storageClient.storage.from('files');
      if (fileReference.is_public) {
        const publicUrl = bucketApi.getPublicUrl(fileReference.file_path).data.publicUrl;
        if (!cancelled) setAttachmentUrl(publicUrl);
        return;
      }
      if (typeof bucketApi.createSignedUrl === 'function') {
        const signed = await bucketApi.createSignedUrl(fileReference.file_path, 3600);
        if (!cancelled) {
          setAttachmentUrl(signed.data?.signedUrl ?? null);
        }
        return;
      }
      const fallbackUrl = bucketApi.getPublicUrl(fileReference.file_path).data.publicUrl;
      if (!cancelled) setAttachmentUrl(fallbackUrl);
    }

    void resolveUrl();
    return () => {
      cancelled = true;
    };
  }, [fileReference, storageClient]);

  if (!fileReference || !attachmentUrl) return null;

  return <FileDisplay fileReference={fileReference} url={attachmentUrl} label="Open attachment" />;
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
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {conditions.map((c) => {
              const label = (c.name ?? 'Condition').trim();
              const inactive = c.is_active === false;
              const typePath =
                typesQuery.data && c.condition_type_id
                  ? buildConditionTypePathLabel(c.condition_type_id, typesQuery.data)
                  : '';
              return (
                <li key={c.id}>
                  <article className="grid h-full content-start gap-3 rounded-md border border-sec-200 p-3">
                    <header className="grid gap-2">
                      <p>
                        <strong>{label}</strong>
                        {inactive ? ' (inactive)' : ''}
                      </p>
                      <p className="flex flex-wrap gap-2">
                        {!typesQuery.isLoading && typePath ? (
                          <Badge variant="outline-sec-muted">{typePath}</Badge>
                        ) : null}
                        {c.severity != null ? (
                          <Badge variant="solid-sec-muted">{String(c.severity)}</Badge>
                        ) : null}
                        {c.medical_alert ? (
                          <Badge variant="solid-acc-normal">Medical alert</Badge>
                        ) : null}
                        {c.action_plan_file_id ? <Badge variant="outline-main-muted">Attachment</Badge> : null}
                      </p>
                    </header>
                    {c.action_plan_file_id ? <ConditionAttachmentLink conditionId={c.id} /> : null}
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
        description="This condition and any linked action-plan file will be removed."
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
