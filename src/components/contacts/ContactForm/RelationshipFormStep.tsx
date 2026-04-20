import { useEffect } from 'react';
import { useZodForm } from '@solvera/pace-core/hooks';
import { Controller, FormProvider } from '@solvera/pace-core/forms';
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@solvera/pace-core/components';
import {
  contactRelationshipSchema,
  type ContactRelationshipValues,
} from '@/utils/contacts/validation';

export type ContactTypeOption = {
  id: string;
  name: string;
};

export type RelationshipFormStepProps = {
  email: string;
  contactTypes: ReadonlyArray<ContactTypeOption>;
  permissionOptions: ReadonlyArray<string>;
  defaultValues: ContactRelationshipValues;
  onBack: () => void;
  onCancel: () => void;
  onSubmit: (values: ContactRelationshipValues) => void;
};

export function RelationshipFormStep({
  email,
  contactTypes,
  permissionOptions,
  defaultValues,
  onBack,
  onCancel,
  onSubmit,
}: RelationshipFormStepProps) {
  const form = useZodForm<ContactRelationshipValues>({
    schema: contactRelationshipSchema,
    defaultValues,
    mode: 'onBlur',
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const selectedContactTypeId = form.watch('contact_type_id');
  const selectedPermissionType = form.watch('permission_type');
  const contactTypeLabel = contactTypes.find((option) => option.id === selectedContactTypeId)?.name;
  const permissionLabel = permissionOptions.find((option) => option === selectedPermissionType);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Relationship details</CardTitle>
      </CardHeader>
      <CardContent>
        <FormProvider {...form}>
          <section className="grid gap-4 md:grid-cols-2" aria-label="Relationship step">
            <article className="grid gap-1 md:col-span-2" aria-label="Email selected for contact">
              <p>Email</p>
              <p>{email.trim() === '' ? 'No email address' : email}</p>
            </article>
            <Controller
              control={form.control}
              name="contact_type_id"
              render={({ field, fieldState }) => (
                <Label className="grid gap-1">
                  Relationship type
                  <Select value={field.value} onValueChange={(value) => field.onChange(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship type">
                        {contactTypeLabel}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {contactTypes.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error?.message != null ? (
                    <p role="alert">{String(fieldState.error.message)}</p>
                  ) : null}
                </Label>
              )}
            />
            <Controller
              control={form.control}
              name="permission_type"
              render={({ field, fieldState }) => (
                <Label className="grid gap-1">
                  Permission type
                  <Select value={field.value} onValueChange={(value) => field.onChange(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select permission type">
                        {permissionLabel}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {permissionOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error?.message != null ? (
                    <p role="alert">{String(fieldState.error.message)}</p>
                  ) : null}
                </Label>
              )}
            />
          </section>
        </FormProvider>
      </CardContent>
      <CardFooter className="grid gap-2 [grid-template-columns:1fr_1fr] md:[grid-template-columns:repeat(4,minmax(0,1fr))]">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="default"
          onClick={() => {
            void form.handleSubmit((values) => {
              onSubmit(values);
            })();
          }}
        >
          Continue
        </Button>
      </CardFooter>
    </Card>
  );
}
