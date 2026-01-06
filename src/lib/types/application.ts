
export type ApplicationStatus = 'draft' | 'submitted' | 'in_process' | 'approved' | 'rejected' | 'needs_info';

export interface Application {
    id: string;
    submission_id: string | null;
    jan_aadhaar_id: string;
    service_id: string | null;
    status: ApplicationStatus;
    current_step: number;
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface StatusEvent {
    id: string;
    application_id: string;
    previous_status: ApplicationStatus | null;
    new_status: ApplicationStatus;
    triggered_by: string | null;
    details: Record<string, any>;
    created_at: string;
    changed_by?: string;
}

export interface Service {
    id: string;
    name_hi: string;
    name_en?: string;
    code?: string;
}
