import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('gen_session_id')?.value;

    if (!sessionId) {
        return NextResponse.json({ authenticated: false });
    }

    const { data: session, error } = await supabase
        .from("citizen_sessions")
        .select("citizen_id, jan_aadhaar_id, metadata")
        .eq("id", sessionId)
        .eq("is_active", true)
        .single();

    if (error || !session) {
        return NextResponse.json({ authenticated: false });
    }

    // Also get the verification status if possible, but Jan Aadhaar ID is key
    return NextResponse.json({
        authenticated: true,
        jan_aadhaar_id: session.jan_aadhaar_id,
        citizen_id: session.citizen_id
    });
}
