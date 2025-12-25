import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create Supabase client (optional - only if you need direct Supabase features)
// Install first: npm install @supabase/supabase-js
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
