import { useEffect, useId, useRef, useState } from 'react';
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
  DialogHeader,
  DialogPortal,
  DialogTitle,
  FileDisplay,
  Form,
  FormField,
  Input,
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
import { toSupabaseClientLike } from '@/lib/supabase-typed';
import { useActionPlanForCondition } from '@/hooks/medical-profile/useActionPlans';
import { useActionPlanFileAttachment } from '@/hooks/medical-profile/useActionPlanFileAttachment';
import { useMedicalConditions } from '@/hooks/medical-profile/useMedicalConditions';
import { useMediConditionTypes } from '@/hooks/medical-profile/useMediConditionTypes';
import type { MediConditionDetail } from '@/hooks/medical-profile/useMedicalProfileData';
import { ACTION_PLAN_ACCEPT } from '@/constants/fileUpload';
import { FILE_STORAGE_BUCKET } from '@/constants/fileStorage';
import {
  defaultMedicalConditionFormValues,
  mapMediConditionToFormValues,
  medicalConditionFormSchema,
  type MedicalConditionFormValues,
} from '@/utils/medical-profile/medicalConditionValidation';
import { buildConditionTypePathLabel } from '@/utils/medical-profile/conditionTypeLabel';
import { validateActionPlanFile } from '@/utils/medical-profile/actionPlanFileValidation';

const SEVERITY_NONE = '__severity_none__';

function ConditionTextareaField({
  name,
  label,
  rows = 2,
}: {
  name: keyof Pick<
    MedicalConditionFormValues,
    'treatment' | 'medications_and_aids' | 'triggers' | 'emergency_protocol' | 'notes'
  >;
  label: string;
  rows?: number;
}) {
  const { control } = useFormContext<MedicalConditionFormValues>();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Label className="grid min-w-0 gap-1">
          {label}
          <Textarea value={field.value} onChange={(v) => field.onChange(v)} rows={rows} />
          {fieldState.error?.message != null ? (
            <p role="alert">{String(fieldState.error.message)}</p>
          ) : null}
        </Label>
      )}
    />
  );
}

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
  const actionPlanInputId = useId();
  const actionPlanFileInputRef = useRef<HTMLInputElement>(null);
  const { persistActionPlanFile, isReady: persistReady } = useActionPlanFileAttachment();
  const [isUploadingPlan, setIsUploadingPlan] = useState(false);
  const [actionPlanFileInputKey, setActionPlanFileInputKey] = useState(0);

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
        const bucketApi = storageClient.storage.from(FILE_STORAGE_BUCKET);
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

  const resetActionPlanFileInput = () => {
    setActionPlanFileInputKey((k) => k + 1);
  };

  const handleActionPlanFileChange = async () => {
    const file = actionPlanFileInputRef.current?.files?.[0];
    if (!file || !conditionId || !appId) {
      return;
    }

    const validated = validateActionPlanFile(file);
    if (!validated.ok) {
      setUploadError(validated.message);
      resetActionPlanFileInput();
      return;
    }

    setUploadError(null);
    if (!persistReady) {
      setUploadError('Application context is not ready. Try again.');
      resetActionPlanFileInput();
      return;
    }

    setIsUploadingPlan(true);
    try {
      await persistActionPlanFile({
        pendingFile: file,
        conditionId,
        appId,
        organisationId,
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Could not upload action plan file.');
    } finally {
      setIsUploadingPlan(false);
      resetActionPlanFileInput();
    }
  };

  return (
    <article className="grid gap-3">
      <section className="grid gap-3 sm:grid-cols-2">
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

      <section className="grid gap-3 sm:grid-cols-2">
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
                  <SelectValue placeholder="Please select">
                    {field.value == null ? 'Please select' : field.value}
                  </SelectValue>
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
        <FormField<MedicalConditionFormValues> name="diagnosed_date" label="Diagnosed date" type="date" />
        <FormField<MedicalConditionFormValues> name="diagnosed_by" label="Diagnosed by" />
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

      <section className="grid gap-3 sm:grid-cols-2" aria-label="Care and response details">
        <ConditionTextareaField name="treatment" label="Treatment" />
        <ConditionTextareaField name="medications_and_aids" label="Medications and aids" />
        <ConditionTextareaField name="triggers" label="Triggers" />
        <ConditionTextareaField name="emergency_protocol" label="Emergency protocol" />
        <article className="sm:col-span-2">
          <ConditionTextareaField name="notes" label="Notes" rows={3} />
        </article>
      </section>

      <section className="grid gap-3" aria-label="Action plan document">
        <h3>Action plan document</h3>
        <article className="grid gap-3 sm:grid-cols-2 sm:items-start">
          <section className="grid min-w-0 gap-2" aria-label="Action plan upload">
            {actionPlanQuery.data?.actionPlanDate ? (
              <p>Current action plan date: {actionPlanQuery.data.actionPlanDate}</p>
            ) : null}
            {actionPlanQuery.isLoading ? <LoadingSpinner label="Loading file…" /> : null}
            {existingRef ? (
              <>
                {attachmentUrl ? (
                  <FileDisplay fileReference={existingRef} url={attachmentUrl} label="View attachment" />
                ) : null}
                {!attachmentUrl && !attachmentError ? <LoadingSpinner label="Loading attachment link…" /> : null}
                {attachmentError ? <p role="alert">{attachmentError}</p> : null}
              </>
            ) : null}
            {conditionId && appId ? (
              <>
                <Label htmlFor={actionPlanInputId} className="grid gap-2">
                  {existingRef ? 'Replace action plan file' : 'Add action plan file'}
                  <section className="sr-only" aria-hidden>
                    <Input
                      key={actionPlanFileInputKey}
                      ref={actionPlanFileInputRef}
                      id={actionPlanInputId}
                      type="file"
                      accept={ACTION_PLAN_ACCEPT}
                      tabIndex={-1}
                      disabled={isUploadingPlan || !persistReady}
                      onChange={() => void handleActionPlanFileChange()}
                    />
                  </section>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUploadingPlan || !persistReady}
                    onClick={() => actionPlanFileInputRef.current?.click()}
                  >
                    {existingRef ? 'Replace file' : 'Choose file'}
                  </Button>
                </Label>
                {isUploadingPlan ? <LoadingSpinner label="Uploading file…" /> : null}
              </>
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
        <DialogContent className="w-full max-w-4xl overflow-hidden">
          <DialogBody className="grid max-h-[min(90vh,52rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 p-0">
            <DialogHeader className="border-b border-border pb-4">
              <DialogTitle>{condition ? 'Edit medical condition' : 'Add medical condition'}</DialogTitle>
            </DialogHeader>
            {submitError ? (
              <Alert variant="destructive" className="mx-4 mt-4">
                <AlertTitle>Save failed</AlertTitle>
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            ) : null}
            <Form<MedicalConditionFormValues>
              key={condition?.id ?? 'new-condition'}
              className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto]"
              schema={medicalConditionFormSchema}
              defaultValues={defaultValues}
              onSubmit={handleSubmit}
            >
              <section className="overflow-y-auto px-4 py-4">
                <MedicalConditionFormFields
                  typesQuery={typesQuery}
                  uploadError={uploadError}
                  setUploadError={setUploadError}
                  actionPlanQuery={actionPlanQuery}
                  conditionId={conditionId}
                  appId={appId}
                  organisationId={organisationId}
                />
              </section>
              <DialogFooter className="border-t border-border">
                <fieldset className="m-0 border-0 p-0 text-right">
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
