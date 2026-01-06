/**
 * Intent Classification Engine
 * Uses Gemini to classify user speech into actionable intents
 * Maps intents to government services (e-Mitra, Jan Aadhaar, Sampark)
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

// Intent Types
export enum IntentType {
    // Service Discovery
    SERVICE_SEARCH = "SERVICE_SEARCH",
    SERVICE_INFO = "SERVICE_INFO",

    // Applications
    APPLY_SERVICE = "APPLY_SERVICE",
    CHECK_STATUS = "CHECK_STATUS",

    // Identity
    IDENTITY_FETCH = "IDENTITY_FETCH",
    MEMBER_SELECT = "MEMBER_SELECT",

    // Grievance
    FILE_COMPLAINT = "FILE_COMPLAINT",
    COMPLAINT_STATUS = "COMPLAINT_STATUS",

    // Navigation
    GO_HOME = "GO_HOME",
    GO_BACK = "GO_BACK",

    // Meta
    HELP = "HELP",
    HUMAN_ESCALATION = "HUMAN_ESCALATION",
    GREETING = "GREETING",
    THANK_YOU = "THANK_YOU",
    CONFIRMATION_YES = "CONFIRMATION_YES",
    CONFIRMATION_NO = "CONFIRMATION_NO",
    UNCLEAR = "UNCLEAR",
}

export interface IntentResult {
    intent: IntentType;
    confidence: number; // 0.0 - 1.0
    service_code: string | null;
    service_name_hi: string | null;
    entities: Record<string, string>;
    needs_clarification: boolean;
    clarification_prompt_hi: string | null;
    clarification_prompt_en: string | null;
    raw_response: string;
}

// Service mapping for e-Mitra services
export const SERVICE_CATALOG = {
    // Pension Services
    EM_PENSION_STATUS: {
        code: "EM_PENSION_STATUS",
        name_en: "Old Age Pension Status",
        name_hi: "वृद्धावस्था पेंशन स्थिति",
        keywords: ["pension", "पेंशन", "वृद्धावस्था", "old age", "बुढ़ापा"],
        category: "pension",
    },
    EM_WIDOW_PENSION: {
        code: "EM_WIDOW_PENSION",
        name_en: "Widow Pension Status",
        name_hi: "विधवा पेंशन स्थिति",
        keywords: ["widow", "विधवा", "विधवा पेंशन"],
        category: "pension",
    },
    EM_DISABILITY_PENSION: {
        code: "EM_DISABILITY_PENSION",
        name_en: "Disability Pension Status",
        name_hi: "विकलांग पेंशन स्थिति",
        keywords: ["disability", "विकलांग", "handicap", "दिव्यांग"],
        category: "pension",
    },

    // Food & Ration
    EM_RATION_STATUS: {
        code: "EM_RATION_STATUS",
        name_en: "Ration Card Status",
        name_hi: "राशन कार्ड स्थिति",
        keywords: ["ration", "राशन", "food", "खाद्य", "राशन कार्ड"],
        category: "food",
    },

    // Identity
    JA_CARD_STATUS: {
        code: "JA_CARD_STATUS",
        name_en: "Jan Aadhaar Card Status",
        name_hi: "जन आधार कार्ड स्थिति",
        keywords: ["jan aadhaar", "जन आधार", "family id", "परिवार आईडी"],
        category: "identity",
    },

    // Certificates
    EM_CASTE_CERT: {
        code: "EM_CASTE_CERT",
        name_en: "Caste Certificate",
        name_hi: "जाति प्रमाण पत्र",
        keywords: ["caste", "जाति", "caste certificate", "जाति प्रमाण"],
        category: "certificate",
    },
    EM_INCOME_CERT: {
        code: "EM_INCOME_CERT",
        name_en: "Income Certificate",
        name_hi: "आय प्रमाण पत्र",
        keywords: ["income", "आय", "income certificate", "आय प्रमाण"],
        category: "certificate",
    },
    EM_DOMICILE_CERT: {
        code: "EM_DOMICILE_CERT",
        name_en: "Domicile Certificate",
        name_hi: "मूल निवास प्रमाण पत्र",
        keywords: ["domicile", "मूल निवास", "residence", "निवास"],
        category: "certificate",
    },
    EM_BIRTH_CERT: {
        code: "EM_BIRTH_CERT",
        name_en: "Birth Certificate",
        name_hi: "जन्म प्रमाण पत्र",
        keywords: ["birth", "जन्म", "birth certificate", "जन्म प्रमाण"],
        category: "certificate",
    },
    EM_DEATH_CERT: {
        code: "EM_DEATH_CERT",
        name_en: "Death Certificate",
        name_hi: "मृत्यु प्रमाण पत्र",
        keywords: ["death", "मृत्यु", "death certificate", "मृत्यु प्रमाण"],
        category: "certificate",
    },
} as const;

export type ServiceCode = keyof typeof SERVICE_CATALOG;

// Confidence thresholds
const CONFIDENCE_THRESHOLDS = {
    HIGH: 0.85,    // Proceed with action
    MEDIUM: 0.60,  // Confirm with user
    LOW: 0.40,     // Ask clarification
};

// Intent classifier prompt
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
}

Examples:
User: "मुझे पेंशन की स्थिति देखनी है"
Response: {"intent": "CHECK_STATUS", "confidence": 0.75, "service_code": null, "entities": {"service_type": "pension"}, "needs_clarification": true, "clarification_prompt_hi": "आप कौन सी पेंशन की स्थिति देखना चाहते हैं - वृद्धावस्था, विधवा, या विकलांग?", "clarification_prompt_en": "Which pension status would you like to check - Old Age, Widow, or Disability?"}

User: "वृद्धावस्था पेंशन"
Response: {"intent": "CHECK_STATUS", "confidence": 0.92, "service_code": "EM_PENSION_STATUS", "entities": {"pension_type": "old_age"}, "needs_clarification": false, "clarification_prompt_hi": null, "clarification_prompt_en": null}

User: "हाँ, सही है"
Response: {"intent": "CONFIRMATION_YES", "confidence": 0.98, "service_code": null, "entities": {}, "needs_clarification": false, "clarification_prompt_hi": null, "clarification_prompt_en": null}

User: "मुझे शिकायत करनी है"
Response: {"intent": "FILE_COMPLAINT", "confidence": 0.90, "service_code": null, "entities": {}, "needs_clarification": false, "clarification_prompt_hi": null, "clarification_prompt_en": null}`;

/**
 * Intent Classifier using Gemini AI
 */
export class IntentClassifier {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }

    async classify(userText: string, context?: string): Promise<IntentResult> {
        try {
            const prompt = `${CLASSIFIER_PROMPT}

${context ? `Context: ${context}\n` : ""}
User input: "${userText}"

Classify this input and respond with JSON only:`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Parse JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                return this.createUnclearResult(userText);
            }

            const parsed = JSON.parse(jsonMatch[0]);

            // Get service name if service_code is provided
            let serviceName = null;
            if (parsed.service_code && SERVICE_CATALOG[parsed.service_code as ServiceCode]) {
                serviceName = SERVICE_CATALOG[parsed.service_code as ServiceCode].name_hi;
            }

            return {
                intent: parsed.intent as IntentType,
                confidence: parsed.confidence,
                service_code: parsed.service_code || null,
                service_name_hi: serviceName,
                entities: parsed.entities || {},
                needs_clarification: parsed.needs_clarification || parsed.confidence < CONFIDENCE_THRESHOLDS.HIGH,
                clarification_prompt_hi: parsed.clarification_prompt_hi || null,
                clarification_prompt_en: parsed.clarification_prompt_en || null,
                raw_response: text,
            };
        } catch (error) {
            console.error("Intent classification error:", error);
            return this.createUnclearResult(userText);
        }
    }

    private createUnclearResult(userText: string): IntentResult {
        return {
            intent: IntentType.UNCLEAR,
            confidence: 0.0,
            service_code: null,
            service_name_hi: null,
            entities: {},
            needs_clarification: true,
            clarification_prompt_hi: "मैं समझ नहीं पाया। कृपया दोबारा बताएं कि आप क्या करना चाहते हैं?",
            clarification_prompt_en: "I didn't understand. Please tell me again what you would like to do?",
            raw_response: "",
        };
    }

    /**
     * Quick check for simple confirmations without calling AI
     */
    quickCheck(userText: string): IntentResult | null {
        const text = userText.toLowerCase().trim();

        // Confirmation YES patterns
        const yesPatterns = ["हाँ", "हां", "हा", "जी", "जी हां", "सही", "ठीक", "yes", "ok", "okay", "right"];
        if (yesPatterns.some(p => text.includes(p))) {
            return {
                intent: IntentType.CONFIRMATION_YES,
                confidence: 0.95,
                service_code: null,
                service_name_hi: null,
                entities: {},
                needs_clarification: false,
                clarification_prompt_hi: null,
                clarification_prompt_en: null,
                raw_response: "",
            };
        }

        // Confirmation NO patterns
        const noPatterns = ["नहीं", "ना", "गलत", "no", "nahi", "wrong"];
        if (noPatterns.some(p => text.includes(p))) {
            return {
                intent: IntentType.CONFIRMATION_NO,
                confidence: 0.95,
                service_code: null,
                service_name_hi: null,
                entities: {},
                needs_clarification: false,
                clarification_prompt_hi: null,
                clarification_prompt_en: null,
                raw_response: "",
            };
        }

        // Help patterns
        const helpPatterns = ["help", "मदद", "सहायता", "कैसे"];
        if (helpPatterns.some(p => text.includes(p))) {
            return {
                intent: IntentType.HELP,
                confidence: 0.90,
                service_code: null,
                service_name_hi: null,
                entities: {},
                needs_clarification: false,
                clarification_prompt_hi: null,
                clarification_prompt_en: null,
                raw_response: "",
            };
        }

        // Human escalation
        const humanPatterns = ["इंसान", "व्यक्ति", "human", "person", "operator", "कॉल"];
        if (humanPatterns.some(p => text.includes(p))) {
            return {
                intent: IntentType.HUMAN_ESCALATION,
                confidence: 0.90,
                service_code: null,
                service_name_hi: null,
                entities: {},
                needs_clarification: false,
                clarification_prompt_hi: null,
                clarification_prompt_en: null,
                raw_response: "",
            };
        }

        return null; // Need full AI classification
    }
}

/**
 * Create intent classifier instance
 */
export function createIntentClassifier(): IntentClassifier {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is required for intent classification");
    }
    return new IntentClassifier(apiKey);
}
