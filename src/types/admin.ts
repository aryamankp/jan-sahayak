export type AdminRole = 'super_admin' | 'officer' | 'clerk' | 'view_only';

export interface AdminUser {
    id: string;
    email: string;
    full_name: string;
    role: AdminRole;
    department?: string;
    is_active: boolean;
    created_at: string;
    last_login?: string;
}

export interface AdminSession {
    id: string;
    admin_id: string;
    token: string;
    expires_at: string;
    created_at: string;
}
