/**
 * Service Adapters Index
 * 
 * Centralized export for all government API adapters.
 * Each adapter provides database fallback when real APIs are not available.
 * 
 * | Layer            | Adapter         | API Target        | Status      |
 * |------------------|-----------------|-------------------|-------------|
 * | Identity         | jan-aadhaar     | Jan Aadhaar       | DB Mock     |
 * | Service Delivery | emitra          | e-Mitra           | DB Mock     |
 * | Grievance        | sampark         | Rajasthan Sampark | DB Mock     |
 * | Voice/Language   | bhashini        | BHASHINI          | Future      |
 * | Documents        | digilocker      | DigiLocker        | Future      |
 */

// Jan Aadhaar - Identity & Profile
export {
    fetchJanAadhaar,
    validateJanAadhaar,
    getFamilyMember,
    checkEligibility,
    type JanAadhaarRecord,
    type JanAadhaarMember,
    type JanAadhaarError
} from "./jan-aadhaar";

// e-Mitra - Service Delivery
export {
    getServiceCatalog,
    getService,
    submitApplication,
    checkStatus,
    type EMitraService,
    type EMitraApplication,
    type EMitraStatus
} from "./emitra";

// Sampark - Grievance & Escalation
export {
    getCategories as getGrievanceCategories,
    submitGrievance,
    checkGrievanceStatus,
    type GrievanceCategory,
    type GrievanceSubmission,
    type GrievanceTicket
} from "./sampark";
