"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

interface Application {
    id: string;
    submission_id: string;
    status: string;
    created_at: string;
    updated_at: string;
    service: {
        name_hi: string;
        name_en: string;
        code: string;
    };
}

const statusColors: Record<string, string> = {
    draft: "status-badge--draft",
    submitted: "status-badge--submitted",
    in_process: "status-badge--processing",
    approved: "status-badge--approved",
    rejected: "status-badge--rejected",
};

const statusLabels: Record<string, { hi: string; en: string }> = {
    draft: { hi: "ड्राफ्ट", en: "Draft" },
    submitted: { hi: "जमा", en: "Submitted" },
    in_process: { hi: "प्रक्रियाधीन", en: "Processing" },
    approved: { hi: "स्वीकृत", en: "Approved" },
    rejected: { hi: "अस्वीकृत", en: "Rejected" },
};

export default function MyApplicationsPage() {
    const router = useRouter();
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [language, setLanguage] = useState<"hi" | "en">("hi");

    useEffect(() => {
        // Get language
        const langCookie = document.cookie.split("; ").find(c => c.startsWith("gen_language="));
        if (langCookie) {
            setLanguage(langCookie.split("=")[1] as "hi" | "en");
        }

        // Fetch applications
        const fetchApplications = async () => {
            try {
                const sessionId = document.cookie.split("; ")
                    .find(c => c.startsWith("gen_session_id="))?.split("=")[1];

                if (!sessionId) {
                    setLoading(false);
                    return;
                }

                // Fetch applications with service details
                // Note: In production, this should filter by user_id from session
                const { data, error } = await supabase
                    .from("applications")
                    .select(`
            id,
            submission_id,
            status,
            created_at,
            updated_at,
            services:service_id (
              name_hi,
              name_en,
              code
            )
          `)
                    .order("created_at", { ascending: false })
                    .limit(20);

                if (error) throw error;

                // Transform data
                const transformed = (data || []).map((app: any) => ({
                    ...app,
                    service: app.services
                }));

                setApplications(transformed);
            } catch (err) {
                console.error("Error fetching applications:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchApplications();
    }, []);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    };

    const t = {
        hi: {
            title: "मेरे आवेदन",
            subtitle: "My Applications",
            empty: "कोई आवेदन नहीं मिला",
            emptyDesc: "नई सेवा के लिए होम पेज पर जाएं",
            resume: "जारी रखें",
            viewStatus: "स्थिति देखें",
            newApp: "नया आवेदन",
            back: "वापस"
        },
        en: {
            title: "My Applications",
            subtitle: "मेरे आवेदन",
            empty: "No applications found",
            emptyDesc: "Go to home page for new services",
            resume: "Resume",
            viewStatus: "View Status",
            newApp: "New Application",
            back: "Back"
        }
    }[language];

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
                    <div>
                        <h1 className="font-bold text-primary text-lg">{t.title}</h1>
                        <p className="text-xs text-secondary">{t.subtitle}</p>
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="flex-1 p-lg">
                {loading ? (
                    <div className="flex items-center justify-center py-xl">
                        <div className="spinner" />
                    </div>
                ) : applications.length === 0 ? (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center py-xl text-center">
                        <div className="text-6xl mb-lg">📋</div>
                        <h2 className="text-xl font-bold text-primary mb-sm">{t.empty}</h2>
                        <p className="text-secondary mb-lg">{t.emptyDesc}</p>
                        <Link href="/" className="btn btn--primary">
                            {t.newApp}
                        </Link>
                    </div>
                ) : (
                    /* Applications List */
                    <div className="space-y-md">
                        {applications.map((app) => (
                            <div key={app.id} className="card card--interactive fade-in">
                                <div className="flex justify-between items-start mb-md">
                                    <div>
                                        <h3 className="font-bold text-primary">
                                            {language === "hi" ? app.service?.name_hi : app.service?.name_en}
                                        </h3>
                                        <p className="text-xs text-muted mt-xs">
                                            {app.submission_id || `#${app.id.slice(0, 8)}`}
                                        </p>
                                    </div>
                                    <span className={`status-badge ${statusColors[app.status] || "status-badge--draft"}`}>
                                        {statusLabels[app.status]?.[language] || app.status}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted">
                                        {formatDate(app.created_at)}
                                    </span>

                                    {app.status === "draft" ? (
                                        <Link
                                            href={`/apply/${app.id}`}
                                            className="text-[var(--gov-primary)] font-medium"
                                        >
                                            {t.resume} →
                                        </Link>
                                    ) : (
                                        <Link
                                            href={`/status?id=${app.submission_id || app.id}`}
                                            className="text-[var(--gov-primary)] font-medium"
                                        >
                                            {t.viewStatus} →
                                        </Link>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Footer */}
            <div className="p-lg border-t border-[var(--color-border)] bg-surface">
                <Link href="/" className="btn btn--primary btn--full">
                    <span>🏠</span>
                    <span>होम पर जाएं / Go to Home</span>
                </Link>
            </div>
        </div>
    );
}
