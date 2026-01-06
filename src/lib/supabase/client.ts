import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Type Helpers
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];

// Core Reference Data
export type Scheme = Tables<'schemes'>;
export type Service = Tables<'services'>;

// User & Identity
export type CitizenSession = Tables<'citizen_sessions'>;
export type UserProfile = Tables<'citizens'>; // Mapped from citizens table

// Application Processing
export type Application = Tables<'applications'>;
export type ApplicationStep = Tables<'application_steps'>;
export type Document = Tables<'documents'>;

// Audit & Logs
export type ConversationLog = Tables<'conversation_logs'>;
export type ConsentLog = Tables<'consent_logs'>;

// Legacy / Helper Types (Keep JanAadhaarRecord as it is often composite or external API structure)
export interface JanAadhaarRecord {
    jan_aadhaar_id: string;
    head_of_family: string;
    head_of_family_hi?: string | null;
    address_en?: string | null;
    address_hi?: string | null;
    district?: string | null;
    category?: string | null;
    economic_status?: string | null;
    mobile_number?: string | null;
    members: any[]; // Kept as any[] for now as it's often jsonb
    created_at: string | null;
}
