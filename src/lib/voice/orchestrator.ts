import { GroqService } from "./providers/groq";
import { GeminiService } from "./providers/gemini";
import { ElevenLabsService } from "./providers/elevenlabs";
import { ServiceRegistry } from "../services/registry";
import { IntentResult } from "./core";
import { supabase } from "../supabase/client";
import { consentManager, CONSENT_PURPOSES } from "../consent/manager";
import { ProfileService } from "../services/profile";

// Initialize services (Lazy or Direct)
const getGroqService = () => {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error("GROQ_API_KEY is missing");
    return new GroqService(key);
};

const getElevenLabsService = () => {
    const key = process.env.ELEVENLABS_API_KEY;
    const voice = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Fallback to standard "Rachel" voice
    if (!key) throw new Error("ELEVENLABS_API_KEY is missing");
    return new ElevenLabsService(key, voice);
};

const getGeminiService = () => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return null; // Optional fallback
    return new GeminiService(key);
};

export interface TurnInput {
    audioBlob?: Blob; // Optional if text input
    textInput?: string; // Optional if existing text
    context: Record<string, any>;
    history?: { role: "user" | "assistant"; content: string }[];
}

export interface TurnOutput {
    transcript: string;
    intent: IntentResult;
    responseAudio: string; // Base64 or URL
    responseText: string;
    uiAction: string;
    newContext: Record<string, any>;
}

export class VoiceOrchestrator {

    async processTurn(input: TurnInput): Promise<TurnOutput> {
        const groq = getGroqService();
        const tts = getElevenLabsService();
        const sessionId = input.context.session_id || null; // Ensure this matches DB FK if enforced

        // Timeout Wrapper
        const withTimeout = async <T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> => {
            return Promise.race([
                promise,
                new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms))
            ]);
        };

        let transcript = input.textInput || "";

        // 0. Resolve User Context from Session
        if (sessionId) {
            try {
                // Fetch Jan Aadhaar ID from Session
                const { data: sessionData } = await supabase
                    .from("citizen_sessions")
                    .select("jan_aadhaar_id")
                    .eq("id", sessionId)
                    .single() as any;

                if (sessionData?.jan_aadhaar_id) {
                    const jaId = sessionData.jan_aadhaar_id;

                    // Fetch Full Profile
                    const profile = await ProfileService.getProfile(jaId);

                    // Inject into Context
                    input.context.user_profile = {
                        name: profile.personalInfo.head_of_family || "Citizen",
                        jan_aadhaar_id: jaId,
                        age: 35, // Mock if missing, or derive from members
                        family_members: profile.personalInfo.members?.map((m: any) => `${m.name_hi} (${m.relationship_hi})`),
                        active_benefits: profile.benefits?.map(b => `${b.scheme?.name_hi}: ${b.status}`)
                    };

                    // Auto-fill ID for logic
                    input.context.jan_aadhaar_id = jaId;
                }
            } catch (err) {
                console.warn("Failed to load user profile for session:", err);
            }
        }

        // 1. STT (if audio provided)
        if (input.audioBlob) {
            try {
                // 10s Timeout for STT
                transcript = await withTimeout(
                    groq.transcribe(input.audioBlob),
                    10000,
                    "STT_TIMEOUT"
                );
            } catch (e: any) {
                console.error("STT Error:", e);
                // Return generic error so frontend can fallback to Web Speech API if needed (or just show text)
                // Actually, if STT fails, we can't do anything unless we fallback on client side.
                // But here we are on server (or server action). 
                // We will return a specific error code.
                return this.createErrorResponse("आवाज़ समझने में समय लग रहा है।", "STT_ERROR", sessionId);
            }
        }

        if (!transcript.trim()) {
            return this.createErrorResponse("मैं आपकी आवाज़ नहीं सुन पाया।", "NO_INPUT", sessionId);
        }

        // --- RAW AUDIT LOG (USER) ---
        if (sessionId) {
            supabase.from("conversation_logs").insert({
                session_id: sessionId,
                speaker: "user",
                transcription: transcript,
                intent_detected: null,
                created_at: new Date().toISOString()
            }).then(({ error }) => {
                if (error) console.error("Audit Log Error (User):", error);
            });
        }

        // 2. Reasoning with Gemini Fallback
        let intentResult: IntentResult;
        try {
            // Fetch Schema Knowledge for Prompt Context
            const availableSchemes = await ServiceRegistry.getAllSchemeNames();

            // Try Groq first (15s Timeout)
            intentResult = await withTimeout(
                groq.analyze(transcript, input.context, input.history || [], availableSchemes),
                15000,
                "LLM_TIMEOUT"
            );
        } catch (e) {
            console.error("Groq Reasoning Error:", e);

            // Fallback to Gemini if available
            const gemini = getGeminiService();
            if (gemini) {
                console.log("Falling back to Gemini...");
                try {
                    const availableSchemes = await ServiceRegistry.getAllSchemeNames();
                    intentResult = await withTimeout(
                        gemini.analyze(transcript, input.context, input.history || [], availableSchemes),
                        15000,
                        "GEMINI_TIMEOUT"
                    );
                } catch (geminiError) {
                    console.error("Gemini Fallback Error:", geminiError);
                    return this.createErrorResponse("माफ़ कीजिये, मैं अभी समझ नहीं पा रहा हूँ।", "LLM_ERROR", sessionId);
                }
            } else {
                return this.createErrorResponse("माफ़ कीजिये, AI सेवा उपलब्ध नहीं है।", "LLM_ERROR", sessionId);
            }
        }

        console.log("Intent Analysis:", intentResult);

        // --- CONFIDENCE CHECK ---
        // If confidence is low, ask for clarification
        if ((intentResult.confidence || 1) < 0.6) {
            intentResult.intent = "CLARIFICATION";
            intentResult.next_question = "माफ़ कीजिये, मुझे ठीक से समझ नहीं आया। क्या आप दोबारा बता सकते हैं?";
            intentResult.ui_action = "NONE";
        }

        // 3. Business Logic & State Machine
        let responseText = intentResult.next_question || "मैं समझ नहीं पाया।";
        let uiAction = intentResult.ui_action;
        const newContext: Record<string, any> = {
            ...input.context,
            last_intent: intentResult.intent
        };
        const extractedData = intentResult.data || {};

        // --- State Machine Handling ---

        // Case: Greeting
        if (intentResult.intent === "GREETING") {
            responseText = intentResult.next_question || "नमस्कार! जन सहायक पोर्टल में आपका स्वागत है। मैं आपकी क्या सहायता कर सकता हूँ? आप पेंशन, राशन कार्ड, या अन्य योजनाओं के बारे में पूछ सकते हैं।";
            uiAction = "NONE";
        }

        // Case: Status Check
        else if (intentResult.intent === "CHECK_STATUS") {
            // Infer Category if missing
            let category = intentResult.service_category || "";
            if (!category) {
                const textToCheck = (transcript + " " + (extractServiceFromUiAction(intentResult.ui_action) || "")).toLowerCase();
                if (textToCheck.includes("pension") || textToCheck.includes("पेंशन")) category = "Pension";
                else if (textToCheck.includes("ration") || textToCheck.includes("राशन")) category = "Ration";
            }

            if (intentResult.missing_fields && intentResult.missing_fields.length > 0) {
                responseText = intentResult.next_question || "कृपया विवरण प्रदान करें।";
            } else {
                try {
                    // Default ID for demo if missing
                    const id = extractedData.pension_id || extractedData.ration_id || extractedData.jan_aadhaar_id || "1093847291";

                    if (category.includes("Pension")) {
                        const res = await ServiceRegistry.checkPensionStatus(id);
                        responseText = res.message_hi;
                        uiAction = "SHOW_STATUS";
                        newContext.service_response = res;
                    } else if (category.includes("Ration")) {
                        const res = await ServiceRegistry.checkRationStatus(id);
                        responseText = res.message_hi;
                        uiAction = "SHOW_STATUS";
                        newContext.service_response = res;
                    } else {
                        // If we can't determine the service, asking clarification is better than saying "Not Available"
                        if (intentResult.next_question) {
                            responseText = intentResult.next_question;
                            uiAction = "ASK_INPUT";
                        } else {
                            responseText = "क्षमा करें, मैं समझ नहीं पाया कि आप किस सेवा की स्थिति जानना चाहते हैं। क्या आप पेंशन या राशन के बारे में पूछ रहे हैं?";
                            uiAction = "ASK_INPUT";
                        }
                    }
                } catch (err) {
                    console.error("Registry Error", err);
                    responseText = "तकनीकी समस्या के कारण डेटाबेस से संपर्क नहीं हो पा रहा है।";
                }
            }
        }

        // Case: Application Flow (Needs Confirmation)
        else if (intentResult.intent === "APPLY_SERVICE") {
            // Handle Document Upload Request
            if (intentResult.ui_action === "redirect_to_sso"
                || intentResult.ui_action === "redirect_to_external_link"
                || intentResult.ui_action === "UPLOAD_DOCUMENTS"
                || responseText.includes("upload")
                || responseText.includes("अपलोड")) {
                uiAction = "ASK_UPLOAD";
                // Keep the LLM's response text as it likely asks for the specific document
            }
            else if (uiAction === "SHOW_CONFIRMATION") {
                const id = extractedData.jan_aadhaar_id || "1093847291";
                const draftRes = await ServiceRegistry.createDraftApplication(intentResult.service_category || "Certificate", id, extractedData);

                if (draftRes.status === "DRAFT_CREATED" && draftRes.details) {
                    responseText = draftRes.message_hi;
                    newContext.pending_action = "APPLY";
                    newContext.pending_data = {
                        ...extractedData,
                        applicationId: draftRes.details.applicationId,
                        submissionId: draftRes.details.submissionId,
                        serviceName: draftRes.details.serviceName
                    };
                } else {
                    responseText = "तकनीकी त्रुटि। कृपया कुछ समय पश्चात पुनः प्रयास करें।";
                    uiAction = "SHOW_ERROR";
                }
            }
        }

        // Case: Handling Confirmation (Yes/No)
        else if (intentResult.intent === "CONFIRMATION_YES") {
            if (input.context.pending_action === "APPLY") {
                try {
                    const appId = input.context.pending_data?.applicationId;
                    if (!appId) throw new Error("No pending application ID found");

                    // 1. Record Consent
                    const consentReq = {
                        session_id: sessionId || "anon", // Log anonymous if no session (though DB trigger might fail if FK strict)
                        application_id: appId,
                        consent_type: "submission" as const,
                        data_snapshot: input.context.pending_data,
                        purpose_hi: CONSENT_PURPOSES.submission.hi,
                        purpose_en: CONSENT_PURPOSES.submission.en
                    };

                    const consentRecord = await consentManager.createConsentRequest(consentReq);
                    await consentManager.confirmVoice(consentRecord.id, sessionId || "anon");

                    // 2. Submit Application
                    const res = await ServiceRegistry.submitApplication(appId, consentRecord.id);

                    responseText = res.message_hi;
                    uiAction = "SHOW_SUCCESS";
                    newContext.pending_action = null;
                    newContext.service_response = res;
                } catch (e) {
                    console.error(e);
                    responseText = "आवेदन जमा करने में तकनीकी समस्या हुई है।";
                }
            } else {
                responseText = "कमांड स्वीकार कर ली गई है। अगला आदेश बताएं।";
            }
        }
        else if (intentResult.intent === "CONFIRMATION_NO") {
            responseText = "प्रक्रिया रद्द कर दी गई है। क्या आप कोई अन्य सेवा चाहते हैं?";
            newContext.pending_action = null;
            uiAction = "NONE";
        }

        // --- NEW FEATURES ---

        // Case: Check Benefits (Passbook)
        else if (intentResult.intent === "CHECK_BENEFITS") {
            const id = extractedData.jan_aadhaar_id || "1093847291"; // Use session ID in prod
            uiAction = "SHOW_BENEFITS";

            // Fetch summary for voice response
            const { data: benefits } = await supabase
                .from('benefit_disbursements')
                .select('amount')
                .eq('jan_aadhaar_id', id);

            const total = (benefits || []).reduce((sum, b) => sum + Number(b.amount), 0);
            const count = (benefits || []).length;

            if (count > 0) {
                responseText = `आपने अब तक कुल ${count} बार लाभ प्राप्त किया है, जिसकी कुल राशि ₹${total} है। अधिक जानकारी के लिए स्क्रीन देखें।`;
            } else {
                responseText = "अभी तक आपको कोई लाभ प्राप्त नहीं हुआ है।";
            }
        }

        // Case: Check Notifications
        else if (intentResult.intent === "CHECK_NOTIFICATIONS") {
            const id = extractedData.jan_aadhaar_id || "1093847291";
            uiAction = "SHOW_NOTIFICATIONS";

            const { data: notifs } = await supabase
                .from('notifications')
                .select('message_hi')
                .eq('jan_aadhaar_id', id)
                .eq('status', 'unread')
                .limit(3);

            if (notifs && notifs.length > 0) {
                responseText = `आपके पास ${notifs.length} नई सूचनाएं हैं। पहली सूचना है: ${notifs[0].message_hi}`;
            } else {
                responseText = "आपके पास कोई नई सूचना नहीं है।";
            }
        }

        // Case: Check Eligibility
        else if (intentResult.intent === "CHECK_ELIGIBILITY") {
            // Respect LLM's decision to guide the user if needed (e.g., asking for specific scheme type)
            // ensure we catch various "informational" actions LLM might hallucinate or choose
            const informationalActions = ["GUIDE_USER", "DISPLAY_PENSION_SCHEMES", "DISPLAY_SCHEMES", "provide_info", "PROVIDE_INFO"];

            if (informationalActions.includes(intentResult.ui_action) || (intentResult.missing_fields && intentResult.missing_fields.length > 0)) {
                responseText = intentResult.next_question || "कृपया अधिक जानकारी दें।";
                uiAction = intentResult.ui_action; // Pass through the specific action
                // Check if we have a valid ID in context or extracted data
                const id = input.context.jan_aadhaar_id || extractedData.jan_aadhaar_id;

                if (id) {
                    const res = await ServiceRegistry.checkEligibility(id);
                    responseText = res.message_hi;
                    uiAction = "NONE";
                } else {
                    // If no ID is found, ask for it instead of failing with "Data not found"
                    responseText = "पात्रता जांचने के लिए कृपया अपना जन आधार नंबर बताएं।";
                    uiAction = "ASK_INPUT";
                }
            }
        }

        // Case: Explain Scheme (RAG-lite)
        else if (intentResult.intent === "EXPLAIN_SCHEME") {
            const schemeName = extractedData.scheme_name || intentResult.service_category;

            // 1. Prioritize LLM's generated response if it exists (it's often more specific)
            if (intentResult.response) {
                responseText = intentResult.response;
                uiAction = intentResult.ui_action || "NONE";
            }
            // 2. NEW: Check if LLM returned a list of schemes
            else if (intentResult.schemes && intentResult.schemes.length > 0) {
                const userId = input.context.jan_aadhaar_id || extractedData.jan_aadhaar_id;

                if (userId) {
                    // Logged In: Check Real Eligibility
                    try {
                        const eligibilityRes = await ServiceRegistry.checkEligibility(userId);
                        if (eligibilityRes.status === "SUCCESS" && eligibilityRes.details?.schemes) {
                            intentResult.schemes = eligibilityRes.details.schemes; // Override with real data
                            responseText = `आपकी प्रोफाइल के आधार पर, आप इन ${(intentResult.schemes || []).length} योजनाओं के लिए पात्र हैं:`;
                        } else {
                            // No eligible schemes found
                            intentResult.schemes = [];
                            responseText = "आपकी प्रोफाइल के आधार पर वर्तमान में कोई भी योजना उपलब्ध नहीं है।";
                        }
                    } catch (err) {
                        console.error("Personalization Error", err);
                        // Fallback to generic list if DB fails
                    }
                } else {
                    // Guest: Generic List
                    responseText = "यहाँ कुछ सामान्य योजनाएं दी गई हैं। अपनी पात्रता जानने के लिए कृपया लॉग इन करें या अपना जन आधार नंबर बताएं।";
                }

                uiAction = "DISPLAY_SCHEMES";
            }
            // 3. Fallback: If no response but scheme name exists, try DB
            else if (schemeName && !schemeName.toLowerCase().includes("multiple") && !schemeName.toLowerCase().includes("schemes")) {
                const { data: schemes } = await supabase
                    .from('schemes')
                    .select('name_hi, description_hi, benefits_summary_hi, eligibility_criteria')
                    .or(`name_en.ilike.%${schemeName}%,name_hi.ilike.%${schemeName}%`)
                    .limit(1);

                const scheme = schemes?.[0];

                if (scheme) {
                    responseText = `${scheme.name_hi}: ${scheme.description_hi || ''} ${scheme.benefits_summary_hi || ''}`;
                    if (scheme.eligibility_criteria) {
                        const ec = scheme.eligibility_criteria as any;
                        responseText += ` पात्रता: ${ec.min_age ? 'न्यूनतम आयु ' + ec.min_age + ' वर्ष. ' : ''}${ec.income_limit ? 'आय सीमा ₹' + ec.income_limit + '. ' : ''}`;
                    }
                } else {
                    responseText = intentResult.next_question || `क्षमा करें, मुझे '${schemeName}' के बारे में जानकारी नहीं मिली।`;
                }
                uiAction = "NONE";
            }
            // 3. Last Resort: Just ask for clarification
            else {
                responseText = intentResult.next_question || "कृपया योजना का नाम दोबारा बताएं।";
                uiAction = "NONE";
            }
        }

        else if (intentResult.intent === "CLARIFICATION") {
            // Already set responseText above
        }

        // 4. TTS with Timeout
        let audioBase64 = "";
        if (responseText) {
            try {
                // 10s Timeout for TTS
                const audioOutput = await withTimeout(
                    tts.speak(responseText),
                    10000,
                    "TTS_TIMEOUT"
                );
                audioBase64 = audioOutput.audioUrl;
            } catch (e) {
                console.error("TTS failed:", e);
                // Return empty audio, frontend will handle TTS_ERROR or text-only fallback
                // We don't change uiAction to error here, just miss the audio.
            }
        }

        // --- RAW AUDIT LOG (SYSTEM) ---
        if (sessionId) {
            supabase.from("conversation_logs").insert({
                session_id: sessionId,
                speaker: "system",
                transcription: responseText,
                intent_detected: intentResult.intent,
                confidence_score: intentResult.confidence,
                created_at: new Date().toISOString()
            }).then(({ error }) => {
                if (error) console.error("Audit Log Error (System):", error);
            });
        }

        return {
            transcript,
            intent: intentResult,
            responseAudio: audioBase64,
            responseText,
            uiAction,
            newContext: newContext as Record<string, any>
        };
    }

    private createErrorResponse(text: string, code: string, sessionId: string | null): TurnOutput {
        if (sessionId) {
            supabase.from("conversation_logs").insert({
                session_id: sessionId,
                speaker: "system",
                transcription: text,
                intent_detected: "ERROR",
                created_at: new Date().toISOString()
            }).then(({ error }) => {
                if (error) console.error("Audit Log Error (System-Error):", error);
            });
        }
        return {
            transcript: "",
            intent: { intent: "ERROR", confidence: 0, ui_action: "SHOW_ERROR" },
            // Pass the error code in transcript or a special field? 
            // Better to pass logic to frontend. For now, sending text so it can be displayed.
            // But we want frontend to optionally use local TTS.
            responseAudio: "",
            responseText: text,
            uiAction: "SHOW_ERROR",
            newContext: {}
        };
    }
}

// Helper to sanitize UI Action string
function extractServiceFromUiAction(action: string | any): string {
    if (typeof action === 'string') return action;
    return "";
}
