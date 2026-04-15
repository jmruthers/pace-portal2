import {
  AddressField,
  Controller,
  useFieldArray,
  useFormContext,
  type AddressProviderAdapter,
} from '@solvera/pace-core/forms';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@solvera/pace-core/components';
import { computeProfileProgress } from '@/shared/lib/profileProgress';
import type { MemberProfileReferenceData } from '@/hooks/member-profile/useMemberAdditionalFields';
import { memberProfileSchema, type MemberProfileFormValues } from '@/utils/member-profile/validation';

export type { MemberProfileFormValues } from '@/utils/member-profile/validation';
export type { MemberProfileFormPhone } from '@/utils/member-profile/validation';

export type MemberProfileFormProps = {
  formKey: string;
  defaultValues: MemberProfileFormValues;
  referenceData: MemberProfileReferenceData;
  addressProvider: AddressProviderAdapter | null;
  isSubmitting: boolean;
  onSubmit: (values: MemberProfileFormValues) => void | Promise<void>;
};

function MemberProfileFormFields({
  referenceData,
  addressProvider,
  isSubmitting,
}: Omit<MemberProfileFormProps, 'formKey' | 'defaultValues' | 'onSubmit'>) {
  const { control, watch } = useFormContext<MemberProfileFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'phones' });
  const postalSame = watch('postal_same_as_residential');

  const watched = watch();
  const progress = computeProfileProgress({
    person: {
      first_name: watched.first_name,
      last_name: watched.last_name,
      email: watched.email,
      date_of_birth: watched.date_of_birth,
      preferred_name: watched.preferred_name ?? null,
      gender_id: watched.gender_id,
      pronoun_id: watched.pronoun_id,
    },
    member: {
      membership_type_id: watched.membership_type_id ?? null,
      membership_number: watched.membership_number ?? null,
    },
  });
  const pct = Math.round(progress.completionRatio * 100);

  return (
    <>
      <section className="grid gap-2" aria-label="Profile completion">
        <p>Profile completion</p>
        <Progress value={pct} max={100} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Personal information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FormField<MemberProfileFormValues> name="first_name" label="First name" required />
          <FormField<MemberProfileFormValues> name="last_name" label="Last name" required />
          <FormField<MemberProfileFormValues> name="middle_name" label="Middle name" />
          <FormField<MemberProfileFormValues> name="preferred_name" label="Preferred name" />
          <FormField<MemberProfileFormValues> name="email" label="Email" required type="email" />
          <FormField<MemberProfileFormValues> name="date_of_birth" label="Date of birth" required type="date" />
          <Controller
            control={control}
            name="gender_id"
            render={({ field, fieldState }) => (
              <Label className="grid gap-1">
                Gender *
                <Select
                  value={field.value ? String(field.value) : ''}
                  onValueChange={(v) => field.onChange(v ? Number(v) : 0)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {referenceData.genderTypes.map((g) => (
                      <SelectItem key={g.id} value={String(g.id)}>
                        {g.name}
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
            control={control}
            name="pronoun_id"
            render={({ field, fieldState }) => (
              <Label className="grid gap-1">
                Pronouns *
                <Select
                  value={field.value ? String(field.value) : ''}
                  onValueChange={(v) => field.onChange(v ? Number(v) : 0)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select pronouns" />
                  </SelectTrigger>
                  <SelectContent>
                    {referenceData.pronounTypes.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <section aria-label="Residential address">
            <h3>Residential address</h3>
            <AddressField
              meta={{
                id: 'residential',
                fieldType: 'address',
                label: 'Residential address',
                required: true,
              }}
              control={control as never}
              name="residential"
              provider={addressProvider}
              componentRestrictions={{ country: ['au', 'nz'] }}
            />
          </section>
          <Controller
            control={control}
            name="postal_same_as_residential"
            render={({ field }) => (
              <Label className="grid grid-cols-[auto_1fr] items-center gap-2">
                <Checkbox
                  checked={field.value}
                  onChange={(v) => field.onChange(v)}
                  aria-label="Postal address same as residential"
                />
                <span>Postal address is the same as residential</span>
              </Label>
            )}
          />
          {!postalSame ? (
            <section aria-label="Postal address">
              <h3>Postal address</h3>
              <AddressField
                meta={{
                  id: 'postal',
                  fieldType: 'address',
                  label: 'Postal address',
                  required: true,
                }}
                control={control as never}
                name="postal"
                provider={addressProvider}
                componentRestrictions={{ country: ['au', 'nz'] }}
              />
            </section>
          ) : null}

          <section className="grid gap-2" aria-label="Phone numbers">
            <h3>Phone numbers</h3>
            <ul className="grid gap-3">
              {fields.map((f, index) => (
                <li key={f.id}>
                  <section className="grid gap-2 rounded-md border border-sec-200 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                  <FormField<MemberProfileFormValues>
                    name={`phones.${index}.phone_number`}
                    label="Number"
                    required
                  />
                  <Controller
                    control={control}
                    name={`phones.${index}.phone_type_id`}
                    render={({ field, fieldState }) => (
                      <Label className="grid gap-1">
                        Type
                        <Select
                          value={field.value != null ? String(field.value) : ''}
                          onValueChange={(v) => field.onChange(v ? Number(v) : null)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            {referenceData.phoneTypes.map((t) => (
                              <SelectItem key={t.id} value={String(t.id)}>
                                {t.name}
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
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={fields.length <= 1}
                    onClick={() => remove(index)}
                  >
                    Remove
                  </Button>
                </section>
                </li>
              ))}
            </ul>
            <Button
              type="button"
              variant="secondary"
              onClick={() => append({ phone_number: '', phone_type_id: null })}
            >
              Add phone
            </Button>
          </section>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Membership</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Controller
            control={control}
            name="membership_type_id"
            render={({ field, fieldState }) => (
              <Label className="grid gap-1">
                Membership type
                <Select
                  value={field.value != null ? String(field.value) : ''}
                  onValueChange={(v) => field.onChange(v ? Number(v) : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {referenceData.membershipTypes.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.name}
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
          <FormField<MemberProfileFormValues> name="membership_number" label="Membership number" />
          <Controller
            control={control}
            name="membership_status"
            render={({ field, fieldState }) => (
              <Label className="grid gap-1 md:col-span-2">
                Membership status
                <Select value={field.value} onValueChange={(v) => field.onChange(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Provisional">Provisional</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Suspended">Suspended</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                    <SelectItem value="Resigned">Resigned</SelectItem>
                  </SelectContent>
                </Select>
                {fieldState.error?.message != null ? (
                  <p role="alert">{String(fieldState.error.message)}</p>
                ) : null}
              </Label>
            )}
          />
        </CardContent>
        <CardFooter className="text-right">
          <Button type="submit" variant="default" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save profile'}
          </Button>
        </CardFooter>
      </Card>
    </>
  );
}

export function MemberProfileForm({
  formKey,
  defaultValues,
  referenceData,
  addressProvider,
  isSubmitting,
  onSubmit,
}: MemberProfileFormProps) {
  return (
    <Form<MemberProfileFormValues>
      key={formKey}
      schema={memberProfileSchema}
      defaultValues={defaultValues}
      onSubmit={onSubmit}
    >
      <MemberProfileFormFields
        referenceData={referenceData}
        addressProvider={addressProvider}
        isSubmitting={isSubmitting}
      />
    </Form>
  );
}
