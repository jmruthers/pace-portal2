import type { MediConditionTypeRow } from '@/hooks/medical-profile/useMediConditionTypes';

/** Hierarchical path label for a condition type id (e.g. `Respiratory › Asthma`). */
export function buildConditionTypePathLabel(
  id: number,
  types: MediConditionTypeRow[] | undefined
): string {
  const byId = new Map<number, MediConditionTypeRow>();
  for (const t of types ?? []) {
    byId.set(t.id, t);
  }
  const parts: string[] = [];
  let cur: MediConditionTypeRow | undefined = byId.get(id);
  const guard = new Set<number>();
  while (cur && !guard.has(cur.id)) {
    guard.add(cur.id);
    parts.unshift(cur.name);
    cur = cur.parent_id != null ? byId.get(cur.parent_id) : undefined;
  }
  return parts.join(' › ');
}

export function conditionTypesById(types: MediConditionTypeRow[] | undefined): Map<number, MediConditionTypeRow> {
  const m = new Map<number, MediConditionTypeRow>();
  for (const t of types ?? []) {
    m.set(t.id, t);
  }
  return m;
}
