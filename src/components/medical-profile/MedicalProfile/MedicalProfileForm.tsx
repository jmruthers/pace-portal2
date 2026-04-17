import { Controller, useFormContext } from '@solvera/pace-core/forms';
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Form,
  FormField,
  Label,
  Progress,
  Textarea,
} from '@solvera/pace-core/components';
import { computeMedicalProfileProgress } from '@/shared/lib/medicalProfileProgress';
import {
  medicalProfileSchema,
  type MedicalProfileFormValues,
} from '@/utils/medical-profile/validation';
import { MedicalProfileDisplay } from '@/components/medical-profile/MedicalProfile/MedicalProfileDisplay';
import type { MedicalConditionSummaryRow } from '@/hooks/medical-profile/useMedicalProfileData';

export type MedicalProfileFormProps = {
  formKey: string;
  defaultValues: MedicalProfileFormValues;
  conditions: MedicalConditionSummaryRow[];
  isSubmitting: boolean;
  onSubmit: (values: MedicalProfileFormValues) => void | Promise<void>;
};

function MedicalProfileFormInner({
  conditions,
  isSubmitting,
}: {
  conditions: MedicalConditionSummaryRow[];
  isSubmitting: boolean;
}) {
  const ctx = useFormContext<MedicalProfileFormValues>();
  const { watch } = ctx;
  const watched = watch();
  const progress = computeMedicalProfileProgress(watched);
  const pct = Math.round(progress.completionRatio * 100);

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
          <Controller
            control={ctx.control}
            name="has_dietary_requirements"
            render={({ field }) => (
              <Label className="grid grid-cols-[auto_1fr] items-center gap-2">
                <Checkbox checked={field.value} onChange={(v) => field.onChange(v)} />
                Dietary requirements
              </Label>
            )}
          />
          <Controller
            control={ctx.control}
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
          <FormField<MedicalProfileFormValues> name="menu_selection" label="Menu selection" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Immunisation</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Controller
            control={ctx.control}
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
          <CardTitle>Support and carer</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Controller
            control={ctx.control}
            name="requires_support"
            render={({ field }) => (
              <Label className="grid grid-cols-[auto_1fr] items-center gap-2">
                <Checkbox checked={field.value} onChange={(v) => field.onChange(v)} />
                Requires support
              </Label>
            )}
          />
          <Controller
            control={ctx.control}
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
          <Controller
            control={ctx.control}
            name="has_carer"
            render={({ field }) => (
              <Label className="grid grid-cols-[auto_1fr] items-center gap-2">
                <Checkbox checked={field.value} onChange={(v) => field.onChange(v)} />
                Has carer
              </Label>
            )}
          />
          <FormField<MedicalProfileFormValues> name="carer_name" label="Carer name" />
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
  conditions,
  isSubmitting,
  onSubmit,
}: MedicalProfileFormProps) {
  return (
    <Form<MedicalProfileFormValues>
      key={formKey}
      schema={medicalProfileSchema}
      defaultValues={defaultValues}
      onSubmit={onSubmit}
    >
      <MedicalProfileFormInner conditions={conditions} isSubmitting={isSubmitting} />
    </Form>
  );
}
