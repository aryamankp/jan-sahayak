"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

// Icons
const BackIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

const SpeakerIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
);

const EditIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
);

export default function PreviewPage() {
    const router = useRouter();
    const params = useParams();
    const appId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [appData, setAppData] = useState<any>(null);
    const [steps, setSteps] = useState<any[]>([]);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [language, setLanguage] = useState<"hi" | "en">("hi");

    useEffect(() => {
        const langCookie = document.cookie.split("; ").find(c => c.startsWith("gen_language="));
        if (langCookie) setLanguage(langCookie.split("=")[1] as "hi" | "en");

        const fetchData = async () => {
            try {
                const res = await fetch(`/api/applications/${appId}`);
                if (!res.ok) throw new Error("Not found");
                const data = await res.json();
                setAppData(data);
                setSteps(data.steps || []);
            } catch (error) {
                console.error("Fetch error:", error);
            } finally {
                setLoading(false);
            }
        };

        if (appId) fetchData();
    }, [appId]);

    const speakSummary = () => {
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }

        const lines = steps.map((s) => {
            const question = s.question_text_hi || s.step_identifier;
            const answer = typeof s.user_response === "object" ? s.user_response.value : s.user_response;
            return `${question}: ${answer}`;
        }).join("। ");

        const text = `आपके आवेदन का सारांश। ${lines}। क्या यह सही है?`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "hi-IN";
        utterance.rate = 0.9;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
    };

    const editStep = (stepNumber: number) => {
        // Navigate back to form at specific step
        router.push(`/apply/${appId}?step=${stepNumber}`);
    };

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
                <p className="text-error">आवेदन नहीं मिला</p>
            </div>
        );
    }

    const t = {
        hi: {
            title: "आवेदन की समीक्षा",
            subtitle: "Review Application",
            service: "सेवा",
            yourDetails: "आपका विवरण",
            edit: "संशोधित करें",
            listen: "सुनें",
            proceed: "आगे बढ़ें और जमा करें",
            back: "वापस",
            warning: "कृपया सभी जानकारी ध्यान से जांचें"
        },
        en: {
            title: "Review Application",
            subtitle: "आवेदन की समीक्षा",
            service: "Service",
            yourDetails: "Your Details",
            edit: "Edit",
            listen: "Listen",
            proceed: "Proceed to Submit",
            back: "Back",
            warning: "Please review all information carefully"
        }
    }[language];

    return (
        <div className="min-h-screen flex flex-col bg-surface-alt">
            {/* Header */}
            <header className="gov-header">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-md">
                        <button onClick={() => router.back()} className="p-sm rounded-md hover:bg-surface-alt">
                            <BackIcon />
                        </button>
                        <div>
                            <h1 className="font-bold text-primary">{t.title}</h1>
                            <p className="text-xs text-secondary">{t.subtitle}</p>
                        </div>
                    </div>
                    <button
                        onClick={speakSummary}
                        className={`p-sm rounded-md transition-colors ${isSpeaking ? "bg-[var(--gov-primary)] text-white" : "hover:bg-surface-alt"}`}
                    >
                        <SpeakerIcon />
                    </button>
                </div>
            </header>

            {/* Main */}
            <main className="flex-1 p-lg overflow-y-auto">
                {/* Warning */}
                <div className="p-md bg-[rgba(202,138,4,0.1)] border border-[var(--color-warning)] rounded-lg mb-lg text-center">
                    <p className="text-sm text-[var(--color-warning)] font-medium">
                        ⚠️ {t.warning}
                    </p>
                </div>

                {/* Service Info */}
                <div className="card mb-lg fade-in">
                    <h3 className="font-bold text-primary mb-md">📋 {t.service}</h3>
                    <p className="text-lg font-medium text-primary">
                        {language === "hi" ? appData.service?.name_hi : appData.service?.name_en}
                    </p>
                    <p className="text-sm text-muted">
                        {language === "hi" ? appData.service?.department_hi : appData.service?.department_en}
                    </p>
                </div>

                {/* Details Summary */}
                <div className="card card--accent fade-in">
                    <div className="flex justify-between items-center mb-md">
                        <h3 className="font-bold text-primary">📝 {t.yourDetails}</h3>
                    </div>

                    <div className="space-y-md">
                        {steps.map((step, idx) => {
                            const answer = typeof step.user_response === "object"
                                ? step.user_response.value
                                : step.user_response;

                            return (
                                <div
                                    key={idx}
                                    className="flex justify-between items-start py-md border-b border-[var(--color-border)] last:border-0"
                                >
                                    <div className="flex-1">
                                        <p className="text-sm text-muted">
                                            {language === "hi" ? step.question_text_hi : step.question_text_en}
                                        </p>
                                        <p className="font-medium text-primary mt-xs">{answer || "—"}</p>
                                    </div>
                                    <button
                                        onClick={() => editStep(step.step_number)}
                                        className="p-sm text-[var(--gov-primary)] hover:bg-surface-alt rounded-md"
                                        title={t.edit}
                                    >
                                        <EditIcon />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <div className="p-lg border-t border-[var(--color-border)] bg-surface space-y-md">
                <button
                    onClick={() => router.push(`/apply/${appId}/confirm`)}
                    className="btn btn--success btn--full btn--large"
                >
                    ✓ {t.proceed}
                </button>
                <button
                    onClick={() => router.back()}
                    className="btn btn--secondary btn--full"
                >
                    ← {t.back}
                </button>
            </div>
        </div>
    );
}
