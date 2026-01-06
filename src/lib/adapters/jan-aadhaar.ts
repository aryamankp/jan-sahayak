/**
 * Jan Aadhaar Service Adapter
 * 
 * This module provides an abstraction layer for Jan Aadhaar API integration.
 * Currently uses local database for mock data.
 * When real API access is granted, swap the implementation without changing interface.
 * 
 * API Categories:
 * - Validation: Verify Jan Aadhaar number exists
 * - Family Fetch: Get all family members
 * - Demographics: Address, category, economic status
 */

import { supabase } from "@/lib/supabase/client";

export interface JanAadhaarMember {
    id: string;
    name: string;
    name_hi: string;
    relation: string;
    gender: "MALE" | "FEMALE" | "OTHER";
    age: number;
    is_head: boolean;
    mobile?: string;
    disability?: string;
}

export interface JanAadhaarRecord {
    jan_aadhaar_id: string;
    head_of_family: string;
    head_of_family_hi: string;
    address_en: string;
    address_hi: string;
    district: string;
    category: string; // SC, ST, OBC, General
    economic_status: string; // BPL, APL
    mobile_number: string;
    members: JanAadhaarMember[];
}

export interface JanAadhaarError {
    code: "NOT_FOUND" | "INVALID_ID" | "API_ERROR" | "SERVICE_UNAVAILABLE";
    message: string;
    message_hi: string;
}

// Configuration for real API (when available)
const API_CONFIG = {
    enabled: false, // Set to true when real API is available
    baseUrl: process.env.JAN_AADHAAR_API_URL || "",
    apiKey: process.env.JAN_AADHAAR_API_KEY || "",
    timeout: 10000
};

/**
 * Fetch Jan Aadhaar record by ID
 * Falls back to database mock when API is not available
 */
export async function fetchJanAadhaar(
    janAadhaarId: string
): Promise<{ data: JanAadhaarRecord | null; error: JanAadhaarError | null }> {

    // Validate input
    if (!janAadhaarId || janAadhaarId.length < 5) {
        return {
            data: null,
            error: {
                code: "INVALID_ID",
                message: "Invalid Jan Aadhaar ID format",
                message_hi: "गलत जन आधार नंबर"
            }
        };
    }

    // Check if real API is enabled
    if (API_CONFIG.enabled && API_CONFIG.baseUrl) {
        return await fetchFromRealAPI(janAadhaarId);
    }

    // Use database mock
    return await fetchFromDatabase(janAadhaarId);
}

/**
 * Validate if Jan Aadhaar exists (lighter check)
 */
export async function validateJanAadhaar(
    janAadhaarId: string
): Promise<{ valid: boolean; error: JanAadhaarError | null }> {

    if (!janAadhaarId || janAadhaarId.length < 5) {
        return { valid: false, error: { code: "INVALID_ID", message: "Invalid ID", message_hi: "गलत नंबर" } };
    }

    const { data, error } = await supabase
        .from("jan_aadhaar_records")
        .select("jan_aadhaar_id")
        .eq("jan_aadhaar_id", janAadhaarId)
        .single();

    if (error || !data) {
        return {
            valid: false,
            error: {
                code: "NOT_FOUND",
                message: "Jan Aadhaar not found",
                message_hi: "जन आधार नहीं मिला"
            }
        };
    }

    return { valid: true, error: null };
}

/**
 * Get specific family member from Jan Aadhaar
 */
export async function getFamilyMember(
    janAadhaarId: string,
    memberId: string
): Promise<JanAadhaarMember | null> {

    const { data, error } = await fetchJanAadhaar(janAadhaarId);
    if (error || !data) return null;

    return data.members.find(m => m.id === memberId) || null;
}

/**
 * Check eligibility based on Jan Aadhaar data
 */
export function checkEligibility(
    record: JanAadhaarRecord,
    criteria: {
        minAge?: number;
        maxAge?: number;
        category?: string[];
        economicStatus?: string[];
        hasDisability?: boolean;
    }
): { eligible: boolean; reasons: string[] } {

    const reasons: string[] = [];
    const headMember = record.members.find(m => m.is_head) || record.members[0];

    if (criteria.minAge && headMember.age < criteria.minAge) {
        reasons.push(`Age ${headMember.age} is below minimum ${criteria.minAge}`);
    }

    if (criteria.maxAge && headMember.age > criteria.maxAge) {
        reasons.push(`Age ${headMember.age} is above maximum ${criteria.maxAge}`);
    }

    if (criteria.category && !criteria.category.includes(record.category)) {
        reasons.push(`Category ${record.category} not eligible`);
    }

    if (criteria.economicStatus && !criteria.economicStatus.includes(record.economic_status)) {
        reasons.push(`Economic status ${record.economic_status} not eligible`);
    }

    if (criteria.hasDisability) {
        const hasDisabledMember = record.members.some(m => m.disability);
        if (!hasDisabledMember) {
            reasons.push("No disabled family member found");
        }
    }

    return {
        eligible: reasons.length === 0,
        reasons
    };
}

// --- Private Functions ---

async function fetchFromDatabase(
    janAadhaarId: string
): Promise<{ data: JanAadhaarRecord | null; error: JanAadhaarError | null }> {

    const { data, error } = await supabase
        .from("jan_aadhaar_records")
        .select("*")
        .eq("jan_aadhaar_id", janAadhaarId)
        .single();

    if (error || !data) {
        return {
            data: null,
            error: {
                code: "NOT_FOUND",
                message: "Jan Aadhaar record not found",
                message_hi: "जन आधार रिकॉर्ड नहीं मिला"
            }
        };
    }

    return {
        data: {
            jan_aadhaar_id: data.jan_aadhaar_id,
            head_of_family: data.head_of_family || "",
            head_of_family_hi: data.head_of_family_hi || "",
            address_en: data.address_en || "",
            address_hi: data.address_hi || "",
            district: data.district || "",
            category: data.category || "",
            economic_status: data.economic_status || "",
            mobile_number: data.mobile_number || "",
            members: (data.members as unknown as JanAadhaarMember[]) || []
        },
        error: null
    };
}

async function fetchFromRealAPI(
    janAadhaarId: string
): Promise<{ data: JanAadhaarRecord | null; error: JanAadhaarError | null }> {

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), API_CONFIG.timeout);

        const response = await fetch(`${API_CONFIG.baseUrl}/verify/${janAadhaarId}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${API_CONFIG.apiKey}`,
                "Content-Type": "application/json"
            },
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            if (response.status === 404) {
                return {
                    data: null,
                    error: { code: "NOT_FOUND", message: "Not found", message_hi: "नहीं मिला" }
                };
            }
            throw new Error(`API error: ${response.status}`);
        }

        const apiData = await response.json();

        // Transform API response to our interface
        return {
            data: transformAPIResponse(apiData),
            error: null
        };
    } catch (err: any) {
        console.error("Jan Aadhaar API error:", err);

        // Fallback to database on API failure
        console.log("Falling back to database...");
        return await fetchFromDatabase(janAadhaarId);
    }
}

function transformAPIResponse(apiData: any): JanAadhaarRecord {
    // Transform real API response to our interface
    // This will be implemented when real API access is available
    return apiData;
}
