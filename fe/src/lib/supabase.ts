import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../environments/environment';

export const supabase: SupabaseClient = createClient(
  environment.supabase.url,
  environment.supabase.anonKey,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
);

export interface Route {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  distance: number;
  elevation: number;
  estimated_time: number; // milliseconds
  strava_url: string | null;
  komoot_url: string | null;
  image_path: string | null;
  gpx_path: string | null;
}

/**
 * Fetch all routes ordered by creation time.
 */
export async function getRoutes(): Promise<Route[]> {
  const { data, error } = await supabase
    .from('routes')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) {
    console.error('Error fetching routes:', error);
    throw error;
  }
  return (data ?? []) as Route[];
}

/**
 * Build a public URL for an object in the configured storage bucket.
 */
export function getPublicUrl(path: string): string {
  return supabase.storage.from(environment.supabase.bucket).getPublicUrl(path)
    .data.publicUrl;
}
