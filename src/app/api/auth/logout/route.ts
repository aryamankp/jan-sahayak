import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase/client";

export async function POST(request: NextRequest) {
    // Clear Server Cookies
    const cookieStore = await cookies();
    cookieStore.delete('gen_session_id');
    cookieStore.delete('gen_citizen_id');

    // Also sign out from Supabase client-side if token was passed, but server-side we mainly clear cookies
    // The client will also call supabase.auth.signOut() 

    return NextResponse.json({ success: true });
}
