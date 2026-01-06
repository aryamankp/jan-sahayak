import { supabase } from "@/lib/supabase/client";
import { Database } from "@/types/supabase";

export type BenefitDisbursement = Database['public']['Tables']['benefit_disbursements']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type Document = Database['public']['Tables']['documents']['Row'] & { verified_status?: string };
export type CitizenProfile = Database['public']['Tables']['citizens']['Row'] & {
    family_members?: any[];
    address?: any;
};

export const ProfileService = {
    /**
     * Get full profile for a Jan Aadhaar ID
     */
    async getProfile(janAadhaarId: string) {
        // 1. Fetch Basic Info from Jan Aadhaar Records
        const { data: jaRecord, error: jaError } = await supabase
            .from('jan_aadhaar_records')
            .select('*')
            .eq('jan_aadhaar_id', janAadhaarId)
            .single();

        if (jaError) throw jaError;

        // 2. Fetch Benefits
        const { data: benefits } = await supabase
            .from('benefit_disbursements')
            .select(`
                *,
                scheme:schemes(name_en, name_hi)
            `)
            .eq('jan_aadhaar_id', janAadhaarId)
            .order('disbursement_date', { ascending: false });

        // 3. Fetch Documents (linked via applications)
        const { data: documents } = await supabase
            .from('documents')
            .select('*')
            .in('application_id', (
                await supabase
                    .from('applications')
                    .select('id')
                    .eq('jan_aadhaar_id', janAadhaarId)
            ).data?.map(app => app.id) || []);

        // 4. Fetch Notifications
        const { data: notifications } = await supabase
            .from('notifications')
            .select('*')
            .eq('jan_aadhaar_id', janAadhaarId)
            .order('created_at', { ascending: false })
            .limit(10);

        // 5. Fetch Applications (NEW)
        const { data: applications } = await supabase
            .from('applications')
            .select(`
                id,
                submission_id,
                status,
                created_at,
                updated_at,
                service:service_id (name_hi, name_en)
            `)
            .eq('jan_aadhaar_id', janAadhaarId)
            .order('updated_at', { ascending: false });

        // 6. Fetch Grievances (NEW)
        const { data: grievances } = await supabase
            .from('grievances')
            .select('*')
            .eq('jan_aadhaar_id', janAadhaarId)
            .order('created_at', { ascending: false });

        return {
            personalInfo: {
                ...jaRecord,
                members: Array.isArray(jaRecord.members) ? jaRecord.members : []
            },
            benefits: benefits || [],
            documents: documents || [],
            notifications: notifications || [],
            applications: applications || [],
            grievances: grievances || []
        };
    },

    /**
     * Get Benefits Summary
     */
    async getBenefitsSummary(janAadhaarId: string) {
        const { data, error } = await supabase
            .from('benefit_disbursements')
            .select('amount, status')
            .eq('jan_aadhaar_id', janAadhaarId);

        if (error) return { totalAmount: 0, pendingCount: 0 };

        const totalAmount = data.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const pendingCount = data.filter(item => item.status === 'pending').length;

        return { totalAmount, pendingCount };
    }
};
