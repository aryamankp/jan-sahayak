import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const sessionId = request.cookies.get("gen_session_id")?.value;

    if (!sessionId) {
        return NextResponse.json({ hasSession: false, language: null });
    }

    // Return session exists
    // In a real implementation, we'd fetch the language from DB
    return NextResponse.json({
        hasSession: true,
        language: request.cookies.get("gen_language")?.value || null
    });
}
