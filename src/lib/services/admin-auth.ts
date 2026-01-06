import { supabase } from '@/lib/supabase/client';
import { AdminUser } from '@/types/admin';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const ADMIN_SESSION_COOKIE = 'jan_admin_session';

export const AdminAuthService = {
    // 1. Hash Password (Simple SHA-256 for demo, use bcrypt in production)
    hashPassword(password: string): string {
        return crypto.createHash('sha256').update(password).digest('hex');
    },

    // 2. Login
    async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
        const passwordHash = this.hashPassword(password);

        // Fetch User
        // Cast everything to any to avoid type errors with missing table definitions
        const { data: userRaw, error } = await supabase
            .from('admin_users' as any)
            .select('*')
            .eq('email', email)
            .eq('password_hash', passwordHash)
            .eq('is_active', true)
            .single();

        const user = userRaw as any;

        if (error || !user) {
            return { success: false, error: 'Invalid credentials or inactive account' };
        }

        // Create Session
        const token = uuidv4();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

        const { error: sessionError } = await supabase
            .from('admin_sessions' as any)
            .insert({
                admin_id: user.id,
                token: token,
                expires_at: expiresAt
            });

        if (sessionError) {
            console.error('Session creation failed:', sessionError);
            return { success: false, error: 'Failed to create session' };
        }

        // Set Cookie
        const cookieStore = await cookies();
        cookieStore.set(ADMIN_SESSION_COOKIE, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge: 60 * 60 * 24 // 24 hours
        });

        // Update last login
        await supabase
            .from('admin_users' as any)
            .update({ last_login: new Date().toISOString() })
            .eq('id', user.id);

        return { success: true };
    },

    // 3. Logout
    async logout() {
        const cookieStore = await cookies();
        const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

        if (token) {
            await supabase.from('admin_sessions' as any).delete().eq('token', token);
        }

        cookieStore.delete(ADMIN_SESSION_COOKIE);
    },

    // 4. Get Current User
    async getCurrentUser(): Promise<AdminUser | null> {
        const cookieStore = await cookies();
        const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

        if (!token) return null;

        // Join session with user
        const { data: sessionRaw, error } = await supabase
            .from('admin_sessions' as any)
            .select('admin_id, admin_users(*)')
            .eq('token', token)
            .gt('expires_at', new Date().toISOString())
            .single();

        const session = sessionRaw as any;

        if (error || !session || !session.admin_users) {
            return null;
        }

        // Return user data (cast as AdminUser)
        return session.admin_users as unknown as AdminUser;
    }
};
