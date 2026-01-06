import { SpeechToText, ReasoningEngine, IntentResult } from "../core";

const GROQ_API_URL = "https://api.groq.com/openai/v1";

export class GroqService implements SpeechToText, ReasoningEngine {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    // --- STT Implementation (Whisper on Groq) ---
    async transcribe(audioBlob: Blob): Promise<string> {
        const formData = new FormData();
        formData.append("file", audioBlob, "audio.webm"); // Filename is often required
        formData.append("model", "whisper-large-v3");
        formData.append("language", "hi"); // Guide towards Hindi if possible, but let it auto-detect
        // Groq specialized param: response_format="json" (default)

        try {
            const response = await fetch(`${GROQ_API_URL}/audio/transcriptions`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.apiKey}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const err = await response.text();
                console.error("Groq STT Error:", err);
                throw new Error(`STT failed: ${response.statusText}`);
            }

            const data = await response.json();
            return data.text || "";
        } catch (error) {
            console.error("Transcription error:", error);
            throw error;
        }
    }

    // --- Reasoning Implementation (LLaMA-3 on Groq) ---
    async analyze(text: string, context: Record<string, any>, history: { role: "user" | "assistant"; content: string }[] = [], availableSchemes: string[] = []): Promise<IntentResult> {
        const schemeListStr = availableSchemes.length > 0 ? availableSchemes.map((s, i) => `${i + 1}. ${s}`).join("\n") : "No schemes loaded.";

        const systemPrompt = `
You are Jan Sahayak, an intelligent Voice-First Citizen Assistant for Rajasthan.
You have TWO MODES of operation. dynamically switch between them based on the user's need.

MODE A: THE EXECUTOR (for supported actions)
- IF the user wants to Check Status, Check Benefits, or Check Notifications: DO IT.
- IF the user wants to Apply and the scheme supports internal application: HELP THEM APPLY.

MODE B: THE CONSULTANT (for guidance & external flows)
- IF the user asks "How to apply?", "Am I eligible?", or about a scheme with an OFFICIAL LINK:
- GUIDE them. Pre-vet their eligibility.
- Provide the "Golden Path": Official Link + Checklist.
- DO NOT hallucinate. Use the provided KNOWLEDGE LIST.

CURRENT CONTEXT:
${JSON.stringify(context, null, 2)}

AVAILABLE SCHEMES:
${schemeListStr}

INSTRUCTIONS:
1.  **Analyze Request:** Identify Intent (Information vs. Action).
2.  **Check Eligibility:** ALWAYS check user_profile (Age, Income) against scheme rules before advising.
3.  **Response Logic:**
    -   **Greeting:** If user says hello/namaste -> Return intent "GREETING".
    -   **Apply:** If User says "Apply for Pension" -> Return intent "APPLY_SERVICE".
    -   **Guide:** If User says "How do I apply?" -> Return intent "EXPLAIN_SCHEME".
    -   **Status:** "CHECK_STATUS"
    -   **Benefits:** "CHECK_BENEFITS"
    -   **Notifications:** "CHECK_NOTIFICATIONS"
    -   **Eligibility:** "CHECK_ELIGIBILITY"
4.  **Tone:** Professional, Helper, "Senior Officer" vibe.

IMPORTANT:
- If you can't do it directly, fall back to CONSULTANT MODE and give them the Link/Process.
- You MUST respond with valid JSON format only.
- Always include: intent, confidence, ui_action, next_question fields in your json response.
`;

        try {
            const response = await fetch(`${GROQ_API_URL}/chat/completions`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile", // High intelligence model
                    messages: [
                        { role: "system", content: systemPrompt },
                        ...history,
                        { role: "user", content: text }
                    ],
                    response_format: { type: "json_object" }, // Enforce JSON
                    temperature: 0.1, // Low temp for consistent logic
                }),
            });

            if (!response.ok) {
                const err = await response.text();
                console.error("Groq Reasoning Error:", err);
                throw new Error(`Reasoning failed: ${response.statusText}`);
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content;

            if (!content) throw new Error("No content from LLaMA");

            return JSON.parse(content) as IntentResult;
        } catch (error) {
            console.error("Reasoning error:", error);
            // Fallback result
            return {
                intent: "ERROR",
                confidence: 0,
                ui_action: "SHOW_ERROR",
                next_question: "तकनीकी समस्या है। कृपया फिर से प्रयास करें।",
            };
        }
    }
}
