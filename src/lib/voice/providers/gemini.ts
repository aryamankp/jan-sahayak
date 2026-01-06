import { ReasoningEngine, IntentResult } from "../core";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

export class GeminiService implements ReasoningEngine {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async analyze(
        text: string,
        context: Record<string, any>,
        history: { role: "user" | "assistant"; content: string }[] = [],
        availableSchemes: string[] = []
    ): Promise<IntentResult> {
        const schemeListStr = availableSchemes.length > 0
            ? availableSchemes.map((s, i) => `${i + 1}. ${s}`).join("\n")
            : "No schemes loaded.";

        const systemPrompt = `
You are Jan Sahayak, an intelligent Voice-First Citizen Assistant for Rajasthan.
You have TWO MODES of operation. Dynamically switch between them based on the user's need.

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
1. **Analyze Request:** Identify Intent (Information vs. Action).
2. **Check Eligibility:** ALWAYS check user_profile (Age, Income) against scheme rules before advising.
3. **Response Logic:**
    - **Apply:** If User says "Apply for Pension" -> Return intent "APPLY_SERVICE".
    - **Guide:** If User says "How do I apply?" -> Return intent "EXPLAIN_SCHEME".
    - **Status:** "CHECK_STATUS"
    - **Benefits:** "CHECK_BENEFITS"
    - **Notifications:** "CHECK_NOTIFICATIONS"
    - **Eligibility:** "CHECK_ELIGIBILITY"
    - **Greeting:** "GREETING"
4. **Tone:** Professional, Helper, "Senior Officer" vibe.

IMPORTANT: 
- You MUST respond with a valid JSON object.
- If you can't do it directly, fall back to CONSULTANT MODE and give them the Link/Process.

REQUIRED JSON FORMAT:
{
  "intent": "CHECK_STATUS|APPLY_SERVICE|CHECK_BENEFITS|CHECK_NOTIFICATIONS|CHECK_ELIGIBILITY|EXPLAIN_SCHEME|GREETING|CONFIRMATION_YES|CONFIRMATION_NO|CLARIFICATION|ERROR",
  "confidence": 0.0-1.0,
  "ui_action": "NONE|SHOW_STATUS|SHOW_BENEFITS|SHOW_NOTIFICATIONS|SHOW_CONFIRMATION|SHOW_SUCCESS|SHOW_ERROR",
  "next_question": "Hindi response to user",
  "service_category": "optional service name",
  "missing_fields": ["optional array of missing fields"],
  "data": {}
}
`;

        // Build conversation for Gemini
        const contents = [];

        // Add history
        for (const msg of history) {
            contents.push({
                role: msg.role === "assistant" ? "model" : "user",
                parts: [{ text: msg.content }]
            });
        }

        // Add current user message
        contents.push({
            role: "user",
            parts: [{ text: text }]
        });

        try {
            const response = await fetch(`${GEMINI_API_URL}?key=${this.apiKey}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    contents,
                    systemInstruction: {
                        parts: [{ text: systemPrompt }]
                    },
                    generationConfig: {
                        responseMimeType: "application/json",
                        temperature: 0.1,
                        maxOutputTokens: 1024
                    }
                }),
            });

            if (!response.ok) {
                const err = await response.text();
                console.error("Gemini Reasoning Error:", err);
                throw new Error(`Gemini failed: ${response.statusText}`);
            }

            const data = await response.json();
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!content) throw new Error("No content from Gemini");

            // Parse JSON response
            const parsed = JSON.parse(content);

            return {
                intent: parsed.intent || "ERROR",
                confidence: parsed.confidence || 0.5,
                ui_action: parsed.ui_action || "NONE",
                next_question: parsed.next_question || "कृपया फिर से बताएं।",
                service_category: parsed.service_category,
                missing_fields: parsed.missing_fields,
                data: parsed.data
            } as IntentResult;
        } catch (error) {
            console.error("Gemini reasoning error:", error);
            return {
                intent: "ERROR",
                confidence: 0,
                ui_action: "SHOW_ERROR",
                next_question: "तकनीकी समस्या है। कृपया फिर से प्रयास करें।",
            };
        }
    }
}
