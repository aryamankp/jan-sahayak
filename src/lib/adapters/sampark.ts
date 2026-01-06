/**
 * Rajasthan Sampark Grievance Adapter
 * 
 * Abstraction layer for Sampark API integration.
 * Currently uses local database. Ready for real API when available.
 * 
 * API Categories:
 * - Grievance Creation: Register new complaints
 * - Status Tracking: Check grievance status
 * - Department Routing: Route to correct department
 */

import { supabase } from "@/lib/supabase/client";
import { v4 as uuidv4 } from "uuid";

export interface GrievanceCategory {
    id: string;
    name_hi: string;
    name_en: string;
    department_code: string;
    icon?: string;
}

export interface GrievanceSubmission {
    category_id: string;
    description: string;
    description_hi?: string;
    applicant: {
        name: string;
        mobile: string;
        address?: string;
        jan_aadhaar_id?: string;
    };
    location?: {
        district: string;
        block?: string;
        village?: string;
    };
    attachments?: string[];
}

export interface GrievanceTicket {
    ticket_id: string;
    category: string;
    description: string;
    status: "registered" | "assigned" | "in_progress" | "resolved" | "closed";
    status_hi: string;
    created_at: string;
    expected_resolution: string;
    assigned_to?: string;
}

// Configuration for real API
const API_CONFIG = {
    enabled: false,
    baseUrl: process.env.SAMPARK_API_URL || "",
    apiKey: process.env.SAMPARK_API_KEY || ""
};

/**
 * Get grievance categories
 */
export async function getCategories(): Promise<GrievanceCategory[]> {
    // Static categories (would come from API in production)
    return [
        { id: "CAT_WATER", name_hi: "पानी की समस्या", name_en: "Water Supply", department_code: "PHED", icon: "💧" },
        { id: "CAT_ELECTRICITY", name_hi: "बिजली की समस्या", name_en: "Electricity", department_code: "RVUNL", icon: "⚡" },
        { id: "CAT_ROADS", name_hi: "सड़क की समस्या", name_en: "Roads", department_code: "PWD", icon: "🛣️" },
        { id: "CAT_PENSION", name_hi: "पेंशन संबंधित", name_en: "Pension Related", department_code: "SJE", icon: "👴" },
        { id: "CAT_HEALTH", name_hi: "स्वास्थ्य सेवाएं", name_en: "Health Services", department_code: "MEDICAL", icon: "🏥" },
        { id: "CAT_EDUCATION", name_hi: "शिक्षा संबंधित", name_en: "Education", department_code: "EDU", icon: "📚" },
        { id: "CAT_REVENUE", name_hi: "राजस्व/भूमि", name_en: "Revenue/Land", department_code: "REVENUE", icon: "📋" },
        { id: "CAT_OTHER", name_hi: "अन्य", name_en: "Other", department_code: "GENERAL", icon: "📝" }
    ];
}

/**
 * Submit grievance
 */
export async function submitGrievance(
    data: GrievanceSubmission
): Promise<{ success: boolean; ticket_id?: string; error?: string }> {

    const ticketId = generateTicketId();

    if (API_CONFIG.enabled) {
        return await submitToSamparkAPI(data, ticketId);
    }

    // Database submission
    try {
        const { error } = await supabase
            .from("grievances")
            .insert({
                id: uuidv4(),
                ticket_id: ticketId,
                category_id: data.category_id,
                description: data.description,
                description_hi: data.description_hi || data.description,
                applicant_name: data.applicant.name,
                applicant_mobile: data.applicant.mobile,
                applicant_address: data.applicant.address,
                jan_aadhaar_id: data.applicant.jan_aadhaar_id,
                location: data.location,
                status: "registered",
                created_at: new Date().toISOString()
            });

        if (error) throw error;

        return { success: true, ticket_id: ticketId };
    } catch (err: any) {
        console.error("Grievance submit error:", err);
        return { success: false, error: err.message };
    }
}

/**
 * Check grievance status
 */
export async function checkGrievanceStatus(
    ticketId: string
): Promise<GrievanceTicket | null> {

    if (API_CONFIG.enabled) {
        return await fetchStatusFromSampark(ticketId);
    }

    const { data, error } = await supabase
        .from("grievances")
        .select("*")
        .eq("ticket_id", ticketId)
        .single();

    if (error || !data) return null;

    const statusLabels: Record<string, string> = {
        registered: "दर्ज",
        assigned: "सौंपा गया",
        in_progress: "प्रक्रियाधीन",
        resolved: "समाधान",
        closed: "बंद"
    };

    return {
        ticket_id: data.ticket_id,
        category: data.category_id || "general",
        description: data.description,
        status: (data.status as GrievanceTicket["status"]) || "registered",
        status_hi: statusLabels[data.status || "registered"] || data.status || "दर्ज",
        created_at: data.created_at || new Date().toISOString(),
        expected_resolution: calculateExpectedResolution(data.created_at || new Date().toISOString()),
        assigned_to: data.assigned_to || undefined
    };
}

// --- Private Functions ---

function generateTicketId(): string {
    const prefix = "GRV";
    const year = new Date().getFullYear();
    const random = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
    return `${prefix}${year}${random}`;
}

function calculateExpectedResolution(createdAt: string): string {
    const date = new Date(createdAt);
    date.setDate(date.getDate() + 15); // 15 days SLA
    return date.toISOString();
}

async function submitToSamparkAPI(
    data: GrievanceSubmission,
    ticketId: string
): Promise<{ success: boolean; ticket_id?: string; error?: string }> {
    try {
        const response = await fetch(`${API_CONFIG.baseUrl}/grievances/register`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_CONFIG.apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ ...data, ticket_id: ticketId })
        });

        if (!response.ok) throw new Error("Submission failed");
        return { success: true, ticket_id: ticketId };
    } catch (err: any) {
        // Fallback to database
        return await submitGrievance(data);
    }
}

async function fetchStatusFromSampark(ticketId: string): Promise<GrievanceTicket | null> {
    try {
        const response = await fetch(`${API_CONFIG.baseUrl}/grievances/status/${ticketId}`, {
            headers: { "Authorization": `Bearer ${API_CONFIG.apiKey}` }
        });
        if (!response.ok) return null;
        return await response.json();
    } catch {
        return await checkGrievanceStatus(ticketId);
    }
}
