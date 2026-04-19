import { useEffect, useState } from 'react';
import { Controller, useFormContext } from '@solvera/pace-core/forms';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Checkbox,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogPortal,
  FileDisplay,
  FileUpload,
  Form,
  FormField,
  Label,
  LoadingSpinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@solvera/pace-core/components';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { useQueryClient } from '@tanstack/react-query';
import { toSupabaseClientLike, toTypedSupabase } from '@/lib/supabase-typed';
import { useActionPlanForCondition } from '@/hooks/medical-profile/useActionPlans';
import { useMedicalConditions } from '@/hooks/medical-profile/useMedicalConditions';
import { useMediConditionTypes } from '@/hooks/medical-profile/useMediConditionTypes';
import type { MediConditionDetail } from '@/hooks/medical-profile/useMedicalProfileData';
import {
  ACTION_PLAN_ACCEPT,
  ACTION_PLAN_CATEGORY,
  ACTION_PLAN_FOLDER,
  ACTION_PLAN_MAX_BYTES,
} from '@/constants/fileUpload';
import {
  defaultMedicalConditionFormValues,
  mapMediConditionToFormValues,
  medicalConditionFormSchema,
  type MedicalConditionFormValues,
} from '@/utils/medical-profile/medicalConditionValidation';
import { buildConditionTypePathLabel } from '@/utils/medical-profile/conditionTypeLabel';

const SEVERITY_NONE = '__severity_none__';

export type MedicalConditionFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  condition: MediConditionDetail | null;
  profileId: string;
  organisationId: string;
  appId: string | null;
};

function MedicalConditionFormFields({
  typesQuery,
  uploadError,
  setUploadError,
  actionPlanQuery,
  conditionId,
  appId,
  organisationId,
}: {
  typesQuery: ReturnType<typeof useMediConditionTypes>;
  uploadError: string | null;
  setUploadError: (s: string | null) => void;
  actionPlanQuery: ReturnType<typeof useActionPlanForCondition>;
  conditionId: string | null;
  appId: string | null;
  organisationId: string;
}) {
  const ctx = useFormContext<MedicalConditionFormValues>();
  const { control } = ctx;
  const secure = useSecureSupabase();
  const storageClient = toSupabaseClientLike(secure);
  const typedClient = toTypedSupabase(secure);
  const queryClient = useQueryClient();

  const existingRef =
    actionPlanQuery.data?.fileReference != null ? actionPlanQuery.data.fileReference : null;
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolveAttachmentUrl() {
      if (!existingRef) {
        setAttachmentUrl(null);
        setAttachmentError(null);
        return;
      }
      if (!storageClient) {
        setAttachmentUrl(null);
        setAttachmentError('Could not load attachment link.');
        return;
      }

      try {
        const bucketApi = storageClient.storage.from('files');
        if (existingRef.is_public) {
          const publicUrl = bucketApi.getPublicUrl(existingRef.file_path).data.publicUrl;
          if (!cancelled) {
            setAttachmentUrl(publicUrl);
            setAttachmentError(null);
          }
          return;
        }
        if (typeof bucketApi.createSignedUrl === 'function') {
          const signed = await bucketApi.createSignedUrl(existingRef.file_path, 3600);
          if (!cancelled) {
            if (signed.error || !signed.data?.signedUrl) {
              setAttachmentUrl(null);
              setAttachmentError(signed.error?.message ?? 'Could not load attachment link.');
            } else {
              setAttachmentUrl(signed.data.signedUrl);
              setAttachmentError(null);
            }
          }
          return;
        }

        const fallbackUrl = bucketApi.getPublicUrl(existingRef.file_path).data.publicUrl;
        if (!cancelled) {
          setAttachmentUrl(fallbackUrl);
          setAttachmentError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setAttachmentUrl(null);
          setAttachmentError(e instanceof Error ? e.message : 'Could not load attachment link.');
        }
      }
    }

    void resolveAttachmentUrl();
    return () => {
      cancelled = true;
    };
  }, [existingRef, storageClient]);

  return (
    <article className="grid gap-4">
      <section className="grid gap-4 md:grid-cols-2">
        <FormField<MedicalConditionFormValues> name="name" label="Condition name" />
        <Controller
          control={control}
          name="condition_type_id"
          render={({ field, fieldState }) => {
            const allTypes = typesQuery.data ?? [];
            const selectedType = allTypes.find((type) => type.id === field.value) ?? null;
            const selectableTypes = allTypes.filter((type) => type.is_active !== false || type.id === field.value);
            const selectValue = selectedType ? String(field.value) : '';
            const selectedTypeLabel = selectedType ? buildConditionTypePathLabel(selectedType.id, allTypes) : '';

            return (
              <Label className="grid gap-2">
                Condition type
                <Select value={selectValue} onValueChange={(v) => field.onChange(Number(v))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={typesQuery.isLoading ? 'Loading types...' : 'Please select'}>
                      {selectedTypeLabel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {selectableTypes.map((type) => (
                      <SelectItem key={type.id} value={String(type.id)}>
                        {buildConditionTypePathLabel(type.id, allTypes)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.error?.message != null ? (
                  <p role="alert">{String(fieldState.error.message)}</p>
                ) : null}
              </Label>
            );
          }}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Controller
          control={control}
          name="severity"
          render={({ field, fieldState }) => (
            <Label className="grid gap-2">
              Severity
              <Select
                value={field.value == null ? SEVERITY_NONE : field.value}
                onValueChange={(v) =>
                  field.onChange(v === SEVERITY_NONE ? null : (v as MedicalConditionFormValues['severity']))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Please select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEVERITY_NONE}>Please select</SelectItem>
                  <SelectItem value="Mild">Mild</SelectItem>
                  <SelectItem value="Moderate">Moderate</SelectItem>
                  <SelectItem value="Severe">Severe</SelectItem>
                </SelectContent>
              </Select>
              {fieldState.error?.message != null ? (
                <p role="alert">{String(fieldState.error.message)}</p>
              ) : null}
            </Label>
          )}
        />
        <Controller
          control={control}
          name="medical_alert"
          render={({ field }) => (
            <Label className="grid grid-cols-[auto_1fr] items-center gap-2">
              <Checkbox checked={field.value} onChange={(v) => field.onChange(v)} />
              Medical alert
            </Label>
          )}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <FormField<MedicalConditionFormValues> name="diagnosed_by" label="Diagnosed by" />
        <FormField<MedicalConditionFormValues> name="diagnosed_date" label="Diagnosed date" type="date" />
      </section>

      <section className="grid gap-4">
        <FormField<MedicalConditionFormValues> name="treatment" label="Treatment" />
        <FormField<MedicalConditionFormValues> name="medications_and_aids" label="Medications and aids" />
        <FormField<MedicalConditionFormValues> name="triggers" label="Triggers" />
        <FormField<MedicalConditionFormValues> name="emergency_protocol" label="Emergency protocol" />
        <Controller
          control={control}
          name="notes"
          render={({ field, fieldState }) => (
            <Label className="grid gap-1">
              Notes
              <Textarea value={field.value} onChange={(v) => field.onChange(v)} />
              {fieldState.error?.message != null ? (
                <p role="alert">{String(fieldState.error.message)}</p>
              ) : null}
            </Label>
          )}
        />
        <Controller
          control={control}
          name="is_active"
          render={({ field }) => (
            <Label className="grid grid-cols-[auto_1fr] items-center gap-2">
              <Checkbox checked={field.value} onChange={(v) => field.onChange(v)} />
              Active
            </Label>
          )}
        />
      </section>

      <section className="grid gap-2" aria-label="Action plan document">
        <h3>Action plan document</h3>
        {actionPlanQuery.data?.actionPlanDate ? (
          <p>Current action plan date: {actionPlanQuery.data.actionPlanDate}</p>
        ) : null}
        {actionPlanQuery.isLoading ? <LoadingSpinner label="Loading file…" /> : null}
        {existingRef ? (
          <article aria-label="Current attachment">
            <p>Attachment</p>
            {attachmentUrl ? <FileDisplay fileReference={existingRef} url={attachmentUrl} label="View attachment" /> : null}
            {!attachmentUrl && !attachmentError ? <LoadingSpinner label="Loading attachment link…" /> : null}
            {attachmentError ? <p role="alert">{attachmentError}</p> : null}
          </article>
        ) : null}
        <article className="grid gap-4 md:grid-cols-2">
          <section aria-label="Action plan upload">
            {conditionId && appId ? (
              <FileUpload
                supabase={storageClient}
                table_name="medi_condition"
                record_id={conditionId}
                organisation_id={organisationId}
                app_id={appId}
                category={ACTION_PLAN_CATEGORY}
                folder={ACTION_PLAN_FOLDER}
                pageContext={organisationId}
                accept={ACTION_PLAN_ACCEPT}
                maxSize={ACTION_PLAN_MAX_BYTES}
                multiple={false}
                label={existingRef ? 'Replace file' : 'Choose file'}
                onUploadError={(error) => {
                  setUploadError(error.message ?? 'Could not upload action plan file.');
                }}
                onUploadSuccess={async (result) => {
                  setUploadError(null);
                  if (!typedClient) {
                    setUploadError('Could not link uploaded file: secure client is unavailable.');
                    return;
                  }
                  if (!conditionId) {
                    setUploadError('Could not link uploaded file: condition ID is missing.');
                    return;
                  }
                  const fileReferenceId = result.file_reference?.id;
                  if (!fileReferenceId) {
                    setUploadError('Could not link uploaded file: missing file reference ID.');
                    return;
                  }
                  const upd = await typedClient
                    .from('medi_condition')
                    .update({
                      action_plan_file_id: fileReferenceId,
                      action_plan_date: new Date().toISOString().slice(0, 10),
                    })
                    .eq('id', conditionId)
                    .select('id');
                  if (upd.error) {
                    setUploadError(upd.error.message ?? 'Could not link uploaded action plan file.');
                    return;
                  }
                  const updatedRows = Array.isArray(upd.data) ? upd.data.length : 0;
                  if (updatedRows !== 1) {
                    setUploadError('Could not link uploaded action plan file. You may not have permission to update this condition.');
                    return;
                  }
                  await queryClient.invalidateQueries({ queryKey: ['mediActionPlan'] });
                  await queryClient.invalidateQueries({ queryKey: ['medicalProfile'] });
                }}
              />
            ) : (
              <p role="status">Save this condition first, then upload an action plan file.</p>
            )}
          </section>
          <FormField<MedicalConditionFormValues> name="action_plan_date" label="Action plan date" type="date" />
        </article>
        {uploadError ? (
          <Alert variant="destructive">
            <AlertTitle>File</AlertTitle>
            <AlertDescription>{uploadError}</AlertDescription>
          </Alert>
        ) : null}
      </section>
    </article>
  );
}

export function MedicalConditionForm({
  open,
  onOpenChange,
  condition,
  profileId,
  organisationId,
  appId,
}: MedicalConditionFormProps) {
  const typesQuery = useMediConditionTypes();
  const { createCondition, updateCondition } = useMedicalConditions({ profileId, organisationId });

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const conditionId = condition?.id ?? null;
  const actionPlanQuery = useActionPlanForCondition(open ? conditionId : null);

  const handleDialogOpenChange = (next: boolean) => {
    if (!next) {
      setUploadError(null);
      setSubmitError(null);
    }
    onOpenChange(next);
  };

  const defaultValues = condition
    ? mapMediConditionToFormValues(condition)
    : defaultMedicalConditionFormValues();

  const handleSubmit = async (values: MedicalConditionFormValues) => {
    setSubmitError(null);
    if (!appId) {
      setSubmitError('Application context is not ready. Try again.');
      return;
    }

    try {
      if (condition) {
        await updateCondition.mutateAsync({ id: condition.id, values });
      } else {
        await createCondition.mutateAsync(values);
      }
      setUploadError(null);
      handleDialogOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not save condition.';
      setSubmitError(msg);
    }
  };

  const busy = createCondition.isPending || updateCondition.isPending;

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogPortal>
        <DialogContent>
          <DialogBody>
            <header>
              <h2>{condition ? 'Edit medical condition' : 'Add medical condition'}</h2>
            </header>
            {submitError ? (
              <Alert variant="destructive">
                <AlertTitle>Save failed</AlertTitle>
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            ) : null}
            <Form<MedicalConditionFormValues>
              key={condition?.id ?? 'new-condition'}
              schema={medicalConditionFormSchema}
              defaultValues={defaultValues}
              onSubmit={handleSubmit}
            >
              <MedicalConditionFormFields
                typesQuery={typesQuery}
                uploadError={uploadError}
                setUploadError={setUploadError}
                actionPlanQuery={actionPlanQuery}
                conditionId={conditionId}
                appId={appId}
                organisationId={organisationId}
              />
              <DialogFooter className="grid justify-items-end gap-2">
                <fieldset className="m-0 border-0 p-0">
                  <Button type="button" variant="secondary" disabled={busy} onClick={() => handleDialogOpenChange(false)}>
                    Cancel
                  </Button>{' '}
                  <Button type="submit" variant="default" disabled={busy}>
                    {busy ? 'Saving…' : 'Save condition'}
                  </Button>
                </fieldset>
              </DialogFooter>
            </Form>
          </DialogBody>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
