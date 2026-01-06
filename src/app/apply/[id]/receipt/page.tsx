"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function ReceiptPage() {
    const router = useRouter();
    const params = useParams();
    const appId = params.id as string;

    const [appData, setAppData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [language, setLanguage] = useState<"hi" | "en">("hi");

    useEffect(() => {
        const langCookie = document.cookie.split("; ").find(c => c.startsWith("gen_language="));
        if (langCookie) setLanguage(langCookie.split("=")[1] as "hi" | "en");

        const fetchApp = async () => {
            if (!appId) {
                setLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from("applications")
                    .select(`*, services:service_id(name_hi, name_en)`)
                    .eq("id", appId)
                    .single();

                if (error) throw error;
                setAppData(data);

                // Auto-speak receipt
                setTimeout(() => speakReceipt(data), 500);
            } catch (err) {
                console.error("Fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchApp();
    }, [appId]);

    const speakReceipt = (data: any) => {
        if (!data || typeof window === "undefined") return;

        const text = `बधाई हो! आपका आवेदन सफलतापूर्वक जमा हो गया है। 
    आपका आवेदन नंबर है: ${data.submission_id}। 
    कृपया इस नंबर को सुरक्षित रखें।`;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "hi-IN";
        utterance.rate = 0.9;
        utterance.onend = () => setIsSpeaking(false);

        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const t = {
        hi: {
            title: "आवेदन सफल!",
            subtitle: "Application Successful",
            appNum: "आवेदन नंबर",
            service: "सेवा",
            date: "जमा तिथि",
            expected: "अनुमानित प्रक्रिया समय",
            days: "15-30 दिन",
            save: "इस नंबर को सुरक्षित रखें",
            viewStatus: "स्थिति देखें",
            home: "होम पर जाएं",
            listen: "सुनें"
        },
        en: {
            title: "Application Successful!",
            subtitle: "आवेदन सफल",
            appNum: "Application Number",
            service: "Service",
            date: "Submission Date",
            expected: "Expected Processing Time",
            days: "15-30 days",
            save: "Please save this number",
            viewStatus: "View Status",
            home: "Go to Home",
            listen: "Listen"
        }
    }[language];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface">
                <div className="spinner" />
            </div>
        );
    }

    if (!appData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface">
                <div className="text-center">
                    <p className="text-secondary">आवेदन नहीं मिला</p>
                    <button onClick={() => router.push("/")} className="btn btn--primary mt-lg">
                        होम पर जाएं
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-surface-alt">
            {/* Success Header */}
            <div className="bg-[var(--color-success)] text-white text-center py-xl px-lg">
                <div className="text-6xl mb-md">✓</div>
                <h1 className="text-2xl font-bold mb-sm">{t.title}</h1>
                <p className="opacity-90">{t.subtitle}</p>
            </div>

            {/* Main Content */}
            <main className="flex-1 p-lg -mt-lg">
                {/* Receipt Card */}
                <div className="card fade-in">
                    {/* Application Number - Prominent */}
                    <div className="text-center py-lg border-b border-[var(--color-border)]">
                        <p className="text-sm text-muted uppercase tracking-wide">{t.appNum}</p>
                        <p className="text-3xl font-bold text-[var(--gov-primary)] mt-sm">
                            {appData.submission_id}
                        </p>
                        <p className="text-xs text-muted mt-sm">📝 {t.save}</p>
                    </div>

                    {/* Details */}
                    <div className="py-lg space-y-md">
                        <div className="flex justify-between">
                            <span className="text-secondary">{t.service}:</span>
                            <span className="font-medium text-primary text-right">
                                {language === "hi" ? appData.services?.name_hi : appData.services?.name_en}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-secondary">{t.date}:</span>
                            <span className="text-primary">{formatDate(appData.updated_at || appData.created_at)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-secondary">{t.expected}:</span>
                            <span className="text-primary">{t.days}</span>
                        </div>
                    </div>

                    {/* Listen Button */}
                    <button
                        onClick={() => speakReceipt(appData)}
                        className={`btn btn--secondary btn--full ${isSpeaking ? "opacity-70" : ""}`}
                    >
                        🔊 {isSpeaking ? "बोल रहा हूँ..." : t.listen}
                    </button>
                </div>

                {/* SMS Info */}
                <div className="mt-lg p-md bg-surface rounded-lg text-center">
                    <p className="text-sm text-secondary">
                        📱 SMS द्वारा अपडेट आपके पंजीकृत मोबाइल पर मिलेगा
                    </p>
                </div>
            </main>

            {/* Footer Actions */}
            <div className="p-lg border-t border-[var(--color-border)] bg-surface space-y-md">
                <button
                    onClick={() => router.push(`/status?id=${appData.submission_id}`)}
                    className="btn btn--primary btn--full"
                >
                    🔍 {t.viewStatus}
                </button>
                <button
                    onClick={() => router.push("/")}
                    className="btn btn--secondary btn--full"
                >
                    🏠 {t.home}
                </button>
            </div>
        </div>
    );
}
