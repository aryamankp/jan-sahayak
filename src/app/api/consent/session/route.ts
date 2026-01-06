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
        const { consent_type, purpose_hi, purpose_en } = body;

        const sessionId = request.cookies.get("gen_session_id")?.value;

        if (!sessionId) {
            return NextResponse.json({ error: "No session" }, { status: 400 });
        }

        // Create consent record
        const consentId = uuidv4();

        const { error } = await supabase.from("consent_logs").insert({
            id: consentId,
            session_id: sessionId,
            consent_type: consent_type || "session",
            data_snapshot: {},
            purpose_hi: purpose_hi || "सत्र सहमति",
            purpose_en: purpose_en || "Session consent",
            ui_confirmation: true,
            confirmed_at: new Date().toISOString()
        });

        if (error) {
            console.error("Consent insert error:", error);
            throw error;
        }

        return NextResponse.json({ success: true, consent_id: consentId });
    } catch (error) {
        console.error("Consent error:", error);
        return NextResponse.json({ error: "Failed to record consent" }, { status: 500 });
    }
}
