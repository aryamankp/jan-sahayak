"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

interface NotificationItem {
    id: string;
    title?: string | null;
    title_hi?: string | null;
    message?: string | null;
    message_hi?: string | null;
    type?: string | null;
    reference_id?: string | null;
    reference_type?: string | null;
    is_read?: boolean;
    created_at: string | null;
}

const typeIcons: Record<string, string> = {
    application_update: "📋",
    benefit: "💰",
    grievance: "📢",
    scheme: "🏛️",
    system: "🔔",
    sms: "📱",
    push: "🔔"
};

const typeColors: Record<string, string> = {
    application_update: "bg-blue-100 text-blue-700",
    benefit: "bg-green-100 text-green-700",
    grievance: "bg-orange-100 text-orange-700",
    scheme: "bg-purple-100 text-purple-700",
    system: "bg-gray-100 text-gray-700",
    sms: "bg-cyan-100 text-cyan-700",
    push: "bg-indigo-100 text-indigo-700"
};

export default function NotificationsPage() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [language, setLanguage] = useState<"hi" | "en">("hi");

    useEffect(() => {
        const langCookie = document.cookie.split("; ").find(c => c.startsWith("gen_language="));
        if (langCookie) {
            setLanguage(langCookie.split("=")[1] as "hi" | "en");
        }

        const fetchNotifications = async () => {
            const sessionId = document.cookie.split("; ")
                .find(c => c.startsWith("gen_session_id="))?.split("=")[1];

            if (!sessionId) {
                setLoading(false);
                return;
            }

            // Get citizen ID from session
            const { data: sessionData } = await supabase
                .from('citizen_sessions')
                .select('citizen_id')
                .eq('id', sessionId)
                .single();

            if (!sessionData?.citizen_id) {
                setLoading(false);
                return;
            }

            // Fetch notifications
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('citizen_id', sessionData.citizen_id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                console.error('Error fetching notifications:', error);
            } else {
                setNotifications((data || []) as NotificationItem[]);
            }
            setLoading(false);
        };

        fetchNotifications();
    }, []);

    const markAsRead = async (id: string) => {
        await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('id', id);

        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        );
    };

    const markAllAsRead = async () => {
        const sessionId = document.cookie.split("; ")
            .find(c => c.startsWith("gen_session_id="))?.split("=")[1];

        if (!sessionId) return;

        const { data: sessionData } = await supabase
            .from('citizen_sessions')
            .select('citizen_id')
            .eq('id', sessionId)
            .single();

        if (!sessionData?.citizen_id) return;

        await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('citizen_id', sessionData.citizen_id)
            .eq('is_read', false);

        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    };

    const getLink = (notification: NotificationItem): string => {
        switch (notification.reference_type) {
            case 'application':
                return `/status?id=${notification.reference_id}`;
            case 'grievance':
                return `/grievance`;
            case 'benefit_disbursement':
                return `/benefits`;
            default:
                return '#';
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return language === 'hi' ? `${diffMins} मिनट पहले` : `${diffMins}m ago`;
        if (diffHours < 24) return language === 'hi' ? `${diffHours} घंटे पहले` : `${diffHours}h ago`;
        if (diffDays < 7) return language === 'hi' ? `${diffDays} दिन पहले` : `${diffDays}d ago`;
        return date.toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN');
    };

    const t = {
        hi: {
            title: "सूचनाएं",
            subtitle: "Notifications",
            empty: "कोई सूचना नहीं",
            markAllRead: "सभी पढ़ी गई",
            back: "वापस"
        },
        en: {
            title: "Notifications",
            subtitle: "सूचनाएं",
            empty: "No notifications",
            markAllRead: "Mark all read",
            back: "Back"
        }
    }[language];

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="min-h-screen flex flex-col bg-surface-alt">
            {/* Header */}
            <header className="gov-header">
                <div className="flex items-center gap-md">
                    <button
                        onClick={() => router.push("/")}
                        className="p-sm rounded-md hover:bg-surface-alt transition-colors"
                        aria-label={t.back}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <div className="flex-1">
                        <h1 className="font-bold text-primary text-lg">{t.title}</h1>
                        <p className="text-xs text-secondary">{t.subtitle}</p>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="text-sm text-[var(--gov-primary)] font-medium"
                        >
                            {t.markAllRead}
                        </button>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-lg">
                {loading ? (
                    <div className="flex items-center justify-center py-xl">
                        <div className="spinner" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-xl text-center">
                        <div className="text-6xl mb-lg">🔔</div>
                        <h2 className="text-xl font-bold text-primary mb-sm">{t.empty}</h2>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {notifications.map((notification) => (
                            <Link
                                key={notification.id}
                                href={getLink(notification)}
                                onClick={() => !notification.is_read && markAsRead(notification.id)}
                                className={`block card p-4 transition-all ${!notification.is_read ? 'border-l-4 border-l-[var(--gov-primary)] bg-blue-50/50' : ''}`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${typeColors[notification.type || 'system'] || typeColors.system}`}>
                                        {typeIcons[notification.type || 'system'] || "🔔"}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <h3 className={`font-semibold ${!notification.is_read ? 'text-primary' : 'text-secondary'}`}>
                                                {language === 'hi' ? (notification.title_hi || notification.title) : (notification.title || notification.title_hi)}
                                            </h3>
                                            <span className="text-xs text-muted whitespace-nowrap">
                                                {formatDate(notification.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-secondary line-clamp-2 mt-1">
                                            {language === 'hi' ? (notification.message_hi || notification.message) : (notification.message || notification.message_hi)}
                                        </p>
                                    </div>
                                    {!notification.is_read && (
                                        <div className="w-2 h-2 rounded-full bg-[var(--gov-primary)] flex-shrink-0 mt-2" />
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>

            {/* Footer */}
            <div className="p-lg border-t border-[var(--color-border)] bg-surface">
                <Link href="/" className="btn btn--primary btn--full">
                    <span>🏠</span>
                    <span>{language === 'hi' ? 'होम पर जाएं' : 'Go to Home'}</span>
                </Link>
            </div>
        </div>
    );
}
