import { useEffect, useState } from 'react';
import { Controller, useFormContext } from '@solvera/pace-core/forms';
import type { z } from '@solvera/pace-core/utils';
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogBody,
  DialogContent,
  DialogPortal,
  Form,
  FormField,
  Label,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@solvera/pace-core/components';
import { findDietTypeById, type CakeDietTypeRow } from '@/hooks/medical-profile/cakeDietTypes';
import { computeMedicalProfileProgress } from '@/shared/lib/medicalProfileProgress';
import {
  type MedicalProfileFormValues,
} from '@/utils/medical-profile/validation';
import { MedicalProfileDisplay } from '@/components/medical-profile/MedicalProfile/MedicalProfileDisplay';
import type { MedicalConditionSummaryRow } from '@/hooks/medical-profile/useMedicalProfileData';

const MENU_SELECT_NONE = '__menu_none__';

export type MedicalProfileFormProps = {
  formKey: string;
  defaultValues: MedicalProfileFormValues;
  schema: z.ZodType<MedicalProfileFormValues>;
  dietTypes: readonly CakeDietTypeRow[];
  /** From `data_medi_profile_get` when the select value does not match option ids (display only). */
  menuLabelHint?: string | null;
  conditions: MedicalConditionSummaryRow[];
  isSubmitting: boolean;
  onSubmit: (values: MedicalProfileFormValues) => void | Promise<void>;
};

function DietDescriptionsDialog({
  open,
  onOpenChange,
  dietTypes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dietTypes: readonly CakeDietTypeRow[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogContent>
          <DialogBody>
            <h2 id="diet-descriptions-title">Diet menu options</h2>
            <section
              className="max-h-[min(60vh,480px)] overflow-auto"
              aria-label="Diet descriptions table"
            >
              <table className="w-full border-collapse border border-sec-200" aria-labelledby="diet-descriptions-title">
                <thead>
                  <tr>
                    <th scope="col" className="border border-sec-200 p-2">
                      Name
                    </th>
                    <th scope="col" className="border border-sec-200 p-2">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dietTypes.map((d) => (
                    <tr key={d.diettype_id}>
                      <td className="border border-sec-200 p-2 align-top">{d.diettype_name}</td>
                      <td className="border border-sec-200 p-2 align-top">
                        {d.diettype_description?.trim() ? <p>{d.diettype_description}</p> : <p>—</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            <p>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </p>
          </DialogBody>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

function MedicalProfileFormInner({
  conditions,
  isSubmitting,
  dietTypes,
  menuLabelHint,
}: {
  conditions: MedicalConditionSummaryRow[];
  isSubmitting: boolean;
  dietTypes: readonly CakeDietTypeRow[];
  menuLabelHint: string | null | undefined;
}) {
  const ctx = useFormContext<MedicalProfileFormValues>();
  const { watch, setValue, control } = ctx;
  const watched = watch();
  const menuSelection = watch('menu_selection');
  const progress = computeMedicalProfileProgress(watched, dietTypes);
  const pct = Math.round(progress.completionRatio * 100);
  const selectedDiet = findDietTypeById(dietTypes, menuSelection);
  const isOtherDiet = selectedDiet?.diettype_code === 'OT';
  const [descriptionsOpen, setDescriptionsOpen] = useState(false);

  useEffect(() => {
    if (!isOtherDiet) {
      setValue('dietary_comments', '', { shouldValidate: true, shouldDirty: true });
    }
  }, [isOtherDiet, setValue]);

  /** If DB stores a UUID but options use short ids, align form value so the Select matches an item. */
  useEffect(() => {
    const row = findDietTypeById(dietTypes, menuSelection);
    const trimmed = menuSelection.trim();
    if (row && row.diettype_id !== trimmed) {
      setValue('menu_selection', row.diettype_id, { shouldValidate: true, shouldDirty: true });
    }
  }, [dietTypes, menuSelection, setValue]);

  return (
    <article className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
        <h1>Medical profile</h1>
        <fieldset className="text-right">
          <Button type="submit" variant="default" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save medical profile'}
          </Button>
        </fieldset>
      </section>

      <section className="grid gap-2" aria-label="Medical profile completion">
        <p>Medical profile completion</p>
        <Progress value={pct} max={100} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Medicare and health cover</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FormField<MedicalProfileFormValues> name="medicare_number" label="Medicare number" />
          <FormField<MedicalProfileFormValues> name="medicare_expiry" label="Medicare expiry" type="date" />
          <FormField<MedicalProfileFormValues> name="health_care_card_number" label="Health care card number" />
          <FormField<MedicalProfileFormValues>
            name="health_care_card_expiry"
            label="Health care card expiry"
            type="date"
          />
          <FormField<MedicalProfileFormValues> name="health_fund_name" label="Health fund name" />
          <FormField<MedicalProfileFormValues> name="health_fund_number" label="Health fund number" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dietary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p>Please select the most appropriate menu for your dietary requirements, even if it's slighty more restrictive than your needs. Only select "Other" if none of the diets work for you.</p>
          <Controller
            control={control}
            name="menu_selection"
            render={({ field, fieldState }) => {
              const selectedRow = findDietTypeById(dietTypes, field.value);
              const valueForSelect = selectedRow?.diettype_id ?? field.value;
              const menuTriggerLabel =
                field.value.trim() === ''
                  ? undefined
                  : (selectedRow?.diettype_name ?? menuLabelHint ?? undefined);
              return (
                <section
                  className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,50%)_auto] md:items-center md:gap-4"
                  aria-label="Menu selection"
                >
                  <fieldset className="m-0 min-w-0 w-full border-0 p-0">
                    <Select
                      value={valueForSelect.trim() === '' ? MENU_SELECT_NONE : valueForSelect}
                      onValueChange={(v) => field.onChange(v === MENU_SELECT_NONE ? '' : v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a menu">{menuTriggerLabel}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={MENU_SELECT_NONE}>Not selected</SelectItem>
                        {dietTypes.map((d) => (
                          <SelectItem key={d.diettype_id} value={d.diettype_id}>
                            {d.diettype_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.error?.message != null ? (
                      <p role="alert">{String(fieldState.error.message)}</p>
                    ) : null}
                  </fieldset>
                  <Button type="button" variant="link" onClick={() => setDescriptionsOpen(true)}>
                    View diet descriptions
                  </Button>
                </section>
              );
            }}
          />
          {isOtherDiet ? (
            <Controller
              control={control}
              name="dietary_comments"
              render={({ field, fieldState }) => (
                <Label className="grid gap-1">
                  Dietary comments
                  <Textarea value={field.value} onChange={(v) => field.onChange(v)} />
                  {fieldState.error?.message != null ? (
                    <p role="alert">{String(fieldState.error.message)}</p>
                  ) : null}
                </Label>
              )}
            />
          ) : null}
        </CardContent>
      </Card>

      <DietDescriptionsDialog
        open={descriptionsOpen}
        onOpenChange={setDescriptionsOpen}
        dietTypes={dietTypes}
      />

      <Card>
        <CardHeader>
          <CardTitle>Immunisation</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Controller
            control={control}
            name="is_fully_immunised"
            render={({ field }) => (
              <Label className="grid grid-cols-[auto_1fr] items-center gap-2">
                <Checkbox checked={field.value} onChange={(v) => field.onChange(v)} />
                Fully immunised
              </Label>
            )}
          />
          <FormField<MedicalProfileFormValues> name="last_tetanus_date" label="Last tetanus date" type="date" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Support</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Controller
            control={control}
            name="requires_support"
            render={({ field }) => (
              <Label className="grid grid-cols-[auto_1fr] items-center gap-2">
                <Checkbox checked={field.value} onChange={(v) => field.onChange(v)} />
                Requires support
              </Label>
            )}
          />
          <Controller
            control={control}
            name="support_details"
            render={({ field, fieldState }) => (
              <Label className="grid gap-1">
                Support details
                <Textarea value={field.value} onChange={(v) => field.onChange(v)} />
                {fieldState.error?.message != null ? (
                  <p role="alert">{String(fieldState.error.message)}</p>
                ) : null}
              </Label>
            )}
          />
        </CardContent>
        <CardFooter className="text-right">
          <Button type="submit" variant="default" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save medical profile'}
          </Button>
        </CardFooter>
      </Card>

      <MedicalProfileDisplay conditions={conditions} />
    </article>
  );
}

export function MedicalProfileForm({
  formKey,
  defaultValues,
  schema,
  dietTypes,
  menuLabelHint,
  conditions,
  isSubmitting,
  onSubmit,
}: MedicalProfileFormProps) {
  return (
    <Form<MedicalProfileFormValues>
      key={formKey}
      schema={schema}
      defaultValues={defaultValues}
      onSubmit={onSubmit}
    >
      <MedicalProfileFormInner
        conditions={conditions}
        isSubmitting={isSubmitting}
        dietTypes={dietTypes}
        menuLabelHint={menuLabelHint}
      />
    </Form>
  );
}
