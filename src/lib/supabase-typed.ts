import type { SupabaseClient } from '@supabase/supabase-js';
import type { RBACSupabaseClient } from '@solvera/pace-core/rbac';
import type { Database } from '@/types/pace-database';

/** Narrows the RBAC/secure client to a typed Supabase client for table queries. */
export function toTypedSupabase(client: RBACSupabaseClient | null): SupabaseClient<Database> | null {
  return client as unknown as SupabaseClient<Database> | null;
}
