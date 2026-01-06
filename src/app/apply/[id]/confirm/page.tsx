"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

// Icons
const BackIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

const WarningIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

export default function FinalConfirmPage() {
    const router = useRouter();
    const params = useParams();
    const appId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isConsented, setIsConsented] = useState(false);
    const [appData, setAppData] = useState<any>(null);
    const [language, setLanguage] = useState<"hi" | "en">("hi");

    useEffect(() => {
        const langCookie = document.cookie.split("; ").find(c => c.startsWith("gen_language="));
        if (langCookie) setLanguage(langCookie.split("=")[1] as "hi" | "en");

        const fetchData = async () => {
            try {
                const res = await fetch(`/api/applications/${appId}`);
                if (!res.ok) throw new Error("Not found");
                setAppData(await res.json());
            } catch (error) {
                console.error("Fetch error:", error);
            } finally {
                setLoading(false);
            }
        };

        if (appId) fetchData();
    }, [appId]);

    const handleSubmit = async () => {
        if (!isConsented) return;

        setSubmitting(true);

        try {
            // 1. Create consent record
            const consentId = uuidv4();
            await fetch("/api/consent/application", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    application_id: appId,
                    consent_id: consentId,
                    consent_type: "submission",
                    purpose_hi: "आवेदन जमा करने की सहमति",
                    purpose_en: "Application submission consent"
                })
            });

            // 2. Create immutable snapshot
            await fetch(`/api/applications/${appId}/snapshot`, {
                method: "POST"
            });

            // 3. Submit application (update status)
            const res = await fetch(`/api/applications/${appId}/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ consent_id: consentId })
            });

            if (!res.ok) throw new Error("Submission failed");

            const result = await res.json();

            // Speak success
            if (typeof window !== "undefined" && window.speechSynthesis) {
                const utterance = new SpeechSynthesisUtterance(
                    `बधाई हो! आपका आवेदन सफलतापूर्वक जमा हो गया है। आवेदन नंबर है: ${result.submission_id}`
                );
                utterance.lang = "hi-IN";
                speechSynthesis.speak(utterance);
            }

            // Navigate to receipt
            router.push(`/apply/${appId}/receipt`);
        } catch (error) {
            console.error("Submit error:", error);
            alert("जमा करने में त्रुटि। कृपया पुनः प्रयास करें।");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface">
                <div className="spinner" />
            </div>
        );
    }

    const t = {
        hi: {
            title: "अंतिम पुष्टि",
            subtitle: "Final Confirmation",
            warning: "एक बार जमा करने के बाद बदलाव संभव नहीं है",
            warningDesc: "कृपया सुनिश्चित करें कि सभी जानकारी सही है।",
            consent: "मैं पुष्टि करता/करती हूँ",
            consentDesc: "मैंने सभी जानकारी जांच ली है और यह सही है। मैं इस आवेदन को जमा करने की अनुमति देता/देती हूँ।",
            submit: "आवेदन जमा करें",
            back: "वापस जाएं"
        },
        en: {
            title: "Final Confirmation",
            subtitle: "अंतिम पुष्टि",
            warning: "Changes will not be possible after submission",
            warningDesc: "Please ensure all information is correct.",
            consent: "I confirm",
            consentDesc: "I have reviewed all information and it is correct. I authorize submission of this application.",
            submit: "Submit Application",
            back: "Go Back"
        }
    }[language];

    return (
        <div className="min-h-screen flex flex-col bg-surface-alt">
            {/* Header */}
            <header className="gov-header">
                <div className="flex items-center gap-md">
                    <button onClick={() => router.back()} className="p-sm rounded-md hover:bg-surface-alt">
                        <BackIcon />
                    </button>
                    <div>
                        <h1 className="font-bold text-primary">{t.title}</h1>
                        <p className="text-xs text-secondary">{t.subtitle}</p>
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="flex-1 p-lg flex flex-col items-center justify-center">
                {/* Warning Card */}
                <div className="card text-center max-w-md mx-auto fade-in">
                    <div className="flex justify-center mb-lg">
                        <WarningIcon />
                    </div>

                    <h2 className="text-xl font-bold text-[var(--color-warning)] mb-md">
                        ⚠️ {t.warning}
                    </h2>

                    <p className="text-secondary mb-xl">
                        {t.warningDesc}
                    </p>

                    {/* Service Info */}
                    <div className="p-md bg-surface-alt rounded-lg mb-lg">
                        <p className="text-sm text-muted">सेवा / Service</p>
                        <p className="font-bold text-primary">
                            {language === "hi" ? appData?.service?.name_hi : appData?.service?.name_en}
                        </p>
                    </div>

                    {/* Consent Checkbox */}
                    <label className="consent-checkbox cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isConsented}
                            onChange={(e) => setIsConsented(e.target.checked)}
                        />
                        <div className="text-left">
                            <p className="font-bold text-primary">{t.consent}</p>
                            <p className="text-sm text-secondary mt-xs">{t.consentDesc}</p>
                        </div>
                    </label>
                </div>
            </main>

            {/* Footer */}
            <div className="p-lg border-t border-[var(--color-border)] bg-surface space-y-md">
                <button
                    onClick={handleSubmit}
                    disabled={!isConsented || submitting}
                    className="btn btn--success btn--full btn--large"
                >
                    {submitting ? (
                        <>
                            <div className="spinner" style={{ width: 24, height: 24 }} />
                            <span>जमा हो रहा है...</span>
                        </>
                    ) : (
                        <>
                            <span>✓</span>
                            <span>{t.submit}</span>
                        </>
                    )}
                </button>
                <button
                    onClick={() => router.back()}
                    disabled={submitting}
                    className="btn btn--secondary btn--full"
                >
                    ← {t.back}
                </button>
            </div>
        </div>
    );
}
