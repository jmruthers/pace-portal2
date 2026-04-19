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
  Checkbox,
  FormField,
  Label,
} from '@solvera/pace-core/components';
import {
  contactEmailLookupSchema,
  type ContactEmailLookupValues,
} from '@/utils/contacts/validation';

export type EmailFormStepProps = {
  defaultEmail: string;
  isCheckingMatch: boolean;
  onCancel: () => void;
  onSubmit: (values: ContactEmailLookupValues) => Promise<void> | void;
};

export function EmailFormStep({
  defaultEmail,
  isCheckingMatch,
  onCancel,
  onSubmit,
}: EmailFormStepProps) {
  const form = useZodForm<ContactEmailLookupValues>({
    schema: contactEmailLookupSchema,
    defaultValues: {
      email: defaultEmail,
      no_email: false,
    },
    mode: 'onBlur',
  });

  useEffect(() => {
    form.reset({
      email: defaultEmail,
      no_email: false,
    });
  }, [defaultEmail, form]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add contact</CardTitle>
      </CardHeader>
      <CardContent>
        <FormProvider {...form}>
          <section className="grid gap-4" aria-label="Contact email lookup">
            <FormField<ContactEmailLookupValues>
              name="email"
              label="Email"
              type="email"
              placeholder="Enter email address"
            />
            <Controller
              control={form.control}
              name="no_email"
              render={({ field }) => (
                <Label className="grid grid-cols-[auto_1fr] items-center gap-2">
                  <Checkbox
                    checked={field.value}
                    onChange={(checked) => field.onChange(checked)}
                    aria-label="Continue without email"
                  />
                  Continue without an email address
                </Label>
              )}
            />
          </section>
        </FormProvider>
      </CardContent>
      <CardFooter className="grid gap-2 [grid-template-columns:1fr_1fr]">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="default"
          disabled={isCheckingMatch}
          onClick={() => {
            void form.handleSubmit(async (values) => {
              await onSubmit(values);
            })();
          }}
        >
          {isCheckingMatch ? 'Checking…' : 'Continue'}
        </Button>
      </CardFooter>
    </Card>
  );
}
