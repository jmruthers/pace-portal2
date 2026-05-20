import type { SupabaseClient } from '@supabase/supabase-js';
import type { RBACSupabaseClient } from '@solvera/pace-core/rbac';
import type { Database } from '@/types/pace-database';
import type {
  TracAccommodationRow,
  TracActivityRow,
  TracItineraryAssignmentRow,
  TracTransportRow,
} from '@/lib/participantItineraryRows';

/** Minimal TRAC tables for participant itinerary reads (PR21). */
export type ParticipantItineraryDatabase = Database & {
  public: Database['public'] & {
    Tables: Database['public']['Tables'] & {
      trac_itinerary_assignment: {
        Row: TracItineraryAssignmentRow;
        Insert: TracItineraryAssignmentRow;
        Update: Partial<TracItineraryAssignmentRow>;
        Relationships: [];
      };
      trac_transport: {
        Row: TracTransportRow;
        Insert: TracTransportRow;
        Update: Partial<TracTransportRow>;
        Relationships: [];
      };
      trac_activity: {
        Row: TracActivityRow;
        Insert: TracActivityRow;
        Update: Partial<TracActivityRow>;
        Relationships: [];
      };
      trac_accommodation: {
        Row: TracAccommodationRow;
        Insert: TracAccommodationRow;
        Update: Partial<TracAccommodationRow>;
        Relationships: [];
      };
    };
  };
};

/** Narrows the secure client for TRAC itinerary table queries. */
export function toItinerarySupabase(
  client: RBACSupabaseClient | null
): SupabaseClient<ParticipantItineraryDatabase> | null {
  return client as unknown as SupabaseClient<ParticipantItineraryDatabase> | null;
}
