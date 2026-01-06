import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { ProfileService } from "@/lib/services/profile";

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("gen_session_id")?.value;

    if (!sessionId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Fetch Jan Aadhaar ID from session
    const { data: sessionData, error } = await supabase
        .from("citizen_sessions")
        .select("jan_aadhaar_id")
        .eq("id", sessionId)
        .single() as any;

    if (error || !sessionData?.jan_aadhaar_id) {
        return NextResponse.json({ error: "Session invalid" }, { status: 401 });
    }

    try {
        const profile = await ProfileService.getProfile(sessionData.jan_aadhaar_id);
        return NextResponse.json({
            jan_aadhaar_id: profile.personalInfo.jan_aadhaar_id,
            name_hi: profile.personalInfo.head_of_family_hi,
            head_of_family_hi: profile.personalInfo.head_of_family_hi,
            members: profile.personalInfo.members
        });
    } catch (e) {
        return NextResponse.json({ error: "Profile fetch failed" }, { status: 500 });
    }
}
