import { NextRequest, NextResponse } from "next/server";
import { VoiceOrchestrator } from "@/lib/voice/orchestrator";

export async function POST(req: NextRequest) {
    try {
        // 1. Basic Security: Origin Check
        const origin = req.headers.get("origin");
        const host = req.headers.get("host"); // e.g. localhost:3000

        // Allow requests only from same origin (or if no origin - e.g. server-side/Postman if dev allowed)
        // In production, strictly enforce origin match
        if (process.env.NODE_ENV === "production" && origin && host && !origin.includes(host)) {
            return NextResponse.json({ error: "Unauthorized Origin" }, { status: 403 });
        }

        const formData = await req.formData();
        const audioFile = formData.get("audio") as Blob | null;
        const textInput = formData.get("text") as string | null;
        const contextStr = formData.get("context") as string;

        const historyStr = formData.get("history") as string;
        let history: { role: "user" | "assistant"; content: string }[] = [];
        if (historyStr) {
            try {
                history = JSON.parse(historyStr);
            } catch (e) {
                console.error("Failed to parse history", e);
            }
        }

        // Parse context safely
        let context = {};
        if (contextStr) {
            try {
                context = JSON.parse(contextStr);
            } catch (e) {
                console.error("Failed to parse context", e);
            }
        }

        const orchestrator = new VoiceOrchestrator();
        const result = await orchestrator.processTurn({
            audioBlob: audioFile || undefined,
            textInput: textInput || undefined,
            context,
            history,
        });

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("Voice Turn Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error", details: error.message },
            { status: 500 }
        );
    }
}
