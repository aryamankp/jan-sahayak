export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: "14.1"
    }
    public: {
        Tables: {
            application_snapshots: {
                Row: {
                    application_id: string | null
                    created_at: string | null
                    id: string
                    snapshot: Json
                }
                Insert: {
                    application_id?: string | null
                    created_at?: string | null
                    id?: string
                    snapshot: Json
                }
                Update: {
                    application_id?: string | null
                    created_at?: string | null
                    id?: string
                    snapshot?: Json
                }
                Relationships: [
                    {
                        foreignKeyName: "application_snapshots_application_id_fkey"
                        columns: ["application_id"]
                        isOneToOne: false
                        referencedRelation: "applications"
                        referencedColumns: ["id"]
                    },
                ]
            }
            application_steps: {
                Row: {
                    application_id: string | null
                    id: string
                    question_text_en: string | null
                    question_text_hi: string | null
                    step_identifier: string
                    step_number: number
                    updated_at: string | null
                    user_response: Json | null
                }
                Insert: {
                    application_id?: string | null
                    id?: string
                    question_text_en?: string | null
                    question_text_hi?: string | null
                    step_identifier: string
                    step_number: number
                    updated_at?: string | null
                    user_response?: Json | null
                }
                Update: {
                    application_id?: string | null
                    id?: string
                    question_text_en?: string | null
                    question_text_hi?: string | null
                    step_identifier: string
                    step_number: number
                    updated_at?: string | null
                    user_response?: Json | null
                }
                Relationships: [
                    {
                        foreignKeyName: "application_steps_application_id_fkey"
                        columns: ["application_id"]
                        isOneToOne: false
                        referencedRelation: "applications"
                        referencedColumns: ["id"]
                    },
                ]
            }
            applications: {
                Row: {
                    created_at: string | null
                    current_step: number | null
                    id: string
                    jan_aadhaar_id: string | null
                    metadata: Json | null
                    service_id: string | null
                    status: string
                    submission_id: string | null
                    updated_at: string | null
                    user_id: string | null
                }
                Insert: {
                    created_at?: string | null
                    current_step?: number | null
                    id?: string
                    jan_aadhaar_id?: string | null
                    metadata?: Json | null
                    service_id?: string | null
                    status: string
                    submission_id?: string | null
                    updated_at?: string | null
                    user_id?: string | null
                }
                Update: {
                    created_at?: string | null
                    current_step?: number | null
                    id?: string
                    jan_aadhaar_id?: string | null
                    metadata?: Json | null
                    service_id?: string | null
                    status?: string
                    submission_id?: string | null
                    updated_at?: string | null
                    user_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "applications_service_id_fkey"
                        columns: ["service_id"]
                        isOneToOne: false
                        referencedRelation: "services"
                        referencedColumns: ["id"]
                    },
                ]
            }
            audit_logs: {
                Row: {
                    action: string
                    created_at: string | null
                    details: Json | null
                    id: string
                    ip_address: string | null
                    session_id: string | null
                    user_id: string | null
                }
                Insert: {
                    action: string
                    created_at?: string | null
                    details?: Json | null
                    id?: string
                    ip_address?: string | null
                    session_id?: string | null
                    user_id?: string | null
                }
                Update: {
                    action?: string
                    created_at?: string | null
                    details?: Json | null
                    id?: string
                    ip_address?: string | null
                    session_id?: string | null
                    user_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "audit_logs_session_id_fkey"
                        columns: ["session_id"]
                        isOneToOne: false
                        referencedRelation: "citizen_sessions"
                        referencedColumns: ["id"]
                    },
                ]
            }
            benefit_disbursements: {
                Row: {
                    amount: number
                    application_id: string | null
                    bank_account_last4: string | null
                    citizen_id: string
                    created_at: string | null
                    disbursement_date: string | null
                    id: string
                    jan_aadhaar_id: string | null
                    payment_mode: string | null
                    remarks: string | null
                    scheme_id: string | null
                    status: string | null
                    status_hi: string | null
                    transaction_id: string | null
                    updated_at: string | null
                }
                Insert: {
                    amount?: number
                    application_id?: string | null
                    bank_account_last4?: string | null
                    citizen_id: string
                    created_at?: string | null
                    disbursement_date?: string | null
                    id?: string
                    jan_aadhaar_id?: string | null
                    payment_mode?: string | null
                    remarks?: string | null
                    scheme_id?: string | null
                    status?: string | null
                    status_hi?: string | null
                    transaction_id?: string | null
                    updated_at?: string | null
                }
                Update: {
                    amount?: number
                    application_id?: string | null
                    bank_account_last4?: string | null
                    citizen_id?: string
                    created_at?: string | null
                    disbursement_date?: string | null
                    id?: string
                    jan_aadhaar_id?: string | null
                    payment_mode?: string | null
                    remarks?: string | null
                    scheme_id?: string | null
                    status?: string | null
                    status_hi?: string | null
                    transaction_id?: string | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "benefit_disbursements_application_id_fkey"
                        columns: ["application_id"]
                        isOneToOne: false
                        referencedRelation: "applications"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "benefit_disbursements_scheme_id_fkey"
                        columns: ["scheme_id"]
                        isOneToOne: false
                        referencedRelation: "schemes"
                        referencedColumns: ["id"]
                    },
                ]
            }
            citizen_sessions: {
                Row: {
                    citizen_id: string | null
                    created_at: string | null
                    device_id: string | null
                    id: string
                    is_active: boolean | null
                    language: string | null
                    last_activity: string | null
                    metadata: Json | null
                    started_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    citizen_id?: string | null
                    created_at?: string | null
                    device_id?: string | null
                    id?: string
                    is_active?: boolean | null
                    language?: string | null
                    last_activity?: string | null
                    metadata?: Json | null
                    started_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    citizen_id?: string | null
                    created_at?: string | null
                    device_id?: string | null
                    id?: string
                    is_active?: boolean | null
                    language?: string | null
                    last_activity?: string | null
                    metadata?: Json | null
                    started_at?: string | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "citizen_sessions_citizen_id_fkey"
                        columns: ["citizen_id"]
                        isOneToOne: false
                        referencedRelation: "citizens"
                        referencedColumns: ["id"]
                    },
                ]
            }
            citizens: {
                Row: {
                    created_at: string | null
                    id: string
                    is_verified: boolean | null
                    jan_aadhaar_id: string | null
                    last_login: string | null
                    metadata: Json | null
                    name: string | null
                    name_hi: string | null
                    phone_number: string | null
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    is_verified?: boolean | null
                    jan_aadhaar_id?: string | null
                    last_login?: string | null
                    metadata?: Json | null
                    name?: string | null
                    name_hi?: string | null
                    phone_number?: string | null
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    is_verified?: boolean | null
                    jan_aadhaar_id?: string | null
                    last_login?: string | null
                    metadata?: Json | null
                    name?: string | null
                    name_hi?: string | null
                    phone_number?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "citizens_jan_aadhaar_id_fkey"
                        columns: ["jan_aadhaar_id"]
                        isOneToOne: false
                        referencedRelation: "jan_aadhaar_records"
                        referencedColumns: ["jan_aadhaar_id"]
                    },
                ]
            }
            consent_logs: {
                Row: {
                    application_id: string | null
                    audio_reference: string | null
                    citizen_id: string | null
                    confirmed_at: string | null
                    consent_type: string
                    created_at: string | null
                    data_snapshot: Json
                    id: string
                    ip_hash: string | null
                    purpose_en: string | null
                    purpose_hi: string | null
                    session_id: string | null
                    ui_confirmation: boolean | null
                    user_agent: string | null
                    voice_confirmation: boolean | null
                }
                Insert: {
                    application_id?: string | null
                    audio_reference?: string | null
                    citizen_id?: string | null
                    confirmed_at?: string | null
                    consent_type: string
                    created_at?: string | null
                    data_snapshot?: Json
                    id?: string
                    ip_hash?: string | null
                    purpose_en?: string | null
                    purpose_hi?: string | null
                    session_id?: string | null
                    ui_confirmation?: boolean | null
                    user_agent?: string | null
                    voice_confirmation?: boolean | null
                }
                Update: {
                    application_id?: string | null
                    audio_reference?: string | null
                    citizen_id?: string | null
                    confirmed_at?: string | null
                    consent_type?: string
                    created_at?: string | null
                    data_snapshot?: Json
                    id?: string
                    ip_hash?: string | null
                    purpose_en?: string | null
                    purpose_hi?: string | null
                    session_id?: string | null
                    ui_confirmation?: boolean | null
                    user_agent?: string | null
                    voice_confirmation?: boolean | null
                }
                Relationships: [
                    {
                        foreignKeyName: "consent_logs_application_id_fkey"
                        columns: ["application_id"]
                        isOneToOne: false
                        referencedRelation: "applications"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "consent_logs_session_id_fkey"
                        columns: ["session_id"]
                        isOneToOne: false
                        referencedRelation: "citizen_sessions"
                        referencedColumns: ["id"]
                    },
                ]
            }
            conversation_logs: {
                Row: {
                    audio_url: string | null
                    confidence_score: number | null
                    created_at: string | null
                    id: string
                    intent_detected: string | null
                    metadata: Json | null
                    session_id: string | null
                    speaker: string
                    transcription: string | null
                }
                Insert: {
                    audio_url?: string | null
                    confidence_score?: number | null
                    created_at?: string | null
                    id?: string
                    intent_detected?: string | null
                    metadata?: Json | null
                    session_id?: string | null
                    speaker: string
                    transcription?: string | null
                }
                Update: {
                    audio_url?: string | null
                    confidence_score?: number | null
                    created_at?: string | null
                    id?: string
                    intent_detected?: string | null
                    metadata?: Json | null
                    session_id?: string | null
                    speaker?: string
                    transcription?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "conversation_logs_session_id_fkey"
                        columns: ["session_id"]
                        isOneToOne: false
                        referencedRelation: "citizen_sessions"
                        referencedColumns: ["id"]
                    },
                ]
            }
            daily_metrics: {
                Row: {
                    approved_count: number | null
                    avg_processing_time_hours: number | null
                    created_at: string | null
                    date: string
                    id: string
                    pending_count: number | null
                    rejected_count: number | null
                    scheme_id: string | null
                    service_id: string | null
                    total_applications: number | null
                    total_disbursed_amount: number | null
                    updated_at: string | null
                }
                Insert: {
                    approved_count?: number | null
                    avg_processing_time_hours?: number | null
                    created_at?: string | null
                    date?: string
                    id?: string
                    pending_count?: number | null
                    rejected_count?: number | null
                    scheme_id?: string | null
                    service_id?: string | null
                    total_applications?: number | null
                    total_disbursed_amount?: number | null
                    updated_at?: string | null
                }
                Update: {
                    approved_count?: number | null
                    avg_processing_time_hours?: number | null
                    created_at?: string | null
                    date?: string
                    id?: string
                    pending_count?: number | null
                    rejected_count?: number | null
                    scheme_id?: string | null
                    service_id?: string | null
                    total_applications?: number | null
                    total_disbursed_amount?: number | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "daily_metrics_scheme_id_fkey"
                        columns: ["scheme_id"]
                        isOneToOne: false
                        referencedRelation: "schemes"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "daily_metrics_service_id_fkey"
                        columns: ["service_id"]
                        isOneToOne: false
                        referencedRelation: "services"
                        referencedColumns: ["id"]
                    },
                ]
            }
            documents: {
                Row: {
                    application_id: string | null
                    created_at: string | null
                    file_name: string
                    file_path: string
                    file_size: number
                    id: string
                    mime_type: string
                    rejection_reason: string | null
                    rejection_reason_hi: string | null
                    updated_at: string | null
                    user_id: string | null
                    verification_status: string | null
                    verified_at: string | null
                    verified_by: string | null
                }
                Insert: {
                    application_id?: string | null
                    created_at?: string | null
                    file_name: string
                    file_path: string
                    file_size: number
                    id?: string
                    mime_type: string
                    rejection_reason?: string | null
                    rejection_reason_hi?: string | null
                    updated_at?: string | null
                    user_id?: string | null
                    verification_status?: string | null
                    verified_at?: string | null
                    verified_by?: string | null
                }
                Update: {
                    application_id?: string | null
                    created_at?: string | null
                    file_name?: string
                    file_path?: string
                    file_size?: number
                    id?: string
                    mime_type?: string
                    rejection_reason?: string | null
                    rejection_reason_hi?: string | null
                    updated_at?: string | null
                    user_id?: string | null
                    verification_status?: string | null
                    verified_at?: string | null
                    verified_by?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "documents_application_id_fkey"
                        columns: ["application_id"]
                        isOneToOne: false
                        referencedRelation: "applications"
                        referencedColumns: ["id"]
                    },
                ]
            }
            eligibility_rules: {
                Row: {
                    created_at: string | null
                    description_en: string | null
                    description_hi: string | null
                    id: string
                    is_mandatory: boolean | null
                    operator: string
                    priority: number | null
                    rule_type: string
                    scheme_id: string
                    updated_at: string | null
                    value: Json
                }
                Insert: {
                    created_at?: string | null
                    description_en?: string | null
                    description_hi?: string | null
                    id?: string
                    is_mandatory?: boolean | null
                    operator: string
                    priority?: number | null
                    rule_type: string
                    scheme_id: string
                    updated_at?: string | null
                    value: Json
                }
                Update: {
                    created_at?: string | null
                    description_en?: string | null
                    description_hi?: string | null
                    id?: string
                    is_mandatory?: boolean | null
                    operator?: string
                    priority?: number | null
                    rule_type?: string
                    scheme_id?: string
                    updated_at?: string | null
                    value?: Json
                }
                Relationships: [
                    {
                        foreignKeyName: "eligibility_rules_scheme_id_fkey"
                        columns: ["scheme_id"]
                        isOneToOne: false
                        referencedRelation: "schemes"
                        referencedColumns: ["id"]
                    },
                ]
            }
            families: {
                Row: {
                    address: Json
                    category: string | null
                    created_at: string | null
                    family_head: string
                    family_head_hi: string
                    jan_aadhaar_id: string
                    last_updated: string | null
                    panchayat: string | null
                    panchayat_hi: string | null
                    ration_card_type: string | null
                    is_rural: boolean | null
                }
                Insert: {
                    address: Json
                    category?: string | null
                    created_at?: string | null
                    family_head: string
                    family_head_hi: string
                    jan_aadhaar_id: string
                    last_updated?: string | null
                    panchayat?: string | null
                    panchayat_hi?: string | null
                    ration_card_type?: string | null
                    is_rural?: boolean | null
                }
                Update: {
                    address?: Json
                    category?: string | null
                    created_at?: string | null
                    family_head?: string
                    family_head_hi?: string
                    jan_aadhaar_id?: string
                    last_updated?: string | null
                    panchayat?: string | null
                    panchayat_hi?: string | null
                    ration_card_type?: string | null
                    is_rural?: boolean | null
                }
                Relationships: []
            }
            grievance_categories: {
                Row: {
                    created_at: string | null
                    description: string | null
                    id: string
                    name: string
                }
                Insert: {
                    created_at?: string | null
                    description?: string | null
                    id?: string
                    name: string
                }
                Update: {
                    created_at?: string | null
                    description?: string | null
                    id?: string
                    name?: string
                }
                Relationships: []
            }
            grievances: {
                Row: {
                    assigned_department: string | null
                    assigned_department_hi: string | null
                    assigned_to: string | null
                    attachments: Json | null
                    category_hi: string | null
                    category_id: string
                    citizen_id: string | null
                    citizen_mobile: string | null
                    citizen_name: string | null
                    created_at: string | null
                    description: string
                    description_hi: string | null
                    expected_resolution_date: string | null
                    feedback_comments: string | null
                    feedback_rating: number | null
                    id: string
                    location: Json | null
                    resolution: string | null
                    resolution_hi: string | null
                    resolved_at: string | null
                    session_id: string | null
                    status: string | null
                    status_hi: string | null
                    subcategory_id: string | null
                    ticket_id: string
                    timeline: Json | null
                    updated_at: string | null
                }
                Insert: {
                    assigned_department?: string | null
                    assigned_department_hi?: string | null
                    assigned_to?: string | null
                    attachments?: Json | null
                    category_hi?: string | null
                    category_id: string
                    citizen_id?: string | null
                    citizen_mobile?: string | null
                    citizen_name?: string | null
                    created_at?: string | null
                    description: string
                    description_hi?: string | null
                    expected_resolution_date?: string | null
                    feedback_comments?: string | null
                    feedback_rating?: number | null
                    id?: string
                    location?: Json | null
                    resolution?: string | null
                    resolution_hi?: string | null
                    resolved_at?: string | null
                    session_id?: string | null
                    status?: string | null
                    status_hi?: string | null
                    subcategory_id?: string | null
                    ticket_id: string
                    timeline?: Json | null
                    updated_at?: string | null
                }
                Update: {
                    assigned_department?: string | null
                    assigned_department_hi?: string | null
                    assigned_to?: string | null
                    attachments?: Json | null
                    category_hi?: string | null
                    category_id?: string
                    citizen_id?: string | null
                    citizen_mobile?: string | null
                    citizen_name?: string | null
                    created_at?: string | null
                    description?: string
                    description_hi?: string | null
                    expected_resolution_date?: string | null
                    feedback_comments?: string | null
                    feedback_rating?: number | null
                    id?: string
                    location?: Json | null
                    resolution?: string | null
                    resolution_hi?: string | null
                    resolved_at?: string | null
                    session_id?: string | null
                    status?: string | null
                    status_hi?: string | null
                    subcategory_id?: string | null
                    ticket_id?: string
                    timeline?: Json | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "grievances_session_id_fkey"
                        columns: ["session_id"]
                        isOneToOne: false
                        referencedRelation: "citizen_sessions"
                        referencedColumns: ["id"]
                    },
                ]
            }
            jan_aadhaar_records: {
                Row: {
                    address_en: string | null
                    address_hi: string | null
                    category: string | null
                    created_at: string | null
                    district: string | null
                    economic_status: string | null
                    head_of_family: string
                    head_of_family_hi: string | null
                    jan_aadhaar_id: string
                    members: Json
                    mobile_number: string | null
                }
                Insert: {
                    address_en?: string | null
                    address_hi?: string | null
                    category?: string | null
                    created_at?: string | null
                    district?: string | null
                    economic_status?: string | null
                    head_of_family: string
                    head_of_family_hi?: string | null
                    jan_aadhaar_id: string
                    members: Json
                    mobile_number?: string | null
                }
                Update: {
                    address_en?: string | null
                    address_hi?: string | null
                    category?: string | null
                    created_at?: string | null
                    district?: string | null
                    economic_status?: string | null
                    head_of_family?: string
                    head_of_family_hi?: string | null
                    jan_aadhaar_id?: string
                    members?: Json
                    mobile_number?: string | null
                }
                Relationships: []
            }
            members: {
                Row: {
                    aadhaar_linked: boolean | null
                    age: number | null
                    dob: string | null
                    family_id: string | null
                    gender: string | null
                    id: string
                    is_head: boolean | null
                    name: string
                    name_hi: string
                    relation: string
                    relation_hi: string
                }
                Insert: {
                    aadhaar_linked?: boolean | null
                    age?: number | null
                    dob?: string | null
                    family_id?: string | null
                    gender?: string | null
                    id: string
                    is_head?: boolean | null
                    name: string
                    name_hi: string
                    relation: string
                    relation_hi: string
                }
                Update: {
                    aadhaar_linked?: boolean | null
                    age?: number | null
                    dob?: string | null
                    family_id?: string | null
                    gender?: string | null
                    id?: string
                    is_head?: boolean | null
                    name?: string
                    name_hi?: string
                    relation?: string
                    relation_hi?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "members_family_id_fkey"
                        columns: ["family_id"]
                        isOneToOne: false
                        referencedRelation: "families"
                        referencedColumns: ["jan_aadhaar_id"]
                    },
                ]
            }
            notifications: {
                Row: {
                    application_id: string | null
                    channel: string
                    citizen_id: string | null
                    created_at: string | null
                    external_id: string | null
                    id: string
                    jan_aadhaar_id: string | null
                    message: string
                    message_hi: string | null
                    read_at: string | null
                    sent_at: string | null
                    session_id: string | null
                    status: string | null
                    title: string | null
                    title_hi: string | null
                }
                Insert: {
                    application_id?: string | null
                    channel: string
                    citizen_id?: string | null
                    created_at?: string | null
                    external_id?: string | null
                    id?: string
                    jan_aadhaar_id?: string | null
                    message: string
                    message_hi?: string | null
                    read_at?: string | null
                    sent_at?: string | null
                    session_id?: string | null
                    status?: string | null
                    title?: string | null
                    title_hi?: string | null
                }
                Update: {
                    application_id?: string | null
                    channel?: string
                    citizen_id?: string | null
                    created_at?: string | null
                    external_id?: string | null
                    id?: string
                    jan_aadhaar_id?: string | null
                    message?: string
                    message_hi?: string | null
                    read_at?: string | null
                    sent_at?: string | null
                    session_id?: string | null
                    status?: string | null
                    title?: string | null
                    title_hi?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "notifications_application_id_fkey"
                        columns: ["application_id"]
                        isOneToOne: false
                        referencedRelation: "applications"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "notifications_session_id_fkey"
                        columns: ["session_id"]
                        isOneToOne: false
                        referencedRelation: "citizen_sessions"
                        referencedColumns: ["id"]
                    },
                ]
            }
            schemes: {
                Row: {
                    application_url: string | null
                    benefits: Json | null
                    benefits_summary_hi: string | null
                    category: string | null
                    category_hi: string | null
                    code: string
                    created_at: string | null
                    department: string | null
                    department_hi: string | null
                    description_en: string | null
                    description_hi: string | null
                    eligibility_criteria: Json | null
                    gender_specific: string | null
                    id: string
                    income_limit: number | null
                    is_active: boolean | null
                    max_age: number | null
                    min_age: number | null
                    name_en: string
                    name_hi: string
                    required_documents: string[] | null
                    updated_at: string | null
                }
                Insert: {
                    application_url?: string | null
                    benefits?: Json | null
                    benefits_summary_hi?: string | null
                    category?: string | null
                    category_hi?: string | null
                    code: string
                    created_at?: string | null
                    department?: string | null
                    department_hi?: string | null
                    description_en?: string | null
                    description_hi?: string | null
                    eligibility_criteria?: Json | null
                    gender_specific?: string | null
                    id?: string
                    income_limit?: number | null
                    is_active?: boolean | null
                    max_age?: number | null
                    min_age?: number | null
                    name_en: string
                    name_hi: string
                    required_documents?: string[] | null
                    updated_at?: string | null
                }
                Update: {
                    application_url?: string | null
                    benefits?: Json | null
                    benefits_summary_hi?: string | null
                    category?: string | null
                    category_hi?: string | null
                    code?: string
                    created_at?: string | null
                    department?: string | null
                    department_hi?: string | null
                    description_en?: string | null
                    description_hi?: string | null
                    eligibility_criteria?: Json | null
                    gender_specific?: string | null
                    id?: string
                    income_limit?: number | null
                    is_active?: boolean | null
                    max_age?: number | null
                    min_age?: number | null
                    name_en?: string
                    name_hi?: string
                    official_link?: string | null
                    application_process?: string | null
                    documents_required_detailed?: string | null
                    required_documents?: string[] | null
                    updated_at?: string | null
                }
                Relationships: []
            }
            services: {
                Row: {
                    category: string | null
                    category_hi: string | null
                    code: string
                    created_at: string | null
                    department: string | null
                    department_hi: string | null
                    description_en: string | null
                    description_hi: string | null
                    fee: number | null
                    fee_type: string | null
                    icon_url: string | null
                    id: string
                    is_active: boolean | null
                    name_en: string
                    name_hi: string
                    processing_time: string | null
                    processing_time_hi: string | null
                    required_documents: Json | null
                    scheme_id: string | null
                }
                Insert: {
                    category?: string | null
                    category_hi?: string | null
                    code: string
                    created_at?: string | null
                    department?: string | null
                    department_hi?: string | null
                    description_en?: string | null
                    description_hi?: string | null
                    fee?: number | null
                    fee_type?: string | null
                    icon_url?: string | null
                    id?: string
                    is_active?: boolean | null
                    name_en: string
                    name_hi: string
                    processing_time?: string | null
                    processing_time_hi?: string | null
                    required_documents?: Json | null
                    scheme_id?: string | null
                }
                Update: {
                    category?: string | null
                    category_hi?: string | null
                    code?: string
                    created_at?: string | null
                    department?: string | null
                    department_hi?: string | null
                    description_en?: string | null
                    description_hi?: string | null
                    fee?: number | null
                    fee_type?: string | null
                    icon_url?: string | null
                    id?: string
                    is_active?: boolean | null
                    name_en?: string
                    name_hi?: string
                    processing_time?: string | null
                    processing_time_hi?: string | null
                    required_documents?: Json | null
                    scheme_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "services_scheme_id_fkey"
                        columns: ["scheme_id"]
                        isOneToOne: false
                        referencedRelation: "schemes"
                        referencedColumns: ["id"]
                    },
                ]
            }
            status_events: {
                Row: {
                    application_id: string | null
                    changed_by: string | null
                    created_at: string | null
                    details: Json | null
                    id: string
                    new_status: string
                    previous_status: string | null
                    triggered_by: string | null
                }
                Insert: {
                    application_id?: string | null
                    changed_by?: string | null
                    created_at?: string | null
                    details?: Json | null
                    id?: string
                    new_status: string
                    previous_status?: string | null
                    triggered_by?: string | null
                }
                Update: {
                    application_id?: string | null
                    changed_by?: string | null
                    created_at?: string | null
                    details?: Json | null
                    id?: string
                    new_status?: string
                    previous_status?: string | null
                    triggered_by?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "status_events_application_id_fkey"
                        columns: ["application_id"]
                        isOneToOne: false
                        referencedRelation: "applications"
                        referencedColumns: ["id"]
                    },
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            application_status:
            | "draft"
            | "submitted"
            | "in_process"
            | "approved"
            | "rejected"
            | "needs_info"
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

export type Tables<
    PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: "public" },
    TableName extends PublicTableNameOrOptions extends { schema: "public" }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: "public" }
    ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
            Row: infer R
        }
    ? R
    : never
    : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
            Row: infer R
        }
    ? R
    : never
    : never

export type TablesInsert<
    PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: "public" },
    TableName extends PublicTableNameOrOptions extends { schema: "public" }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: "public" }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Insert: infer I
    }
    ? I
    : never
    : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
    }
    ? I
    : never
    : never

export type TablesUpdate<
    PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: "public" },
    TableName extends PublicTableNameOrOptions extends { schema: "public" }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: "public" }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Update: infer U
    }
    ? U
    : never
    : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
    }
    ? U
    : never
    : never

export type Enums<
    PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: "public" },
    EnumName extends PublicEnumNameOrOptions extends { schema: "public" }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: "public" }
    ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never

export const Constants = {
    public: {
        Enums: {
            application_status: [
                "draft",
                "submitted",
                "in_process",
                "approved",
                "rejected",
                "needs_info",
            ],
        },
    },
} as const
