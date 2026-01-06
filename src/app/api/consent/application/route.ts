import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { application_id, consent_id, consent_type, purpose_hi, purpose_en } = body;

        const sessionId = request.cookies.get("gen_session_id")?.value;

        // Create consent record
        const { error } = await supabase.from("consent_logs").insert({
            id: consent_id || uuidv4(),
            session_id: sessionId || null,
            application_id: application_id,
            consent_type: consent_type || "submission",
            data_snapshot: {},
            purpose_hi: purpose_hi || "आवेदन जमा करने की सहमति",
            purpose_en: purpose_en || "Application submission consent",
            ui_confirmation: true,
            confirmed_at: new Date().toISOString()
        });

        if (error) {
            console.error("Consent insert error:", error);
            throw error;
        }

        return NextResponse.json({ success: true, consent_id });
    } catch (error) {
        console.error("Consent error:", error);
        return NextResponse.json({ error: "Failed to record consent" }, { status: 500 });
    }
}
