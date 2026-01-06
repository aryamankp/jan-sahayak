"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

// Icons
const BackIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

const SearchIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

const SpeakerIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
);

const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const ClockIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const statusConfig: Record<string, { hi: string; en: string; color: string }> = {
    draft: { hi: "ड्राफ्ट", en: "Draft", color: "bg-gray-100 text-gray-600" },
    submitted: { hi: "जमा", en: "Submitted", color: "bg-blue-100 text-blue-800" },
    in_process: { hi: "प्रक्रियाधीन", en: "Processing", color: "bg-yellow-100 text-yellow-800" },
    approved: { hi: "स्वीकृत", en: "Approved", color: "bg-green-100 text-green-800" },
    rejected: { hi: "अस्वीकृत", en: "Rejected", color: "bg-red-100 text-red-800" },
};

function StatusPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const paramId = searchParams.get("id");

    const [searchId, setSearchId] = useState("");
    const [appData, setAppData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [language, setLanguage] = useState<"hi" | "en">("hi");
    const [error, setError] = useState("");

    useEffect(() => {
        const langCookie = document.cookie.split("; ").find(c => c.startsWith("gen_language="));
        if (langCookie) setLanguage(langCookie.split("=")[1] as "hi" | "en");
    }, []);

    const fetchApplication = async (identifier: string, isSubmissionId = false) => {
        setLoading(true);
        setError("");

        try {
            let query = supabase
                .from("applications")
                .select("*, services(name_en, name_hi)");

            if (isSubmissionId) {
                query = query.eq("submission_id", identifier);
            } else {
                query = query.eq("id", identifier);
            }

            const { data, error } = await query.single();

            if (error) throw error;
            setAppData(data);
        } catch (err) {
            console.error("Fetch error:", err);
            setAppData(null);
            setError("Application not found. Please check the ID.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (paramId) {
            fetchApplication(paramId, false);
        }
    }, [paramId]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchId.trim()) {
            fetchApplication(searchId.trim(), true);
        }
    };

    const speakStatus = () => {
        if (!appData || typeof window === "undefined") return;

        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }

        const text = language === 'hi'
            ? `आपके आवेदन की स्थिति: ${appData.services?.name_hi || "सेवा"}। वर्तमान स्थिति: ${statusConfig[appData.status]?.hi || appData.status}।`
            : `Application Status for: ${appData.services?.name_en || "Service"}. Current Status: ${statusConfig[appData.status]?.en || appData.status}.`;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language === "hi" ? "hi-IN" : "en-US";
        utterance.rate = 0.9;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "";
        return new Date(dateStr).toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    const t = {
        hi: { title: "आवेदन की स्थिति", subtitle: "Application Status", help: "हेल्परी: 181", home: "होम पर जाएं", searchPlaceholder: "आवेदन आईडी दर्ज करें (Ex: APP-123)", track: "ट्रैक करें" },
        en: { title: "Application Status", subtitle: "आवेदन की स्थिति", help: "Helpline: 181", home: "Go to Home", searchPlaceholder: "Enter Application ID (Ex: APP-123)", track: "Track" }
    }[language];

    return (
        <div className="min-h-screen flex flex-col bg-surface-alt">
            {/* Header */}
            <header className="gov-header">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-md">
                        <button onClick={() => router.push("/")} className="p-sm rounded-md hover:bg-surface-alt" aria-label="Back">
                            <BackIcon />
                        </button>
                        <div>
                            <h1 className="font-bold text-primary">{t.title}</h1>
                            <p className="text-xs text-secondary">{t.subtitle}</p>
                        </div>
                    </div>
                    {appData && (
                        <button
                            onClick={speakStatus}
                            className={`p-sm rounded-md transition-colors ${isSpeaking ? "bg-[var(--gov-primary)] text-white" : "hover:bg-surface-alt"}`}
                            aria-label="Listen"
                        >
                            <SpeakerIcon />
                        </button>
                    )}
                </div>
            </header>

            {/* Main */}
            <main className="flex-1 p-lg overflow-y-auto max-w-2xl mx-auto w-full">

                {/* Search Box (Always visible if no app loaded or to search another) */}
                <div className="card mb-lg">
                    <form onSubmit={handleSearch} className="flex gap-sm">
                        <input
                            type="text"
                            value={searchId}
                            onChange={(e) => setSearchId(e.target.value)}
                            placeholder={t.searchPlaceholder}
                            className="form-input flex-1"
                        />
                        <button
                            type="submit"
                            disabled={loading || !searchId.trim()}
                            className="btn btn--primary"
                        >
                            {loading ? <div className="spinner w-5 h-5" /> : <span>{t.track}</span>}
                        </button>
                    </form>
                    {error && <p className="text-error mt-sm text-sm">{error}</p>}
                </div>

                {/* Status Card */}
                {appData && (
                    <div className="card mb-lg fade-in border-l-4 border-[var(--gov-primary)]">
                        <div className="flex justify-between items-start mb-md">
                            <div>
                                <h2 className="font-bold text-lg text-primary">
                                    {language === "hi" ? appData.services?.name_hi : appData.services?.name_en}
                                </h2>
                                <p className="text-sm text-muted">Submission ID: {appData.submission_id}</p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${statusConfig[appData.status]?.color || "bg-gray-100 text-gray-800"}`}>
                                {statusConfig[appData.status]?.[language] || appData.status}
                            </span>
                        </div>

                        <div className="space-y-sm text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted">{language === "hi" ? "आवेदक:" : "Applicant:"}</span>
                                <span className="text-primary font-medium">{appData.applicant_name || "—"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted">{language === "hi" ? "जमा तिथि:" : "Submitted On:"}</span>
                                <span className="text-primary">{formatDate(appData.created_at)}</span>
                            </div>
                            {appData.updated_at && (
                                <div className="flex justify-between">
                                    <span className="text-muted">{language === "hi" ? "अंतिम अपडेट:" : "Last Updated:"}</span>
                                    <span className="text-primary">{formatDate(appData.updated_at)}</span>
                                </div>
                            )}
                        </div>

                        {/* Simple Timeline Visual */}
                        <div className="mt-lg pt-lg border-t border-gray-100">
                            <div className="flex items-center justify-between relative">
                                {/* Line */}
                                <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gray-200 -z-10"></div>

                                {/* Step 1: Submitted */}
                                <div className="flex flex-col items-center bg-white px-2">
                                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs">✓</div>
                                    <span className="text-[10px] mt-1 font-medium text-blue-700">Submitted</span>
                                </div>

                                {/* Step 2: Processing (Middle) */}
                                <div className="flex flex-col items-center bg-white px-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${appData.status !== 'draft' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                        {appData.status !== 'draft' ? '✓' : '2'}
                                    </div>
                                    <span className={`text-[10px] mt-1 font-medium ${appData.status !== 'draft' ? 'text-blue-700' : 'text-gray-400'}`}>
                                        {language === "hi" ? "प्रक्रियाधीन" : "Processing"}
                                    </span>
                                </div>

                                {/* Step 3: Result */}
                                <div className="flex flex-col items-center bg-white px-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${['approved', 'rejected'].includes(appData.status) ? (appData.status === 'approved' ? 'bg-green-600' : 'bg-red-600') + ' text-white' : 'bg-gray-200 text-gray-500'}`}>
                                        {['approved', 'rejected'].includes(appData.status) ? (appData.status === 'approved' ? '✓' : '✗') : '3'}
                                    </div>
                                    <span className={`text-[10px] mt-1 font-medium ${['approved', 'rejected'].includes(appData.status) ? (appData.status === 'approved' ? 'text-green-700' : 'text-red-700') : 'text-gray-400'}`}>
                                        {appData.status === 'rejected' ? (language === "hi" ? "अस्वीकृत" : "Rejected") : (language === "hi" ? "स्वीकृत" : "Approved")}
                                    </span>
                                </div>
                            </div>
                        </div>

                    </div>
                )}

                {/* Help */}
                <div className="mt-lg p-md bg-surface rounded-lg text-center">
                    <p className="text-sm text-secondary mb-sm">{language === "hi" ? "कोई समस्या है?" : "Need Help?"}</p>
                    <a href="tel:181" className="btn btn--secondary btn--full">
                        📞 {t.help}
                    </a>
                </div>
            </main>

            {/* Footer */}
            <div className="p-lg border-t border-[var(--color-border)] bg-surface">
                <button onClick={() => router.push("/")} className="btn btn--primary btn--full">
                    🏠 {t.home}
                </button>
            </div>
        </div>
    );
}

export default function StatusPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-surface"><div className="spinner" /></div>}>
            <StatusPageContent />
        </Suspense>
    );
}
