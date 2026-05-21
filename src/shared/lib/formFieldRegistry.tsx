/**
 * CR20 event form field registry (checkbox + select extensions).
 */
import { Controller } from '@solvera/pace-core/forms';
import {
  composeSchemaFromFieldMetadata,
  createDefaultFieldRegistryEntries,
  createFieldRegistry,
  type FormFieldMeta,
} from '@solvera/pace-core/forms';
import {
  Checkbox,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@solvera/pace-core/components';
import { z } from '@solvera/pace-core/utils';

export type EventFormRegistry = ReturnType<typeof createEventFormFieldRegistry>;

function buildCheckboxSchema(meta: FormFieldMeta): z.ZodTypeAny {
  if (meta.required === false) {
    return z.boolean().optional();
  }
  return z.boolean().refine((v) => v === true, { message: 'Required' });
}

function buildSelectSchema(meta: FormFieldMeta): z.ZodTypeAny {
  const base = z.string();
  return meta.required === false ? base.optional() : base.min(1, 'Required');
}

export function createEventFormFieldRegistry() {
  return createFieldRegistry({
    entries: [
      ...createDefaultFieldRegistryEntries(),
      {
        fieldType: 'checkbox',
        buildSchema: buildCheckboxSchema,
        render: ({ meta, control, name }) => (
          <Controller
            name={name as never}
            control={control}
            render={({ field, fieldState }) => (
              <Label className="grid grid-cols-[auto_1fr] items-start gap-3">
                <Checkbox
                  id={`ff-${String(name)}`}
                  checked={Boolean(field.value)}
                  onChange={(next) => field.onChange(next)}
                  aria-invalid={fieldState.error != null}
                />
                <p>
                  {meta.label ?? meta.id}
                  {meta.required !== false ? ' *' : null}
                </p>
              </Label>
            )}
          />
        ),
      },
      {
        fieldType: 'select',
        buildSchema: buildSelectSchema,
        render: ({ meta, control, name }) => {
          const options = Array.isArray(meta.options) ? meta.options : [];
          return (
            <Controller
              name={name as never}
              control={control}
              render={({ field, fieldState }) => (
                <Label className="grid gap-1">
                  {meta.label ?? meta.id}
                  {meta.required !== false ? ' *' : null}
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger aria-invalid={fieldState.error != null}>
                      <SelectValue placeholder="Choose…" />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Label>
              )}
            />
          );
        },
      },
    ],
  });
}

export function composeDynamicFormSchema(registry: EventFormRegistry, fields: FormFieldMeta[]) {
  return composeSchemaFromFieldMetadata(registry, fields);
}
