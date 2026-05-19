/** Env-only check (no Supabase client import) for surfaces that gate on browser config. */
export function hasSupabaseBrowserConfig(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL ?? '';
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
  return Boolean(url && key);
}
