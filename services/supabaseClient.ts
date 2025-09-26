
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// These are public-facing keys, safe to be in the client.
// Row Level Security protects the data.
const supabaseUrl = 'https://fcrufuopcbrnstclemoa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjcnVmdW9wY2JybnN0Y2xlbW9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNzM5MDcsImV4cCI6MjA3Mzk0OTkwN30.q0J8z4hUDt7XGxcXLv7xlZ0DcI_F_H2uAAImW3r8B7I';


export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);