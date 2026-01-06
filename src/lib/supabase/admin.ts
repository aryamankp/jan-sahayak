import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceRoleKey) {
    console.warn("SUPABASE_SERVICE_ROLE_KEY is missing! Admin operations may fail.");
}

// Create a client with the Service Role Key to bypass RLS
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey || "", {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
