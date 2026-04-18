import { useRef, useState } from 'react';
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
import { toSupabaseClientLike } from '@/lib/supabase-typed';
import { useActionPlanForCondition } from '@/hooks/medical-profile/useActionPlans';
import { useActionPlanFileAttachment } from '@/hooks/medical-profile/useActionPlanFileAttachment';
import { useMedicalConditions } from '@/hooks/medical-profile/useMedicalConditions';
import { useMediConditionTypes } from '@/hooks/medical-profile/useMediConditionTypes';
import type { MediConditionDetail } from '@/hooks/medical-profile/useMedicalProfileData';
import { ACTION_PLAN_ACCEPT, ACTION_PLAN_MAX_BYTES } from '@/constants/fileUpload';
import { validateActionPlanFile } from '@/utils/medical-profile/actionPlanFileValidation';
import {
  defaultMedicalConditionFormValues,
  mapMediConditionToFormValues,
  medicalConditionFormSchema,
  type MedicalConditionFormValues,
} from '@/utils/medical-profile/medicalConditionValidation';
import { ConditionTypeDropdown } from '@/components/medical-profile/ConditionTypeDropdown';

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
  pendingFile,
  setPendingFile,
  fileError,
  setFileError,
  actionPlanQuery,
}: {
  typesQuery: ReturnType<typeof useMediConditionTypes>;
  pendingFile: File | null;
  setPendingFile: (f: File | null) => void;
  fileError: string | null;
  setFileError: (s: string | null) => void;
  actionPlanQuery: ReturnType<typeof useActionPlanForCondition>;
}) {
  const ctx = useFormContext<MedicalConditionFormValues>();
  const { control } = ctx;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const secure = useSecureSupabase();
  const storageClient = toSupabaseClientLike(secure);

  const existingRef =
    actionPlanQuery.data?.fileReference && actionPlanQuery.data.actionPlan
      ? actionPlanQuery.data.fileReference
      : null;

  return (
    <article className="grid gap-4">
      <section className="grid gap-4 md:grid-cols-2">
        <Controller
          control={control}
          name="condition_type_id"
          render={({ field, fieldState }) => (
            <ConditionTypeDropdown
              types={typesQuery.data}
              value={field.value}
              onChange={(id) => field.onChange(id)}
              disabled={typesQuery.isLoading}
              errorMessage={fieldState.error?.message}
            />
          )}
        />
        <FormField<MedicalConditionFormValues> name="custom_name" label="Custom name" />
        <FormField<MedicalConditionFormValues> name="name" label="Diagnosis label" />
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
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEVERITY_NONE}>Not set</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
              {fieldState.error?.message != null ? (
                <p role="alert">{String(fieldState.error.message)}</p>
              ) : null}
            </Label>
          )}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
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
        <FormField<MedicalConditionFormValues>
          name="alert_description"
          label="Alert description"
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <FormField<MedicalConditionFormValues> name="diagnosed_by" label="Diagnosed by" />
        <FormField<MedicalConditionFormValues> name="diagnosed_date" label="Diagnosed date" type="date" />
        <FormField<MedicalConditionFormValues> name="last_episode_date" label="Last episode date" type="date" />
      </section>

      <section className="grid gap-4">
        <FormField<MedicalConditionFormValues> name="treatment" label="Treatment" />
        <FormField<MedicalConditionFormValues> name="medication" label="Medication" />
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
        <FormField<MedicalConditionFormValues> name="management_plan" label="Management plan" />
        <FormField<MedicalConditionFormValues> name="reaction" label="Reaction" />
        <FormField<MedicalConditionFormValues> name="aid" label="Aid" />
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
        {actionPlanQuery.isLoading ? <LoadingSpinner label="Loading file…" /> : null}
        {existingRef && !pendingFile ? (
          <p>
            <FileDisplay fileReference={existingRef} supabase={storageClient} label="Open action plan" />
          </p>
        ) : null}
        {pendingFile ? <p>Selected: {pendingFile.name}</p> : null}
        {/* Native file input: ref-driven programmatic open; hidden accept list matches PR11 validation. */}
        {/* eslint-disable-next-line pace-core-compliance/prefer-pace-core-components -- programmatic file picker + validation */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACTION_PLAN_ACCEPT}
          className="sr-only"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFileError(null);
            if (!f) {
              setPendingFile(null);
              return;
            }
            const v = validateActionPlanFile(f);
            if (!v.ok) {
              setFileError(v.message);
              setPendingFile(null);
              e.target.value = '';
              return;
            }
            if (f.size > ACTION_PLAN_MAX_BYTES) {
              setFileError('File is too large. Maximum size is 10 MB.');
              setPendingFile(null);
              e.target.value = '';
              return;
            }
            setPendingFile(f);
          }}
        />
        <p>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            {existingRef || pendingFile ? 'Replace file' : 'Choose file'}
          </Button>
          {pendingFile ? (
            <Button type="button" variant="secondary" onClick={() => setPendingFile(null)}>
              Clear selection
            </Button>
          ) : null}
        </p>
        {fileError ? (
          <Alert variant="destructive">
            <AlertTitle>File</AlertTitle>
            <AlertDescription>{fileError}</AlertDescription>
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
  const { persistActionPlanFile, isReady: actionPlanContextReady } = useActionPlanFileAttachment();

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const conditionId = condition?.id ?? null;
  const actionPlanQuery = useActionPlanForCondition(open ? conditionId : null);

  const handleDialogOpenChange = (next: boolean) => {
    if (!next) {
      setPendingFile(null);
      setFileError(null);
      setSubmitError(null);
    }
    onOpenChange(next);
  };

  const defaultValues = condition
    ? mapMediConditionToFormValues(condition)
    : defaultMedicalConditionFormValues();

  const handleSubmit = async (values: MedicalConditionFormValues) => {
    setSubmitError(null);
    if (!appId || !actionPlanContextReady) {
      setSubmitError('Application context is not ready. Try again.');
      return;
    }

    try {
      let savedId = conditionId;
      if (condition) {
        await updateCondition.mutateAsync({ id: condition.id, values });
      } else {
        savedId = await createCondition.mutateAsync(values);
      }

      if (pendingFile && savedId) {
        await persistActionPlanFile({
          pendingFile,
          conditionId: savedId,
          organisationId,
          appId,
        });
      }

      setPendingFile(null);
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
                pendingFile={pendingFile}
                setPendingFile={setPendingFile}
                fileError={fileError}
                setFileError={setFileError}
                actionPlanQuery={actionPlanQuery}
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
