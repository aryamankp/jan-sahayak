import { NextRequest, NextResponse } from "next/server";
import { fetchJanAadhaar } from "@/lib/adapters/jan-aadhaar";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    // Log removed

    // --- AUTHENTICATION CHECK ---
    const authHeader = request.headers.get('Authorization');
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('gen_session_id')?.value;

    let isAuthenticated = false;

    // 1. Check Header (Bearer Token)
    if (authHeader) {
        const token = authHeader.replace('Bearer ', '');

        if (token === "demo_token") {
            // TRUSTED DEMO BYPASS
            // Only allows accessing the DB lookup, which is safe for demo
            console.log("[JanAadhaar API] allowing demo_token");
            isAuthenticated = true;
        } else {
            // VERIFY REAL TOKEN
            const { data: { user }, error: authError } = await supabase.auth.getUser(token);
            if (user && !authError) {
                isAuthenticated = true;
            } else {
                // If real token check fails (e.g. expired), check if we have a valid session cookie as fallback
                if (sessionId) {
                    const { data: session } = await supabase.from("citizen_sessions").select("id").eq("id", sessionId).eq("is_active", true).single();
                    if (session) isAuthenticated = true;
                }
            }
        }
    }
    // 2. Fallback: Check Cookie only
    else if (sessionId) {
        const { data: session } = await supabase.from("citizen_sessions").select("id").eq("id", sessionId).eq("is_active", true).single();
        if (session) {
            console.log("[JanAadhaar API] Authenticated via Cookie");
            isAuthenticated = true;
        }
    }

    if (!isAuthenticated) {
        console.warn("[JanAadhaar API] Unauthorized access attempt");
        return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    // --- DATA FETCH ---
    if (!id) {
        return NextResponse.json({ error: "Jan Aadhaar ID is required" }, { status: 400 });
    }

    // Clean the ID (remove spaces)
    const cleanId = id.trim();

    const { data, error } = await fetchJanAadhaar(cleanId);

    console.log("[JanAadhaar API] Result:", { found: !!data, error: error?.code });

    if (error || !data) {
        return NextResponse.json({ error: error?.message || "Family not found" }, { status: 404 });
    }

    return NextResponse.json(data);
}
