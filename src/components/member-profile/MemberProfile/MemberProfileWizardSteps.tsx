import { useCallback, useMemo } from 'react';
import { Controller, useFieldArray, useFormContext } from '@solvera/pace-core/forms';
import {
  AddressField,
  createGoogleMapsJsAddressProviderAdapter,
  type FormFieldMeta,
} from '@solvera/pace-core/forms';
import {
  Button,
  Checkbox,
  FormField,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@solvera/pace-core/components';
import { Trash2 } from '@solvera/pace-core/icons';
import type { ReferenceDataBundle } from '@/shared/hooks/useReferenceData';
import type { GoogleMapsPreloadState } from '@/hooks/auth/useProfileCompletionWizard';
import {
  emptyAddressValue,
  type MemberProfileFormValues,
} from '@/components/member-profile/MemberProfile/memberProfileWizardSchema';

type MemberProfileWizardStepsProps = {
  currentStep: number;
  referenceData: ReferenceDataBundle | null;
  mapsPreload: GoogleMapsPreloadState;
};

const residentialMeta: FormFieldMeta = {
  id: 'residential',
  fieldType: 'address',
  label: 'Residential address',
  required: true,
};

const postalMeta: FormFieldMeta = {
  id: 'postal',
  fieldType: 'address',
  label: 'Postal address',
  required: false,
};

export function MemberProfileWizardSteps({
  currentStep,
  referenceData,
  mapsPreload,
}: MemberProfileWizardStepsProps) {
  const { control: typedControl, watch, setValue } = useFormContext<MemberProfileFormValues>();
  const addressControl = typedControl as never;
  const postalSameAsResidential = watch('postal_same_as_residential');

  const addressProvider = useMemo(() => {
    if (mapsPreload.phase !== 'ready' || !mapsPreload.result.ok) {
      return null;
    }
    if (mapsPreload.result.data.status !== 'loaded') {
      return null;
    }
    return createGoogleMapsJsAddressProviderAdapter();
  }, [mapsPreload]);

  const { fields, append, remove } = useFieldArray({ control: typedControl, name: 'phones' });

  const addPhoneRow = useCallback(() => {
    append({ phone_number: '', phone_type_id: null });
  }, [append]);

  const selectedGenderName = useCallback(
    (value: number | null): string => {
      if (value == null) return 'Not specified';
      return referenceData?.genderTypes.find((g) => g.id === value)?.name ?? 'Not specified';
    },
    [referenceData]
  );

  const selectedPronounName = useCallback(
    (value: number | null): string => {
      if (value == null) return 'Not specified';
      return referenceData?.pronounTypes.find((p) => p.id === value)?.name ?? 'Not specified';
    },
    [referenceData]
  );

  const selectedPhoneTypeName = useCallback(
    (value: number | null): string => {
      if (value == null) return 'Not specified';
      return referenceData?.phoneTypes.find((t) => t.id === value)?.name ?? 'Not specified';
    },
    [referenceData]
  );

  const selectedMembershipTypeName = useCallback(
    (value: number | null): string => {
      if (value == null) return 'Not specified';
      return referenceData?.membershipTypes.find((m) => m.id === value)?.name ?? 'Not specified';
    },
    [referenceData]
  );

  if (referenceData == null) {
    return null;
  }

  if (currentStep === 0) {
    return (
      <section className="grid gap-4 md:grid-cols-2" aria-label="Personal details fields">
        <FormField name="first_name" label="First name" required />
        <FormField name="last_name" label="Last name" required />
        <FormField name="middle_name" label="Middle name" />
        <FormField name="preferred_name" label="Preferred name" />
        <FormField name="email" label="Email" required type="email" />
        <FormField name="date_of_birth" label="Date of birth" required type="date" />
        <fieldset className="grid min-w-0 gap-4 border-0 p-0 md:col-span-2 md:grid-cols-2">
          <Controller
            name="gender_id"
            control={typedControl}
            render={({ field, fieldState }) => (
              <Label className="grid gap-1" aria-invalid={fieldState.invalid}>
                Gender
                <Select
                  value={field.value == null ? '' : String(field.value)}
                  onValueChange={(v) => field.onChange(v === '' ? null : Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender">{selectedGenderName(field.value)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Not specified</SelectItem>
                    {referenceData.genderTypes.map((g) => (
                      <SelectItem key={g.id} value={String(g.id)}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Label>
            )}
          />
          <Controller
            name="pronoun_id"
            control={typedControl}
            render={({ field, fieldState }) => (
              <Label className="grid gap-1" aria-invalid={fieldState.invalid}>
                Pronouns
                <Select
                  value={field.value == null ? '' : String(field.value)}
                  onValueChange={(v) => field.onChange(v === '' ? null : Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select pronouns">{selectedPronounName(field.value)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Not specified</SelectItem>
                    {referenceData.pronounTypes.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Label>
            )}
          />
        </fieldset>
      </section>
    );
  }

  if (currentStep === 1) {
    return (
      <section className="grid gap-4 md:grid-cols-2" aria-label="Contact details fields">
        <fieldset className="grid min-w-0 gap-3 border-0 p-0">
          <AddressField
            meta={residentialMeta}
            control={addressControl}
            name="residential"
            provider={addressProvider}
            showAddressSearch={addressProvider != null}
            componentRestrictions={addressProvider != null ? { country: ['au', 'nz'] } : undefined}
          />
          <Controller
            name="postal_same_as_residential"
            control={typedControl}
            render={({ field }) => (
              <Label className="grid grid-cols-[auto_1fr] items-center gap-2">
                <Checkbox
                  checked={field.value}
                  onChange={(v) => {
                    field.onChange(v);
                    if (v) {
                      setValue('postal', undefined, { shouldDirty: true, shouldValidate: true });
                    } else {
                      setValue('postal', emptyAddressValue(), { shouldDirty: true, shouldValidate: true });
                    }
                  }}
                  aria-label="Postal address same as residential"
                />
                <span>Postal address is the same as residential</span>
              </Label>
            )}
          />
          {!postalSameAsResidential ? (
            <fieldset className="grid min-w-0 gap-2 border-0 p-0">
              <AddressField
                meta={postalMeta}
                control={addressControl}
                name="postal"
                provider={addressProvider}
                showAddressSearch={addressProvider != null}
                componentRestrictions={addressProvider != null ? { country: ['au', 'nz'] } : undefined}
              />
            </fieldset>
          ) : null}
        </fieldset>

        <fieldset className="grid gap-3 border-0 p-0" aria-label="Phone numbers">
          {fields.map((f, index) => (
            <article
              key={f.id}
              className={
                fields.length > 1
                  ? 'grid gap-2 rounded-md border border-sec-200 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center'
                  : 'grid gap-2 rounded-md border border-sec-200 p-3 md:grid-cols-2 md:items-start'
              }
            >
              <section className="min-w-0">
                <Controller
                  name={`phones.${index}.phone_number` as const}
                  control={typedControl}
                  render={({ field, fieldState }) => (
                    <section className="grid gap-1">
                      <Label className="grid gap-1" aria-invalid={fieldState.invalid}>
                        Phone number {index + 1}
                        {index === 0 ? ' *' : ''}
                        <Input
                          value={field.value ?? ''}
                          onChange={(v) => field.onChange(v)}
                          onBlur={field.onBlur}
                          ref={field.ref}
                          aria-invalid={fieldState.invalid}
                        />
                      </Label>
                      {fieldState.error?.message != null ? (
                        <p role="alert">{String(fieldState.error.message)}</p>
                      ) : null}
                    </section>
                  )}
                />
              </section>
              <section className="min-w-0">
                <Controller
                  name={`phones.${index}.phone_type_id` as const}
                  control={typedControl}
                  render={({ field, fieldState }) => (
                    <Label className="grid gap-1" aria-invalid={fieldState.invalid}>
                      Phone type
                      <Select
                        value={field.value == null ? '' : String(field.value)}
                        onValueChange={(v) => field.onChange(v === '' ? null : Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Type">{selectedPhoneTypeName(field.value)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Not specified</SelectItem>
                          {referenceData.phoneTypes.map((t) => (
                            <SelectItem key={t.id} value={String(t.id)}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Label>
                  )}
                />
              </section>
              {fields.length > 1 ? (
                <section className="grid place-items-center">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove phone number ${index + 1}`}
                    onClick={() => remove(index)}
                  >
                    <Trash2 />
                  </Button>
                </section>
              ) : null}
            </article>
          ))}
          <Button type="button" variant="secondary" onClick={addPhoneRow}>
            Add another phone
          </Button>
        </fieldset>
      </section>
    );
  }

  if (currentStep === 2) {
    return (
      <section className="grid gap-4 md:grid-cols-2" aria-label="Membership details fields">
        <FormField name="membership_number" label="Membership number" />
        <Controller
          name="membership_type_id"
          control={typedControl}
          render={({ field, fieldState }) => (
            <Label className="grid gap-1" aria-invalid={fieldState.invalid}>
              Membership type
              <Select
                value={field.value == null ? '' : String(field.value)}
                onValueChange={(v) => field.onChange(v === '' ? null : Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select membership type">
                    {selectedMembershipTypeName(field.value)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Not specified</SelectItem>
                  {referenceData.membershipTypes.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Label>
          )}
        />
      </section>
    );
  }

  return null;
}
