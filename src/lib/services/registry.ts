/**
 * Government Services Registry (Supabase Backed)
 * Fetches real citizen data and scheme details from the database.
 */

import { createClient } from "@supabase/supabase-js";
import { JanAadhaarRecord, Service, Scheme } from "../supabase/client";
import { EligibilityService } from "./eligibility";

// Lazy Initialization
let supabaseInstance: any = null;

const getSupabase = () => {
    if (!supabaseInstance) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error("Supabase credentials missing");
            throw new Error("Supabase Config Missing");
        }
        supabaseInstance = createClient(supabaseUrl, supabaseKey);
    }
    return supabaseInstance;
};

export interface ServiceResponse {
    status: string;
    message_hi: string;
    details?: Record<string, any>;
}

export const ServiceRegistry = {

    // 1. Check Pension Status
    async checkPensionStatus(identifier: string): Promise<ServiceResponse> {
        const supabase = getSupabase();

        // 1. Check Jan Aadhaar Record in FAMILIES table
        const { data: family, error } = await supabase
            .from("families")
            .select("*, members(*)")
            .eq("jan_aadhaar_id", identifier)
            .single();

        if (error || !family) {
            // Fallback: Check if we have an APPLICATION in our system
            // Note: applications table now stores jan_aadhaar_id directly
            const { data: appData } = await supabase
                .from("applications")
                .select("*, services(name_hi)")
                .or(`jan_aadhaar_id.eq.${identifier},submission_id.eq.${identifier}`)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (appData) {
                return {
                    status: appData.status,
                    message_hi: `आपका ${appData.services?.name_hi || 'सेवा'} आवेदन (ID: ${appData.submission_id || 'N/A'}) की स्थिति: ${appData.status === 'approved' ? 'स्वीकृत' : 'प्रक्रियाधीन'} है।`,
                    details: { status: appData.status, date: appData.created_at }
                };
            }

            return {
                status: "NOT_FOUND",
                message_hi: "यह जन आधार नंबर हमारे डेटाबेस में नहीं मिला।",
            };
        }

        // Logic for Pension eligibility based on Family Members
        const members = (family.members as any[]) || [];
        const eligibleMember = members.find((m: any) => {
            // Calculate Age from DOB if age column missing, or use age column
            // Assuming mock data has 'age' or we parse dob
            const age = m.age || (m.dob ? new Date().getFullYear() - new Date(m.dob).getFullYear() : 0);

            const isOld = (m.gender === "M" && age >= 58) || (m.gender === "F" && age >= 55);
            const isWidow = m.marital_status === "WIDOW";
            const isDisabled = m.is_divyang === true; // Schema check needed, using common field
            return isOld || isWidow || isDisabled;
        });

        if (eligibleMember) {
            return {
                status: "ELIGIBLE",
                message_hi: `बधाई हो! ${eligibleMember.name_hi || eligibleMember.name} पेंशन के लिए पात्र हैं। क्या आप अभी आवेदन करना चाहते हैं?`,
                details: { beneficiary: eligibleMember.name, scheme: "Social Security Pension" }
            };
        }

        return {
            status: "NO_ELIGIBLE_MEMBER",
            message_hi: "इस परिवार में कोई भी सदस्य पेंशन के लिए पात्र नहीं पाया गया।",
            details: { members_checked: members.length }
        };
    },

    // 2. Check Ration Status
    async checkRationStatus(identifier: string): Promise<ServiceResponse> {
        const supabase = getSupabase();
        const { data: family, error } = await supabase
            .from("families")
            .select("*, members(*)")
            .eq("jan_aadhaar_id", identifier)
            .single();

        if (error || !family) {
            return { status: "NOT_FOUND", message_hi: "जन आधार नंबर मान्य नहीं है।" };
        }

        if (["NFSA", "BPL", "AAY"].includes(family.economic_status || "")) {
            const memberCount = (family.members as any[])?.length || 0;
            return {
                status: "ACTIVE",
                message_hi: `आपका राशन कार्ड सक्रिय है। ${memberCount} सदस्यों के लिए राशन उपलब्ध है।`,
                details: { wheat: `${memberCount * 5} Kg`, status: "Active" }
            };
        }
        return { status: "NOT_ACTIVE", message_hi: "आप राशन के लिए पात्र नहीं हैं (Not NFSA)।" };
    },


    // 3. Get Eligible Schemes (REAL DB FILTER)
    async checkEligibility(identifier: string): Promise<ServiceResponse> {
        const supabase = getSupabase();

        // Get Family Data
        const { data: family } = await supabase
            .from("families")
            .select("*, members(*)")
            .eq("jan_aadhaar_id", identifier)
            .single();

        if (!family) return { status: "ERROR", message_hi: "जन आधार डेटा नहीं मिला।" };

        // Fetch Schemes
        const { data: schemes } = await supabase
            .from("schemes")
            .select("*")
            .eq("is_active", true);

        if (!schemes) return { status: "ERROR", message_hi: "योजना सूची लोड नहीं हो सकी।" };

        const eligibleSchemes: string[] = [];
        const members = (family.members as any[]) || [];


        // Dynamic Rule Engine
        for (const scheme of schemes) {
            // Check if ANY member in the family is eligible for this scheme
            let isSchemeEligible = false;

            for (const member of members) {
                // Enrich member data with family context if needed
                const memberData = { ...member, ...family };
                const { eligible } = await EligibilityService.checkEligibility(scheme.id, memberData);

                if (eligible) {
                    isSchemeEligible = true;
                    // We could store WHICH member is eligible here too
                    break;
                }
            }

            if (isSchemeEligible) {
                eligibleSchemes.push(scheme.name_hi);
            }
        }

        if (eligibleSchemes.length === 0) {
            return { status: "NONE", message_hi: "वर्तमान में कोई योजना उपलब्ध नहीं है।" };
        }

        return {
            status: "SUCCESS",
            message_hi: `आपके परिवार के लिए ${eligibleSchemes.length} योजनाएं उपलब्ध हैं: ${eligibleSchemes.join(", ")}।`,
            details: { schemes: eligibleSchemes }
        };
    },

    // 4. Create Draft Application (Real DB Insert - Draft Status)
    async createDraftApplication(serviceType: string, identifier: string, metadata: any = {}): Promise<ServiceResponse> {
        const supabase = getSupabase();

        // 1. Resolve Service ID
        // For demo, we default to 'PENSION_NEW' if generic, or search
        let serviceCode = 'PENSION_NEW';
        if (serviceType.toLowerCase().includes('job')) serviceCode = 'JOBCARD_NEW';

        const { data: service } = await supabase.from('services').select('id, name_hi').eq('code', serviceCode).single();

        if (!service) return { status: "ERROR", message_hi: "सेवा उपलब्ध नहीं है।" };

        // 2. CHECK FOR EXISTING DRAFT (Resume Logic)
        const { data: existingDraft } = await supabase
            .from("applications")
            .select("*")
            .eq("jan_aadhaar_id", identifier)
            .eq("service_id", service.id)
            .eq("status", "draft")
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (existingDraft) {
            return {
                status: "DRAFT_RESUMED",
                message_hi: `आपका पिछला अधूरा आवेदन मिला। हम वहीं से शुरू कर रहे हैं।`,
                details: {
                    applicationId: existingDraft.id,
                    submissionId: existingDraft.submission_id,
                    serviceName: service.name_hi,
                    status: 'draft',
                    isResumed: true
                }
            };
        }

        // 3. Insert Application as DRAFT (New)
        const submissionId = `APP-${Date.now().toString().slice(-6)}`;
        const { data: app, error } = await supabase
            .from("applications")
            .insert({
                jan_aadhaar_id: identifier,
                service_id: service.id,
                status: 'draft', // Key Change: DRAFT status
                submission_id: submissionId,
                current_step: 1,
                metadata: { channel: 'voice', ...metadata }
            })
            .select()
            .single();

        if (error) {
            console.error("Draft Application Insert Error:", error);
            return { status: "ERROR", message_hi: "तकनीकी समस्या के कारण आवेदन शुरू नहीं हो सका।" };
        }

        return {
            status: "DRAFT_CREATED",
            message_hi: `आवेदन का विवरण तैयार है। कृपया पुष्टि करें।`,
            details: {
                applicationId: app.id, // UUID for internal linking
                submissionId: submissionId,
                serviceName: service.name_hi,
                status: 'draft'
            }
        };
    },

    // 5. Submit Application (Requires Consent)
    async submitApplication(applicationId: string, consentId: string): Promise<ServiceResponse> {
        const supabase = getSupabase();

        // 1. Verify Application exists and is in draft
        const { data: app, error: appError } = await supabase
            .from("applications")
            .select("*")
            .eq("id", applicationId)
            .single();

        if (appError || !app) {
            return { status: "ERROR", message_hi: "आवेदन नहीं मिला।" };
        }

        if (app.status !== 'draft') {
            return { status: "ALREADY_SUBMITTED", message_hi: "यह आवेदन पहले ही जमा किया जा चुका है।" };
        }

        // 2. STRICT: Verify Consent Exists and is Valid
        const { data: consent, error: consentError } = await supabase
            .from("consent_logs")
            .select("id, application_id")
            .eq("id", consentId)
            .eq("application_id", applicationId)
            .single();

        if (consentError || !consent) {
            console.error("Consent Verification Failed", consentId, applicationId);
            return { status: "CONSENT_MISSING", message_hi: "आवेदन जमा करने के लिए आपकी अनुमति (Consent) मान्य नहीं है।" };
        }

        // 3. Update Status to Submitted
        const { error: updateError } = await supabase
            .from("applications")
            .update({
                status: 'submitted',
                metadata: { ...app.metadata, consent_id: consentId, submitted_at: new Date().toISOString() }
            })
            .eq("id", applicationId);

        if (updateError) {
            return { status: "ERROR", message_hi: "आवेदन जमा करने में समस्या आई।" };
        }

        // 4. Log Status Event - HANDLED BY DB TRIGGER
        // The 'on_application_status_change' trigger automatically logs this event.
        // We only need to return the response.

        return {
            status: "SUBMITTED",
            message_hi: `आपका आवेदन (ID: ${app.submission_id}) सफलतापूर्वक जमा कर दिया गया है।`,
            details: { applicationId: app.submission_id }
        };
    },

    // 6. Search Schemes (New)
    async searchSchemes(query: string): Promise<ServiceResponse> {
        const supabase = getSupabase();

        if (!query || query.trim().length === 0) {
            return { status: "EMPTY_QUERY", message_hi: "कृपया कुछ खोजें।" };
        }

        // Search in services table (assuming schemes are mapped to services or similar)
        // Adjust column names based on actual schema if needed. 
        // Using 'services' table as per previous context where 'schemes' are often synonymous or related.
        // Actually, line 138 in read file showed 'schemes' table exists. Let's use that.

        const { data: schemes, error } = await supabase
            .from("schemes")
            .select("*")
            .or(`name_en.ilike.%${query}%,name_hi.ilike.%${query}%,description_en.ilike.%${query}%,description_hi.ilike.%${query}%`)
            .eq("is_active", true)
            .limit(5);

        if (error) {
            console.error("Search Error:", error);
            return { status: "ERROR", message_hi: "खोज में त्रुटि हुई।" };
        }

        if (!schemes || schemes.length === 0) {
            return {
                status: "NOT_FOUND",
                message_hi: "कोई योजना नहीं मिली।",
                details: { query }
            };
        }

        return {
            status: "FOUND",
            message_hi: `कुल ${schemes.length} योजनाएं मिलीं।`,
            details: { schemes }
        };
    },

    // 7. Get All Scheme Knowledge (For AI Context)
    async getAllSchemeNames(): Promise<string[]> {
        const supabase = getSupabase();
        const { data: schemes } = await supabase
            .from("schemes")
            .select("name_en, name_hi, official_link, application_process")
            .eq("is_active", true);

        if (!schemes) return [];

        return schemes.map((s: any) => {
            let info = `${s.name_en} (${s.name_hi})`;
            if (s.official_link) info += `\n   - Official Link: ${s.official_link}`;
            if (s.application_process) info += `\n   - Process: ${s.application_process}`;
            return info;
        });
    },

    // 8. Get Complete Scheme Details
    async getSchemeDetails(schemeIdOrCode: string): Promise<ServiceResponse> {
        const supabase = getSupabase();

        // Try to find by ID or code
        let query = supabase.from("schemes").select("*");

        // Check if it's a UUID
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(schemeIdOrCode);

        if (isUUID) {
            query = query.eq("id", schemeIdOrCode);
        } else {
            query = query.eq("code", schemeIdOrCode.toUpperCase());
        }

        const { data: scheme, error } = await query.single();

        if (error || !scheme) {
            return {
                status: "NOT_FOUND",
                message_hi: "योजना नहीं मिली। कृपया सही कोड दर्ज करें।"
            };
        }

        // Format eligibility criteria
        const eligibility = scheme.eligibility_criteria || {};
        const eligibilityText_hi: string[] = [];

        if (eligibility.min_age) eligibilityText_hi.push(`न्यूनतम आयु: ${eligibility.min_age} वर्ष`);
        if (eligibility.max_age) eligibilityText_hi.push(`अधिकतम आयु: ${eligibility.max_age} वर्ष`);
        if (eligibility.income_limit) eligibilityText_hi.push(`आय सीमा: ₹${eligibility.income_limit.toLocaleString()}`);
        if (eligibility.category) eligibilityText_hi.push(`श्रेणी: ${eligibility.category}`);
        if (eligibility.gender) eligibilityText_hi.push(`लिंग: ${eligibility.gender === 'F' ? 'महिला' : 'पुरुष'}`);

        return {
            status: "FOUND",
            message_hi: `${scheme.name_hi}: ${scheme.description_hi || scheme.description_en || 'विवरण उपलब्ध नहीं'}`,
            details: {
                id: scheme.id,
                code: scheme.code,
                name_en: scheme.name_en,
                name_hi: scheme.name_hi,
                description_en: scheme.description_en,
                description_hi: scheme.description_hi,
                category: scheme.category_hi || scheme.category,
                department: scheme.department_hi || scheme.department,
                benefits: scheme.benefits,
                benefits_summary_hi: scheme.benefits_summary_hi,
                eligibility_criteria: eligibility,
                eligibility_text_hi: eligibilityText_hi.join(', ') || 'सभी के लिए',
                required_documents: scheme.required_documents || [],
                application_url: scheme.application_url,
                official_link: scheme.official_link,
                application_process: scheme.application_process,
                is_active: scheme.is_active
            }
        };
    },

    // 9. Get Application Timeline
    async getApplicationTimeline(applicationId: string): Promise<ServiceResponse> {
        const supabase = getSupabase();

        // Fetch application with status events
        const { data: app, error } = await supabase
            .from("applications")
            .select(`
                *,
                services(name_en, name_hi),
                status_events(new_status, created_at, details)
            `)
            .eq("id", applicationId)
            .single();

        if (error || !app) {
            return {
                status: "NOT_FOUND",
                message_hi: "आवेदन नहीं मिला।"
            };
        }

        const statusTranslations: Record<string, string> = {
            draft: 'ड्राफ्ट',
            submitted: 'जमा',
            in_process: 'प्रक्रियाधीन',
            approved: 'स्वीकृत',
            rejected: 'अस्वीकृत'
        };

        // Build timeline
        const timeline = [
            {
                status: 'created',
                status_hi: 'बनाया गया',
                date: app.created_at,
                details: null
            },
            ...((app.status_events as any[]) || []).map((event: any) => ({
                status: event.new_status,
                status_hi: statusTranslations[event.new_status] || event.new_status,
                date: event.created_at,
                details: event.details
            }))
        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return {
            status: "FOUND",
            message_hi: `आवेदन ${app.submission_id} की स्थिति: ${statusTranslations[app.status] || app.status}`,
            details: {
                application_id: app.id,
                submission_id: app.submission_id,
                service_name: app.services?.name_hi || app.services?.name_en,
                current_status: app.status,
                current_status_hi: statusTranslations[app.status] || app.status,
                created_at: app.created_at,
                timeline
            }
        };
    }
};
