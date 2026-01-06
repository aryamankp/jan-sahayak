import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
    try {
        // 1. Get Session ID from Cookie
        const cookieStore = await cookies();
        const sessionId = cookieStore.get("gen_session_id")?.value;

        if (!sessionId) {
            return NextResponse.json(
                { error: "No active session found to link" },
                { status: 400 }
            );
        }

        // 2. Verify User Authentication (from Request Headers/Supabase Context)
        // We assume the client sends the access_token in the Authorization header
        // Or we rely on the standard Supabase Auth middleware pattern.
        // Here we'll manually verify the token passed in Authorization header for clarity & security.
        const authHeader = request.headers.get("Authorization");
        if (!authHeader) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.replace("Bearer ", "");
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        // Create a client to verify the user
        const supabaseAuthString = createClient(supabaseUrl, supabaseAnonKey);
        const { data: { user }, error: userError } = await supabaseAuthString.auth.getUser(token);

        if (userError || !user) {
            return NextResponse.json({ error: "Invalid User Token" }, { status: 401 });
        }

        // 3. Link Logic: Update citizen_sessions
        // We need Service Role again to update the session row securely if RLS blocks 'other' rows (though RLS might allow if we designed it right, 
        // but the session was created anonymously so "user_id" is null, so "Users can view their own" policy won't match yet).
        // So Service Role is safest to "Claim" the session.

        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        const { error: updateError } = await supabaseAdmin
            .from("citizen_sessions")
            .update({ user_id: user.id })
            .eq("id", sessionId);

        if (updateError) {
            console.error("Session Link Error:", updateError);
            return NextResponse.json(
                { error: "Failed to link session" },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, linked_to: user.id });

    } catch (err) {
        console.error("Link Session API Error:", err);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
