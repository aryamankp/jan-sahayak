/**
 * Notification Service
 * Handles fetching and managing in-app notifications for citizens
 * Adapted to work with existing database schema
 */

import { supabase } from "@/lib/supabase/client";

// Using flexible type to match existing DB schema
export interface Notification {
    id: string;
    citizen_id?: string | null;
    session_id?: string | null;
    jan_aadhaar_id?: string | null;
    title?: string | null;
    title_hi?: string | null;
    message?: string | null;
    message_hi?: string | null;
    type?: string | null;
    channel?: string;
    reference_id?: string | null;
    reference_type?: string | null;
    is_read?: boolean;
    read_at?: string | null;
    created_at?: string | null;
    // Computed properties for UI compatibility
    title_en?: string;
    body_en?: string | null;
    body_hi?: string | null;
}

export const NotificationService = {
    /**
     * Get notifications for a citizen
     */
    async getNotifications(citizenId: string, limit = 20): Promise<any[]> {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('citizen_id', citizenId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching notifications:', error);
            return [];
        }

        return data || [];
    },

    /**
     * Get notifications by session ID
     */
    async getNotificationsBySession(sessionId: string, limit = 20): Promise<any[]> {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching notifications:', error);
            return [];
        }

        return data || [];
    },

    /**
     * Get unread notification count
     */
    async getUnreadCount(citizenId: string): Promise<number> {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('citizen_id', citizenId)
            .eq('is_read', false);

        if (error) {
            console.error('Error getting unread count:', error);
            return 0;
        }

        return count || 0;
    },

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId: string): Promise<boolean> {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('id', notificationId);

        if (error) {
            console.error('Error marking notification as read:', error);
            return false;
        }

        return true;
    },

    /**
     * Mark all notifications as read for a citizen
     */
    async markAllAsRead(citizenId: string): Promise<boolean> {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('citizen_id', citizenId)
            .eq('is_read', false);

        if (error) {
            console.error('Error marking all as read:', error);
            return false;
        }

        return true;
    }
};
