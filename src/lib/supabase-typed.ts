import type { SupabaseClient } from '@supabase/supabase-js';
import type { RBACSupabaseClient } from '@solvera/pace-core/rbac';
import type { SupabaseClientLike } from '@solvera/pace-core/utils';
import type { Database } from '@/types/pace-database';

/** Narrows the RBAC/secure client to a typed Supabase client for table queries. */
export function toTypedSupabase(client: RBACSupabaseClient | null): SupabaseClient<Database> | null {
  return client as unknown as SupabaseClient<Database> | null;
}

/** Storage-capable client shape for pace-core FileUpload / useFileDisplay (runtime secure client exposes storage). */
export function toSupabaseClientLike(client: RBACSupabaseClient | null): SupabaseClientLike | null {
  return client as unknown as SupabaseClientLike | null;
}
