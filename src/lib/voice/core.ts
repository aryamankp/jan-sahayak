/**
 * Core Voice Pipeline Interfaces
 * Defines the contract for Speech-to-Text, Reasoning, and Text-to-Speech
 */

export interface IntentResult {
    intent: string;
    confidence: number;
    service_category?: string;
    missing_fields?: string[];
    next_question?: string;
    response?: string; // Detailed answer from LLM
    schemes?: string[]; // List of schemes
    ui_action: "ASK_INPUT" | "SHOW_CONFIRMATION" | "SHOW_STATUS" | "SHOW_SUCCESS" | "SHOW_ERROR" | "SHOW_BENEFITS" | "SHOW_NOTIFICATIONS" | "GUIDE_USER" | "DISPLAY_PENSION_SCHEMES" | "DISPLAY_SCHEMES" | "provide_info" | "PROVIDE_INFO" | "provide_link" | "provide_eligibility_criteria" | "provide_scheme_details" | "display_schemes" | "redirect_to_sso" | "ASK_UPLOAD" | "UPLOAD_DOCUMENTS" | "redirect_to_external_link" | "NONE";
    data?: Record<string, any>; // Any extracted data
}

export interface SpeechToText {
    transcribe(audioBlob: Blob): Promise<string>;
}

export interface ReasoningEngine {
    analyze(text: string, context: Record<string, any>): Promise<IntentResult>;
}

export interface AudioOutput {
    audioUrl: string; // URL object or base64 data URI
    duration?: number;
}

export interface TextToSpeech {
    speak(text: string): Promise<AudioOutput>;
}
