import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
    try {
        // 1. Init Supabase Service Role Client (for secure creation)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseServiceKey) {
            console.error("SUPABASE_SERVICE_ROLE_KEY is missing");
            return NextResponse.json(
                { error: "Server Configuration Error" },
                { status: 500 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 2. Parse optional metadata (device info from client)
        const body = await request.json().catch(() => ({}));
        const { device_id, metadata } = body;

        // 3. Create Session in DB
        const { data, error } = await supabase
            .from("citizen_sessions")
            .insert({
                device_id: device_id || 'unknown',
                metadata: metadata || {},
                // user_id starts null
            })
            .select("id")
            .single();

        if (error) {
            console.error("Session Create Error:", error);
            return NextResponse.json(
                { error: "Failed to create session" },
                { status: 500 }
            );
        }

        // 4. Set HttpOnly Cookie
        const cookieStore = await cookies();
        cookieStore.set("gen_session_id", data.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 24 * 30, // 30 days
            sameSite: "lax",
        });

        return NextResponse.json({ success: true, session_id: data.id });
    } catch (err) {
        console.error("Session API Error:", err);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
