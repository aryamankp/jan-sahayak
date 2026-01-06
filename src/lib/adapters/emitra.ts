/**
 * e-Mitra Service Adapter
 * 
 * Abstraction layer for e-Mitra API integration.
 * Currently uses local database. Ready for real API when available.
 * 
 * API Categories:
 * - Service Catalog: List of available services
 * - Application Submission: Submit applications
 * - Status Tracking: Check application status
 * - Fee/Payment: Handle service fees (future)
 */

import { supabase, Service } from "@/lib/supabase/client";
import { v4 as uuidv4 } from "uuid";

export interface EMitraService {
    id: string;
    code: string;
    name_hi: string;
    name_en: string;
    department_hi: string;
    department_en?: string;
    fee: number;
    processing_days?: number;
    is_active: boolean;
}

export interface EMitraApplication {
    application_id: string;
    submission_id: string;
    service_code: string;
    status: string;
    submitted_at: string;
    updated_at: string;
    applicant: {
        name: string;
        jan_aadhaar_id: string;
        mobile: string;
    };
    form_data: Record<string, any>;
}

export interface EMitraStatus {
    application_id: string;
    submission_id: string;
    status: "draft" | "submitted" | "in_process" | "approved" | "rejected" | "needs_info";
    status_hi: string;
    last_updated: string;
    timeline: StatusEvent[];
    remarks?: string;
}

export interface StatusEvent {
    status: string;
    title_hi: string;
    title_en: string;
    date: string;
    remarks?: string;
}

// Configuration for real API
const API_CONFIG = {
    enabled: false,
    baseUrl: process.env.EMITRA_API_URL || "",
    apiKey: process.env.EMITRA_API_KEY || "",
    timeout: 15000
};

/**
 * Fetch service catalog
 */
export async function getServiceCatalog(
    filters?: { department?: string; search?: string }
): Promise<EMitraService[]> {

    if (API_CONFIG.enabled) {
        return await fetchServicesFromAPI(filters);
    }

    // Database fallback
    let query = supabase
        .from("services")
        .select("*")
        .eq("is_active", true);

    if (filters?.department) {
        query = query.eq("department_en", filters.department);
    }

    if (filters?.search) {
        query = query.or(`name_hi.ilike.%${filters.search}%,name_en.ilike.%${filters.search}%`);
    }

    const { data, error } = await query.order("name_en");

    if (error) {
        console.error("Service catalog error:", error);
        return [];
    }

    return (data || []) as unknown as EMitraService[];
}

/**
 * Get single service details
 */
export async function getService(serviceCode: string): Promise<EMitraService | null> {

    const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("code", serviceCode)
        .single();

    if (error || !data) return null;
    return data as unknown as EMitraService;
}

/**
 * Submit application to e-Mitra
 */
export async function submitApplication(
    applicationData: {
        service_code: string;
        applicant: {
            name: string;
            jan_aadhaar_id: string;
            mobile: string;
        };
        form_data: Record<string, any>;
        consent_id: string;
    }
): Promise<{ success: boolean; submission_id?: string; error?: string }> {

    const submissionId = generateSubmissionId();

    if (API_CONFIG.enabled) {
        return await submitToRealAPI(applicationData, submissionId);
    }

    // Database submission
    try {
        // Get service ID
        const { data: service } = await supabase
            .from("services")
            .select("id")
            .eq("code", applicationData.service_code)
            .single();

        if (!service) {
            return { success: false, error: "Service not found" };
        }

        // Create application
        const { error: insertError } = await supabase
            .from("applications")
            .insert({
                id: uuidv4(),
                submission_id: submissionId,
                service_id: service.id,
                jan_aadhaar_id: applicationData.applicant.jan_aadhaar_id,
                status: "submitted",
                metadata: {
                    applicant: applicationData.applicant,
                    form_data: applicationData.form_data,
                    consent_id: applicationData.consent_id,
                    submitted_via: "jan_sahayak"
                }
            });

        if (insertError) throw insertError;

        return { success: true, submission_id: submissionId };
    } catch (err: any) {
        console.error("Submit error:", err);
        return { success: false, error: err.message };
    }
}

/**
 * Check application status
 */
export async function checkStatus(
    submissionIdOrAppId: string
): Promise<EMitraStatus | null> {

    if (API_CONFIG.enabled) {
        return await fetchStatusFromAPI(submissionIdOrAppId);
    }

    // Database lookup
    const { data: app, error } = await supabase
        .from("applications")
        .select(`
      id,
      submission_id,
      status,
      created_at,
      updated_at,
      services:service_id (name_hi, name_en)
    `)
        .or(`submission_id.eq.${submissionIdOrAppId},id.eq.${submissionIdOrAppId}`)
        .single();

    if (error || !app) return null;

    // Fetch timeline from status_events
    const { data: events } = await supabase
        .from("status_events")
        .select("*")
        .eq("application_id", app.id)
        .order("created_at", { ascending: true });

    const statusLabels: Record<string, { hi: string; en: string }> = {
        draft: { hi: "ड्राफ्ट", en: "Draft" },
        submitted: { hi: "जमा", en: "Submitted" },
        in_process: { hi: "प्रक्रियाधीन", en: "Processing" },
        approved: { hi: "स्वीकृत", en: "Approved" },
        rejected: { hi: "अस्वीकृत", en: "Rejected" },
        needs_info: { hi: "अधिक जानकारी चाहिए", en: "Needs Info" }
    };

    const timeline: StatusEvent[] = (events || []).map((e: any) => ({
        status: e.new_status,
        title_hi: statusLabels[e.new_status]?.hi || e.new_status,
        title_en: statusLabels[e.new_status]?.en || e.new_status,
        date: e.created_at,
        remarks: e.details?.remarks
    }));

    return {
        application_id: app.id,
        submission_id: app.submission_id || "",
        status: (app.status as EMitraStatus["status"]) || "in_process",
        status_hi: statusLabels[app.status]?.hi || app.status || "",
        last_updated: app.updated_at || new Date().toISOString(),
        timeline
    };
}

// --- Private Functions ---

function generateSubmissionId(): string {
    const prefix = "EM";
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const random = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
    return `${prefix}${year}${month}${random}`;
}

async function fetchServicesFromAPI(filters?: any): Promise<EMitraService[]> {
    try {
        const response = await fetch(`${API_CONFIG.baseUrl}/services`, {
            headers: { "Authorization": `Bearer ${API_CONFIG.apiKey}` }
        });
        if (!response.ok) throw new Error("API error");
        return await response.json();
    } catch {
        // Fallback to database
        return await getServiceCatalog(filters);
    }
}

async function submitToRealAPI(
    data: any,
    submissionId: string
): Promise<{ success: boolean; submission_id?: string; error?: string }> {
    try {
        const response = await fetch(`${API_CONFIG.baseUrl}/applications/submit`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_CONFIG.apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ ...data, submission_id: submissionId })
        });

        if (!response.ok) throw new Error("Submission failed");

        const result = await response.json();
        return { success: true, submission_id: result.submission_id || submissionId };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

async function fetchStatusFromAPI(id: string): Promise<EMitraStatus | null> {
    try {
        const response = await fetch(`${API_CONFIG.baseUrl}/applications/status/${id}`, {
            headers: { "Authorization": `Bearer ${API_CONFIG.apiKey}` }
        });
        if (!response.ok) return null;
        return await response.json();
    } catch {
        return await checkStatus(id); // Fallback
    }
}
