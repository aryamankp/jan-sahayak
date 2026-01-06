import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
    try {
        const { language } = await request.json();

        if (!language || !["hi", "en"].includes(language)) {
            return NextResponse.json({ error: "Invalid language" }, { status: 400 });
        }

        const sessionId = request.cookies.get("gen_session_id")?.value;

        if (sessionId) {
            // Update existing session
            await supabase
                .from("citizen_sessions")
                .update({ language })
                .eq("id", sessionId);
        }

        // Set language cookie
        const response = NextResponse.json({ success: true, language });
        response.cookies.set("gen_language", language, {
            path: "/",
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 365 // 1 year
        });

        return response;
    } catch (error) {
        console.error("Language update error:", error);
        return NextResponse.json({ error: "Failed to update language" }, { status: 500 });
    }
}
