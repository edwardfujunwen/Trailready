/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Database types ──────────────────────────────────────────────────────────
export interface SavedTrip {
  id: string;
  user_id: string;
  name: string;
  trip_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
