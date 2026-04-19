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
  FormField,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@solvera/pace-core/components';
import type { ContactTypeOption } from '@/components/contacts/ContactForm/RelationshipFormStep';
import {
  contactFullFormSchema,
  type ContactFullFormValues,
} from '@/utils/contacts/validation';

export type PhoneTypeOption = {
  id: number;
  name: string;
};

export type FullFormStepProps = {
  mode: 'create' | 'edit';
  contactTypes: ReadonlyArray<ContactTypeOption>;
  phoneTypes: ReadonlyArray<PhoneTypeOption>;
  permissionOptions: ReadonlyArray<string>;
  defaultValues: ContactFullFormValues;
  canBack: boolean;
  isSaving: boolean;
  onBack: () => void;
  onCancel: () => void;
  onSubmit: (values: ContactFullFormValues) => Promise<void> | void;
};

export function FullFormStep({
  mode,
  contactTypes,
  phoneTypes,
  permissionOptions,
  defaultValues,
  canBack,
  isSaving,
  onBack,
  onCancel,
  onSubmit,
}: FullFormStepProps) {
  const form = useZodForm<ContactFullFormValues>({
    schema: contactFullFormSchema,
    defaultValues,
    mode: 'onBlur',
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === 'edit' ? 'Edit contact' : 'Contact details'}</CardTitle>
      </CardHeader>
      <CardContent>
        <FormProvider {...form}>
          <section className="grid gap-4 md:grid-cols-2" aria-label="Contact details form">
            <Controller
              control={form.control}
              name="contact_type_id"
              render={({ field, fieldState }) => (
                <Label className="grid gap-1">
                  Relationship type
                  <Select value={field.value} onValueChange={(value) => field.onChange(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship type" />
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
                      <SelectValue placeholder="Select permission type" />
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
            <FormField<ContactFullFormValues> name="first_name" label="First name" required />
            <FormField<ContactFullFormValues> name="last_name" label="Last name" required />
            <FormField<ContactFullFormValues> name="preferred_name" label="Preferred name" />
            <FormField<ContactFullFormValues>
              name="email"
              label="Email"
              type="email"
              placeholder="Enter email address"
            />
            <FormField<ContactFullFormValues>
              name="phone_number"
              label="Phone number"
              placeholder="Enter phone number"
            />
            <Controller
              control={form.control}
              name="phone_type_id"
              render={({ field, fieldState }) => (
                <Label className="grid gap-1">
                  Phone type
                  <Select
                    value={field.value != null ? String(field.value) : ''}
                    onValueChange={(value) => field.onChange(value === '' ? null : Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select phone type" />
                    </SelectTrigger>
                    <SelectContent>
                      {phoneTypes.map((option) => (
                        <SelectItem key={option.id} value={String(option.id)}>
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
          </section>
        </FormProvider>
      </CardContent>
      <CardFooter className="grid gap-2 md:grid-cols-4">
        <Button type="button" variant="ghost" disabled={!canBack} onClick={onBack}>
          Back
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="default"
          disabled={isSaving}
          onClick={() => {
            void form.handleSubmit(async (values) => {
              await onSubmit(values);
            })();
          }}
        >
          {isSaving ? 'Saving…' : 'Save contact'}
        </Button>
      </CardFooter>
    </Card>
  );
}
