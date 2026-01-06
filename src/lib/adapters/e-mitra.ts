import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface ServiceCatalogItem {
    code: string;
    name_en: string;
    name_hi: string;
    description_en: string;
    description_hi: string;
    category: string;
    category_hi: string;
    required_documents: DocumentRequirement[];
    fee: number;
    fee_type: "fixed" | "variable";
    processing_time: string;
    processing_time_hi: string;
    is_active: boolean;
}

export interface DocumentRequirement {
    id: string;
    name_en: string;
    name_hi: string;
    is_mandatory: boolean;
    accepted_formats: string[];
    max_size_kb: number;
}

export interface ApplicationData {
    service_code: string;
    applicant: {
        jan_aadhaar_id: string;
        member_id: string;
        name: string;
        mobile: string;
    };
    form_data: Record<string, unknown>;
    documents: Array<{
        document_id: string;
        file_url: string;
    }>;
    consent_id: string;
}

export interface SubmissionResult {
    success: boolean;
    application_id: string | null;
    message: string;
    message_hi: string;
    token_number: string | null;
    estimated_completion: string | null;
}

export interface ApplicationStatus {
    application_id: string;
    service_code: string;
    service_name_hi: string;
    status: "submitted" | "under_review" | "document_verification" | "approved" | "rejected" | "completed";
    status_hi: string;
    submitted_at: string;
    last_updated: string;
    current_step: number;
    total_steps: number;
    timeline: StatusTimelineItem[];
    remarks?: string;
    remarks_hi?: string;
}

export interface StatusTimelineItem {
    step: number;
    title_en: string;
    title_hi: string;
    status: "completed" | "current" | "pending";
    completed_at?: string;
    officer_name?: string;
}

/**
 * e-Mitra API Adapter Interface
 */
export interface IEMitraAdapter {
    getServices(): Promise<ServiceCatalogItem[]>;
    getServiceDetails(code: string): Promise<ServiceCatalogItem | null>;
    submitApplication(data: ApplicationData): Promise<SubmissionResult>;
    checkStatus(applicationId: string): Promise<ApplicationStatus | null>;
}

/**
 * Supabase e-Mitra Adapter
 */
export class SupabaseEMitraAdapter implements IEMitraAdapter {

    async getServices(): Promise<ServiceCatalogItem[]> {
        const { data, error } = await supabase
            .from('services')
            .select('*')
            .eq('is_active', true);

        if (error) {
            console.error("Error fetching services:", error);
            return [];
        }

        return data || [];
    }

    async getServiceDetails(code: string): Promise<ServiceCatalogItem | null> {
        const { data, error } = await supabase
            .from('services')
            .select('*')
            .eq('code', code)
            .single();

        if (error || !data) return null;
        return data;
    }

    async submitApplication(data: ApplicationData): Promise<SubmissionResult> {
        // Generate application ID
        const appId = `EM${new Date().getFullYear()}${String(Date.now()).slice(-6)}`;

        const service = await this.getServiceDetails(data.service_code);

        // Construct timeline
        const timeline = [
            { step: 1, title_en: "Application Submitted", title_hi: "आवेदन जमा", status: "completed", completed_at: new Date().toISOString() },
            { step: 2, title_en: "Under Review", title_hi: "समीक्षाधीन", status: "pending" },
            { step: 3, title_en: "Approval", title_hi: "स्वीकृति", status: "pending" },
            { step: 4, title_en: "Completed", title_hi: "पूर्ण", status: "pending" },
        ];

        const newApplication = {
            id: appId, // Map to table 'id'
            service_id: (await this.getServiceId(data.service_code)) || null, // Need UUID usually, but here code might be used. Checking schema... Assuming service_id FK needs UUID.
            jan_aadhaar_id: data.applicant.jan_aadhaar_id,
            status: "submitted",
            metadata: { // Storing complex structure in JSONB for now to match interface
                service_code: data.service_code,
                service_name_hi: service?.name_hi,
                status_hi: "जमा",
                current_step: 1,
                total_steps: 4,
                applicant_name: data.applicant.name,
                timeline: timeline
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        // Note: The 'applications' table schema observed earlier had: service_id, jan_aadhaar_id, status, metadata.
        // It did not have 'application_id' separate from 'id' (UUID usually). 
        // If 'id' is UUID, `EM...` string won't fit if it's strictly UUID type. 
        // Checking schema: id is uuid.
        // CHANGE: If ID is UUID, we can't force 'EM...'. We must let Postgres generate it or generate a UUID.
        // But the frontend expects 'EM...' maybe? 
        // Correction: The observed schema for applications has `id uuid DEFAULT gen_random_uuid()`.
        // I will let Supabase generate UUID and return that. The "EM..." format is legacy mock.

        // However, I need to insert `service_id`. I need to lookup service UUID by code.

        const { data: serviceIdData } = await supabase.from('services').select('id').eq('code', data.service_code).single();
        if (serviceIdData) {
            newApplication.service_id = serviceIdData.id;
        }

        // Drop the custom string ID if column is UUID.
        // Actually, let's try to insert without ID and let it auto-gen.
        const appPayload = {
            service_id: newApplication.service_id,
            jan_aadhaar_id: newApplication.jan_aadhaar_id,
            status: newApplication.status,
            metadata: newApplication.metadata,
        };

        const { data: insertedApp, error } = await supabase
            .from('applications')
            .insert(appPayload)
            .select('id')
            .single();

        if (error || !insertedApp) {
            console.error("Supabase insert error:", error);
            return {
                success: false,
                application_id: null,
                message: "Failed to submit application",
                message_hi: "आवेदन दर्ज करने में विफल",
                token_number: null,
                estimated_completion: null,
            };
        }

        const finalAppId = insertedApp.id;

        return {
            success: true,
            application_id: finalAppId,
            message: "Application submitted successfully",
            message_hi: "आवेदन सफलतापूर्वक जमा हो गया",
            token_number: `TK${Date.now().toString().slice(-8)}`,
            estimated_completion: service?.processing_time || "7-15 days",
        };
    }

    async checkStatus(applicationId: string): Promise<ApplicationStatus | null> {
        const { data, error } = await supabase
            .from('applications')
            .select('*, services(code, name_hi)') // Join to get service details
            .eq('id', applicationId)
            .single();

        if (error || !data) return null;

        const metadata = data.metadata as any;

        return {
            application_id: data.id,
            service_code: data.services?.code || metadata?.service_code,
            service_name_hi: data.services?.name_hi || metadata?.service_name_hi,
            status: data.status, // We might need to map DB status to interface unions if they differ
            status_hi: metadata?.status_hi || "प्रक्रियाधीन",
            submitted_at: data.created_at,
            last_updated: data.updated_at,
            current_step: metadata?.current_step || 1,
            total_steps: metadata?.total_steps || 4,
            timeline: metadata?.timeline || [],
            remarks: metadata?.remarks,
            remarks_hi: metadata?.remarks_hi,
        };
    }

    private async getServiceId(code: string): Promise<string | undefined> {
        const { data } = await supabase.from('services').select('id').eq('code', code).single();
        return data?.id;
    }
}

// Export singleton
export const emitraAdapter = new SupabaseEMitraAdapter();
