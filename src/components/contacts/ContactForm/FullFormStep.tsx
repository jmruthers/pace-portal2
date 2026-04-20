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
  Input,
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
  isLinkExistingPerson: boolean;
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
  isLinkExistingPerson,
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

  const selectedContactTypeId = form.watch('contact_type_id');
  const selectedPermissionType = form.watch('permission_type');
  const selectedPhoneTypeId = form.watch('phone_type_id');
  const selectedContactTypeLabel = contactTypes.find((option) => option.id === selectedContactTypeId)?.name;
  const selectedPermissionLabel = permissionOptions.find((option) => option === selectedPermissionType);
  const selectedPhoneTypeLabel = phoneTypes.find((option) => option.id === selectedPhoneTypeId)?.name;

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
                        <SelectValue placeholder="Select relationship type">
                          {selectedContactTypeLabel}
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
                        {selectedPermissionLabel}
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
            <Controller
              control={form.control}
              name="first_name"
              render={({ field, fieldState }) => (
                <Label className="grid gap-1">
                  First name
                  <Input
                    value={field.value}
                    onChange={(value) => field.onChange(value)}
                    disabled={isLinkExistingPerson}
                  />
                  {fieldState.error?.message != null ? (
                    <p role="alert">{String(fieldState.error.message)}</p>
                  ) : null}
                </Label>
              )}
            />
            <Controller
              control={form.control}
              name="last_name"
              render={({ field, fieldState }) => (
                <Label className="grid gap-1">
                  Last name
                  <Input
                    value={field.value}
                    onChange={(value) => field.onChange(value)}
                    disabled={isLinkExistingPerson}
                  />
                  {fieldState.error?.message != null ? (
                    <p role="alert">{String(fieldState.error.message)}</p>
                  ) : null}
                </Label>
              )}
            />
            <Controller
              control={form.control}
              name="preferred_name"
              render={({ field, fieldState }) => (
                <Label className="grid gap-1">
                  Preferred name
                  <Input
                    value={field.value}
                    onChange={(value) => field.onChange(value)}
                    disabled={isLinkExistingPerson}
                  />
                  {fieldState.error?.message != null ? (
                    <p role="alert">{String(fieldState.error.message)}</p>
                  ) : null}
                </Label>
              )}
            />
            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Label className="grid gap-1">
                  Email
                  <Input
                    type="email"
                    value={field.value}
                    onChange={(value) => field.onChange(value)}
                    placeholder="Enter email address"
                    disabled={isLinkExistingPerson}
                  />
                  {fieldState.error?.message != null ? (
                    <p role="alert">{String(fieldState.error.message)}</p>
                  ) : null}
                </Label>
              )}
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
                      <SelectValue placeholder="Select phone type">
                        {selectedPhoneTypeLabel}
                      </SelectValue>
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
            {isLinkExistingPerson ? (
              <article className="md:col-span-2">
                <p role="status">
                  Name and email come from the matched person record and cannot be changed in this flow.
                </p>
              </article>
            ) : null}
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
