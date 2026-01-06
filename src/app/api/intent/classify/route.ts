import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Intent Types
const IntentType = {
    SERVICE_SEARCH: "SERVICE_SEARCH",
    SERVICE_INFO: "SERVICE_INFO",
    APPLY_SERVICE: "APPLY_SERVICE",
    CHECK_STATUS: "CHECK_STATUS",
    IDENTITY_FETCH: "IDENTITY_FETCH",
    FILE_COMPLAINT: "FILE_COMPLAINT",
    COMPLAINT_STATUS: "COMPLAINT_STATUS",
    HELP: "HELP",
    HUMAN_ESCALATION: "HUMAN_ESCALATION",
    GREETING: "GREETING",
    THANK_YOU: "THANK_YOU",
    CONFIRMATION_YES: "CONFIRMATION_YES",
    CONFIRMATION_NO: "CONFIRMATION_NO",
    GO_HOME: "GO_HOME",
    GO_BACK: "GO_BACK",
    UNCLEAR: "UNCLEAR",
} as const;

// Service catalog for mapping
const SERVICE_CATALOG: Record<string, { name_hi: string; name_en: string }> = {
    EM_PENSION_STATUS: { name_hi: "वृद्धावस्था पेंशन स्थिति", name_en: "Old Age Pension Status" },
    EM_WIDOW_PENSION: { name_hi: "विधवा पेंशन स्थिति", name_en: "Widow Pension Status" },
    EM_DISABILITY_PENSION: { name_hi: "विकलांग पेंशन स्थिति", name_en: "Disability Pension Status" },
    EM_RATION_STATUS: { name_hi: "राशन कार्ड स्थिति", name_en: "Ration Card Status" },
    JA_CARD_STATUS: { name_hi: "जन आधार कार्ड स्थिति", name_en: "Jan Aadhaar Card Status" },
    EM_CASTE_CERT: { name_hi: "जाति प्रमाण पत्र", name_en: "Caste Certificate" },
    EM_INCOME_CERT: { name_hi: "आय प्रमाण पत्र", name_en: "Income Certificate" },
    EM_DOMICILE_CERT: { name_hi: "मूल निवास प्रमाण पत्र", name_en: "Domicile Certificate" },
    EM_BIRTH_CERT: { name_hi: "जन्म प्रमाण पत्र", name_en: "Birth Certificate" },
    EM_DEATH_CERT: { name_hi: "मृत्यु प्रमाण पत्र", name_en: "Death Certificate" },
};

// Classifier prompt
const CLASSIFIER_PROMPT = `You are an intent classifier for a Rajasthan Government citizen services assistant.
Your task is to classify Hindi/Hinglish/English user speech into specific intents and extract relevant entities.

AVAILABLE SERVICES:
1. पेंशन (Pension): वृद्धावस्था, विधवा, विकलांग पेंशन स्थिति जांचें
2. राशन कार्ड (Ration): राशन कार्ड की स्थिति
3. जन आधार (Jan Aadhaar): जन आधार कार्ड
4. प्रमाण पत्र (Certificates): जाति, आय, मूल निवास, जन्म, मृत्यु

INTENT TYPES:
- SERVICE_SEARCH: User wants to find a service
- SERVICE_INFO: User wants information about a service
- APPLY_SERVICE: User wants to apply for a service
- CHECK_STATUS: User wants to check application status
- IDENTITY_FETCH: User wants to fetch their Jan Aadhaar data
- FILE_COMPLAINT: User wants to file a grievance
- COMPLAINT_STATUS: User wants to check complaint status
- HELP: User needs help or guidance
- HUMAN_ESCALATION: User explicitly asks for human help
- GREETING: User is greeting
- THANK_YOU: User is thanking
- CONFIRMATION_YES: User confirms (हाँ, सही, ठीक है, yes)
- CONFIRMATION_NO: User denies (नहीं, गलत, no)
- GO_HOME: User wants to go to home screen
- GO_BACK: User wants to go back
- UNCLEAR: Cannot determine intent

SERVICE CODES (use exact codes):
- EM_PENSION_STATUS: Old Age Pension
- EM_WIDOW_PENSION: Widow Pension
- EM_DISABILITY_PENSION: Disability Pension
- EM_RATION_STATUS: Ration Card
- JA_CARD_STATUS: Jan Aadhaar Card
- EM_CASTE_CERT: Caste Certificate
- EM_INCOME_CERT: Income Certificate
- EM_DOMICILE_CERT: Domicile Certificate
- EM_BIRTH_CERT: Birth Certificate
- EM_DEATH_CERT: Death Certificate

Respond ONLY with valid JSON in this exact format:
{
  "intent": "INTENT_TYPE",
  "confidence": 0.0-1.0,
  "service_code": "SERVICE_CODE or null",
  "entities": {"key": "value"},
  "needs_clarification": true/false,
  "clarification_prompt_hi": "Hindi clarification question or null",
  "clarification_prompt_en": "English clarification question or null"
}`;

// Quick check for simple patterns without AI
function quickCheck(text: string): any | null {
    const lowerText = text.toLowerCase().trim();

    // Confirmation YES patterns
    const yesPatterns = ["हाँ", "हां", "हा", "जी", "जी हां", "सही", "ठीक", "yes", "ok", "okay", "right", "ji", "haan"];
    if (yesPatterns.some(p => lowerText.includes(p))) {
        return {
            intent: IntentType.CONFIRMATION_YES,
            confidence: 0.95,
            service_code: null,
            service_name_hi: null,
            entities: {},
            needs_clarification: false,
            clarification_prompt_hi: null,
            clarification_prompt_en: null,
        };
    }

    // Confirmation NO patterns
    const noPatterns = ["नहीं", "ना", "गलत", "no", "nahi", "wrong", "galat"];
    if (noPatterns.some(p => lowerText.includes(p))) {
        return {
            intent: IntentType.CONFIRMATION_NO,
            confidence: 0.95,
            service_code: null,
            service_name_hi: null,
            entities: {},
            needs_clarification: false,
            clarification_prompt_hi: null,
            clarification_prompt_en: null,
        };
    }

    // Greeting patterns
    const greetingPatterns = ["नमस्ते", "हेलो", "hello", "hi", "namaste"];
    if (greetingPatterns.some(p => lowerText.includes(p))) {
        return {
            intent: IntentType.GREETING,
            confidence: 0.95,
            service_code: null,
            service_name_hi: null,
            entities: {},
            needs_clarification: false,
            clarification_prompt_hi: null,
            clarification_prompt_en: null,
        };
    }

    // Thank you patterns
    const thankPatterns = ["धन्यवाद", "शुक्रिया", "thank", "thanks"];
    if (thankPatterns.some(p => lowerText.includes(p))) {
        return {
            intent: IntentType.THANK_YOU,
            confidence: 0.95,
            service_code: null,
            service_name_hi: null,
            entities: {},
            needs_clarification: false,
            clarification_prompt_hi: null,
            clarification_prompt_en: null,
        };
    }

    // Help patterns
    const helpPatterns = ["help", "मदद", "सहायता", "कैसे करें", "how to"];
    if (helpPatterns.some(p => lowerText.includes(p))) {
        return {
            intent: IntentType.HELP,
            confidence: 0.90,
            service_code: null,
            service_name_hi: null,
            entities: {},
            needs_clarification: false,
            clarification_prompt_hi: null,
            clarification_prompt_en: null,
        };
    }

    // Human escalation patterns
    const humanPatterns = ["इंसान", "व्यक्ति", "human", "person", "operator", "कॉल करो", "call"];
    if (humanPatterns.some(p => lowerText.includes(p))) {
        return {
            intent: IntentType.HUMAN_ESCALATION,
            confidence: 0.90,
            service_code: null,
            service_name_hi: null,
            entities: {},
            needs_clarification: false,
            clarification_prompt_hi: null,
            clarification_prompt_en: null,
        };
    }

    // Complaint patterns
    const complaintPatterns = ["शिकायत", "complaint", "grievance", "problem"];
    if (complaintPatterns.some(p => lowerText.includes(p))) {
        return {
            intent: IntentType.FILE_COMPLAINT,
            confidence: 0.85,
            service_code: null,
            service_name_hi: null,
            entities: {},
            needs_clarification: false,
            clarification_prompt_hi: null,
            clarification_prompt_en: null,
        };
    }

    return null;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { text, context } = body;

        if (!text || typeof text !== "string") {
            return NextResponse.json(
                { error: "Text is required" },
                { status: 400 }
            );
        }

        // First try quick pattern matching
        const quickResult = quickCheck(text);
        if (quickResult) {
            return NextResponse.json(quickResult);
        }

        // Use Gemini for full classification
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            // Fallback to unclear if no API key
            return NextResponse.json({
                intent: IntentType.UNCLEAR,
                confidence: 0.0,
                service_code: null,
                service_name_hi: null,
                entities: {},
                needs_clarification: true,
                clarification_prompt_hi: "माफ़ कीजिए, कृपया दोबारा बताएं।",
                clarification_prompt_en: "Sorry, please tell me again.",
            });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `${CLASSIFIER_PROMPT}

${context ? `Context: ${context}\n` : ""}
User input: "${text}"

Classify this input and respond with JSON only:`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const responseText = response.text();

        // Parse JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return NextResponse.json({
                intent: IntentType.UNCLEAR,
                confidence: 0.0,
                service_code: null,
                service_name_hi: null,
                entities: {},
                needs_clarification: true,
                clarification_prompt_hi: "मैं समझ नहीं पाया। कृपया दोबारा बताएं।",
                clarification_prompt_en: "I didn't understand. Please tell me again.",
            });
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Get service name if service_code is provided
        let serviceName = null;
        if (parsed.service_code && SERVICE_CATALOG[parsed.service_code]) {
            serviceName = SERVICE_CATALOG[parsed.service_code].name_hi;
        }

        return NextResponse.json({
            intent: parsed.intent,
            confidence: parsed.confidence,
            service_code: parsed.service_code || null,
            service_name_hi: serviceName,
            entities: parsed.entities || {},
            needs_clarification: parsed.needs_clarification || parsed.confidence < 0.85,
            clarification_prompt_hi: parsed.clarification_prompt_hi || null,
            clarification_prompt_en: parsed.clarification_prompt_en || null,
        });

    } catch (error) {
        console.error("Intent classification error:", error);

        return NextResponse.json({
            intent: IntentType.UNCLEAR,
            confidence: 0.0,
            service_code: null,
            service_name_hi: null,
            entities: {},
            needs_clarification: true,
            clarification_prompt_hi: "कुछ गड़बड़ हो गई। कृपया दोबारा कोशिश करें।",
            clarification_prompt_en: "Something went wrong. Please try again.",
        });
    }
}
