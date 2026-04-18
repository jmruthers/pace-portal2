import { useMemo, useState } from 'react';
import { Button, Input, Label } from '@solvera/pace-core/components';
import type { MediConditionTypeRow } from '@/hooks/medical-profile/useMediConditionTypes';
import { buildConditionTypePathLabel } from '@/utils/medical-profile/conditionTypeLabel';

export type ConditionTypeDropdownProps = {
  types: MediConditionTypeRow[] | undefined;
  value: number;
  onChange: (conditionTypeId: number) => void;
  disabled?: boolean;
  errorMessage?: string | null;
};

/**
 * Searchable hierarchical condition type list (PR10).
 */
export function ConditionTypeDropdown({
  types,
  value,
  onChange,
  disabled,
  errorMessage,
}: ConditionTypeDropdownProps) {
  const [filter, setFilter] = useState('');

  const options = useMemo(() => {
    const list = types ?? [];
    const q = filter.trim().toLowerCase();
    return list
      .map((t) => ({
        id: t.id,
        label: buildConditionTypePathLabel(t.id, list),
      }))
      .filter((o) => (q === '' ? true : o.label.toLowerCase().includes(q)))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [filter, types]);

  return (
    <section className="grid gap-2" aria-label="Condition type">
      <Label className="grid gap-2">
        Condition type
        <Input
          type="search"
          value={filter}
          onChange={(v) => setFilter(v)}
          placeholder="Search types"
          disabled={disabled}
          aria-label="Filter condition types"
        />
      </Label>
      <ul className="grid max-h-[min(40vh,320px)] gap-1 overflow-auto border border-sec-200 rounded-md">
        {options.map((o) => (
          <li key={o.id}>
            <Button
              type="button"
              variant={o.id === value ? 'default' : 'outline'}
              className="w-full justify-start"
              disabled={disabled}
              onClick={() => onChange(o.id)}
            >
              {o.label}
            </Button>
          </li>
        ))}
      </ul>
      {errorMessage ? (
        <p role="alert">{errorMessage}</p>
      ) : null}
    </section>
  );
}
