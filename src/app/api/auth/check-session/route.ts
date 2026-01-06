import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("gen_session_id")?.value;

    if (!sessionId) {
        return NextResponse.json({ session_id: null });
    }

    return NextResponse.json({ session_id: sessionId });
}
