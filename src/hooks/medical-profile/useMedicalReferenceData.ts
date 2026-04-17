/**
 * PR09 — reference data for the medical summary form.
 * The minimal summary uses mostly free-text and boolean fields; this hook is a stable seam for future lookups.
 */
export function useMedicalReferenceData() {
  return {
    data: {} as Record<string, never>,
    isLoading: false,
    isError: false,
    error: null as Error | null,
  };
}
