/**
 * Consent & Audit Management System
 * 
 * Handles consent capture, validation, and immutable audit logging
 * for DPDP Act compliance and government audit requirements.
 */

import { supabase } from "@/lib/supabase/client";
import { v4 as uuidv4 } from "uuid";

// Consent Types
export type ConsentType = "data_fetch" | "submission" | "grievance" | "data_share";

export interface ConsentRequest {
    session_id: string;
    application_id?: string; // Link to specific application
    citizen_id?: string;
    consent_type: ConsentType;
    data_snapshot: Record<string, unknown>;
    purpose_hi: string;
    purpose_en: string;
}

export interface ConsentRecord {
    id: string;
    session_id: string;
    application_id: string | null;
    citizen_id: string | null;
    consent_type: ConsentType;
    data_snapshot: Record<string, unknown>;
    purpose_hi: string;
    purpose_en: string;
    voice_confirmation: boolean;
    ui_confirmation: boolean;
    confirmed_at: string | null;
    ip_hash: string | null;
    created_at: string;
}

export interface AuditAction {
    session_id: string;
    action: string;
    entity_type: string;
    entity_id?: string;
    details?: Record<string, unknown>;
}

export interface AuditEntry {
    id: string;
    session_id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    details: Record<string, unknown>;
    created_at: string;
}

// Consent Purposes (Pre-defined for different operations)
export const CONSENT_PURPOSES = {
    data_fetch: {
        hi: "आपकी जन आधार जानकारी प्राप्त करने के लिए आपकी अनुमति आवश्यक है",
        en: "Your permission is required to fetch your Jan Aadhaar information",
    },
    submission: {
        hi: "इस आवेदन को जमा करने के लिए आपकी अनुमति आवश्यक है",
        en: "Your permission is required to submit this application",
    },
    grievance: {
        hi: "इस शिकायत को दर्ज करने के लिए आपकी अनुमति आवश्यक है",
        en: "Your permission is required to register this grievance",
    },
    data_share: {
        hi: "आपकी जानकारी संबंधित विभाग के साथ साझा करने के लिए अनुमति आवश्यक है",
        en: "Your permission is required to share your information with the relevant department",
    },
} as const;

/**
 * Consent Manager
 * Handles creation, validation, and confirmation of consent records
 */
export class ConsentManager {
    /**
     * Create a new consent request (not yet confirmed)
     */
    async createConsentRequest(request: ConsentRequest): Promise<ConsentRecord> {
        const consentId = uuidv4();
        const now = new Date().toISOString();

        const record: ConsentRecord = {
            id: consentId,
            session_id: request.session_id,
            application_id: request.application_id || null,
            citizen_id: request.citizen_id || null,
            consent_type: request.consent_type,
            data_snapshot: request.data_snapshot,
            purpose_hi: request.purpose_hi,
            purpose_en: request.purpose_en,
            voice_confirmation: false,
            ui_confirmation: false,
            confirmed_at: null,
            ip_hash: null,
            created_at: now,
        };

        // Store in Supabase
        const { error } = await supabase.from("consent_logs").insert(record as any);

        if (error) {
            console.error("Failed to create consent record:", error);
            // Fall back to local storage for offline support
            this.storeLocally("pending_consents", record);
        }

        // Log audit entry
        await auditLogger.log({
            session_id: request.session_id,
            action: "CONSENT_REQUESTED",
            entity_type: "consent",
            entity_id: consentId,
            details: {
                consent_type: request.consent_type,
                purpose: request.purpose_en,
            },
        });

        return record;
    }

    /**
     * Record voice confirmation
     */
    async confirmVoice(consentId: string, sessionId: string): Promise<boolean> {
        const { error } = await supabase
            .from("consent_logs")
            .update({
                voice_confirmation: true,
                confirmed_at: new Date().toISOString(),
            })
            .eq("id", consentId)
            .eq("session_id", sessionId);

        if (error) {
            console.error("Failed to confirm voice consent:", error);
            return false;
        }

        await auditLogger.log({
            session_id: sessionId,
            action: "CONSENT_VOICE_CONFIRMED",
            entity_type: "consent",
            entity_id: consentId,
        });

        return true;
    }

    /**
     * Record UI confirmation (checkbox/button)
     */
    async confirmUI(consentId: string, sessionId: string, ipHash?: string): Promise<boolean> {
        const { error } = await supabase
            .from("consent_logs")
            .update({
                ui_confirmation: true,
                ip_hash: ipHash || null,
                confirmed_at: new Date().toISOString(),
            })
            .eq("id", consentId)
            .eq("session_id", sessionId);

        if (error) {
            console.error("Failed to confirm UI consent:", error);
            return false;
        }

        await auditLogger.log({
            session_id: sessionId,
            action: "CONSENT_UI_CONFIRMED",
            entity_type: "consent",
            entity_id: consentId,
        });

        return true;
    }

    /**
     * Check if consent is fully confirmed (both voice and UI for critical actions)
     */
    async isFullyConfirmed(consentId: string): Promise<boolean> {
        const { data, error } = await supabase
            .from("consent_logs")
            .select("voice_confirmation, ui_confirmation")
            .eq("id", consentId)
            .single();

        if (error || !data) return false;

        return (data.voice_confirmation || false) && (data.ui_confirmation || false);
    }

    /**
     * Get consent record
     */
    async getConsent(consentId: string): Promise<ConsentRecord | null> {
        const { data, error } = await supabase
            .from("consent_logs")
            .select("*")
            .eq("id", consentId)
            .single();

        if (error || !data) return null;

        return data as ConsentRecord;
    }

    /**
     * Store data locally for offline support
     */
    private storeLocally(key: string, data: unknown): void {
        if (typeof window !== "undefined") {
            const existing = localStorage.getItem(key);
            const items = existing ? JSON.parse(existing) : [];
            items.push(data);
            localStorage.setItem(key, JSON.stringify(items));
        }
    }

    /**
     * Generate consent confirmation text for TTS
     */
    generateConfirmationText(
        consentType: ConsentType,
        dataSnapshot: Record<string, unknown>,
        language: "hi" | "en" = "hi"
    ): string {
        const purpose = CONSENT_PURPOSES[consentType];

        if (language === "hi") {
            let text = purpose.hi + "। ";

            if (dataSnapshot.name) {
                text += `आवेदक का नाम: ${dataSnapshot.name}। `;
            }
            if (dataSnapshot.service_name) {
                text += `सेवा: ${dataSnapshot.service_name}। `;
            }
            if (dataSnapshot.jan_aadhaar_id) {
                text += `जन आधार: ${dataSnapshot.jan_aadhaar_id}। `;
            }

            text += "क्या आप इसकी पुष्टि करते हैं? हाँ या ना बोलें।";
            return text;
        }

        let text = purpose.en + ". ";
        if (dataSnapshot.name) {
            text += `Applicant name: ${dataSnapshot.name}. `;
        }
        if (dataSnapshot.service_name) {
            text += `Service: ${dataSnapshot.service_name}. `;
        }
        text += "Do you confirm? Say yes or no.";
        return text;
    }
}

/**
 * Audit Logger
 * Creates immutable audit trail for all actions
 */
export class AuditLogger {
    /**
     * Log an action to the audit trail
     */
    async log(action: AuditAction): Promise<string | null> {
        const auditId = uuidv4();
        const now = new Date().toISOString();

        const entry: AuditEntry = {
            id: auditId,
            session_id: action.session_id,
            action: action.action,
            entity_type: action.entity_type,
            entity_id: action.entity_id || null,
            details: action.details || {},
            created_at: now,
        };

        const { error } = await supabase.from("audit_logs").insert(entry as any);

        if (error) {
            console.error("Failed to create audit log:", error);
            // Store locally for later sync
            this.storeLocally("pending_audits", entry);
        }

        return auditId;
    }

    /**
     * Log session start
     */
    async logSessionStart(sessionId: string, deviceInfo: Record<string, unknown>): Promise<void> {
        await this.log({
            session_id: sessionId,
            action: "SESSION_STARTED",
            entity_type: "session",
            entity_id: sessionId,
            details: deviceInfo,
        });
    }

    /**
     * Log voice interaction
     */
    async logVoiceInteraction(
        sessionId: string,
        transcription: string,
        intent: string,
        confidence: number
    ): Promise<void> {
        await this.log({
            session_id: sessionId,
            action: "VOICE_INTERACTION",
            entity_type: "voice",
            details: {
                transcription_length: transcription.length,
                intent,
                confidence,
                // Note: We don't store actual transcription for privacy
            },
        });
    }

    /**
     * Log service request
     */
    async logServiceRequest(
        sessionId: string,
        serviceCode: string,
        requestType: "check_status" | "apply" | "info"
    ): Promise<void> {
        await this.log({
            session_id: sessionId,
            action: "SERVICE_REQUEST",
            entity_type: "service",
            entity_id: serviceCode,
            details: { request_type: requestType },
        });
    }

    /**
     * Log application submission
     */
    async logApplicationSubmission(
        sessionId: string,
        applicationId: string,
        serviceCode: string,
        consentId: string
    ): Promise<void> {
        await this.log({
            session_id: sessionId,
            action: "APPLICATION_SUBMITTED",
            entity_type: "application",
            entity_id: applicationId,
            details: {
                service_code: serviceCode,
                consent_id: consentId,
            },
        });
    }

    /**
     * Log grievance submission
     */
    async logGrievanceSubmission(
        sessionId: string,
        ticketId: string,
        categoryId: string
    ): Promise<void> {
        await this.log({
            session_id: sessionId,
            action: "GRIEVANCE_SUBMITTED",
            entity_type: "grievance",
            entity_id: ticketId,
            details: { category_id: categoryId },
        });
    }

    /**
     * Log error
     */
    async logError(
        sessionId: string,
        errorType: string,
        errorMessage: string,
        context?: Record<string, unknown>
    ): Promise<void> {
        await this.log({
            session_id: sessionId,
            action: "ERROR",
            entity_type: "error",
            details: {
                error_type: errorType,
                error_message: errorMessage,
                ...context,
            },
        });
    }

    /**
     * Log human escalation
     */
    async logHumanEscalation(sessionId: string, reason: string): Promise<void> {
        await this.log({
            session_id: sessionId,
            action: "HUMAN_ESCALATION_REQUESTED",
            entity_type: "escalation",
            details: { reason },
        });
    }

    /**
     * Get audit trail for a session
     */
    async getSessionAuditTrail(sessionId: string): Promise<AuditEntry[]> {
        const { data, error } = await supabase
            .from("audit_logs")
            .select("*")
            .eq("session_id", sessionId)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Failed to fetch audit trail:", error);
            return [];
        }

        return data as unknown as AuditEntry[];
    }

    /**
     * Store data locally for offline support
     */
    private storeLocally(key: string, data: unknown): void {
        if (typeof window !== "undefined") {
            const existing = localStorage.getItem(key);
            const items = existing ? JSON.parse(existing) : [];
            items.push(data);
            localStorage.setItem(key, JSON.stringify(items));
        }
    }
}

// Export singletons
export const consentManager = new ConsentManager();
export const auditLogger = new AuditLogger();
