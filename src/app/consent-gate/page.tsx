"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ConsentGatePage() {
    const router = useRouter();
    const [isChecked, setIsChecked] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    const consentTextHi = `यह पोर्टल राजस्थान सरकार द्वारा संचालित है। 
  
आपकी जानकारी का उपयोग केवल सरकारी सेवाओं के प्रसंस्करण के लिए किया जाएगा।

आपका डेटा सुरक्षित है और तीसरे पक्ष के साथ साझा नहीं किया जाएगा।`;

    const consentTextEn = `This portal is operated by the Government of Rajasthan.

Your information will be used only for processing government services.

Your data is secure and will not be shared with third parties.`;

    const speakConsent = () => {
        if (typeof window === "undefined" || !window.speechSynthesis) return;

        if (isSpeaking) {
            speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }

        const utterance = new SpeechSynthesisUtterance(consentTextHi);
        utterance.lang = "hi-IN";
        utterance.rate = 0.9;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        setIsSpeaking(true);
        speechSynthesis.speak(utterance);
    };

    const handleProceed = async () => {
        if (!isChecked) return;

        setLoading(true);

        try {
            // Record consent in database
            await fetch("/api/consent/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    consent_type: "session",
                    purpose_hi: "सत्र डेटा उपयोग सहमति",
                    purpose_en: "Session data usage consent"
                })
            });

            // Set consent cookie
            document.cookie = `gen_consent=true; path=/; max-age=${60 * 60 * 24 * 30}`;

            router.push("/");
        } catch (error) {
            console.error("Consent error:", error);
            // Still set cookie and proceed
            document.cookie = `gen_consent=true; path=/; max-age=${60 * 60 * 24 * 30}`;
            router.push("/");
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-surface">
            {/* Header */}
            <header className="gov-header">
                <div className="gov-header__brand">
                    <div className="gov-header__emblem">🏛️</div>
                    <div>
                        <p className="gov-header__title">राजस्थान सरकार</p>
                        <h1 className="gov-header__subtitle">जन सहायक</h1>
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="flex-1 p-lg overflow-y-auto">
                <div className="max-w-lg mx-auto">
                    {/* Title */}
                    <div className="text-center mb-lg">
                        <h2 className="text-xl font-bold text-primary mb-sm">
                            डेटा उपयोग सहमति
                        </h2>
                        <p className="text-secondary text-sm">
                            Data Usage Consent
                        </p>
                    </div>

                    {/* Speak Button */}
                    <button
                        onClick={speakConsent}
                        className={`w-full mb-lg p-md rounded-lg flex items-center justify-center gap-sm transition-all ${isSpeaking
                            ? "bg-[var(--gov-primary)] text-white"
                            : "bg-surface-alt border border-[var(--color-border)]"
                            }`}
                    >
                        <span className="text-xl">{isSpeaking ? "🔊" : "🔈"}</span>
                        <span className="font-medium">
                            {isSpeaking ? "रोकें (Stop)" : "सुनें (Listen)"}
                        </span>
                    </button>

                    {/* Consent Card */}
                    <div className="card card--accent mb-lg">
                        {/* Hindi */}
                        <div className="mb-lg">
                            <h3 className="font-bold text-primary mb-sm">📜 शर्तें एवं नियम</h3>
                            <p className="text-secondary whitespace-pre-line text-sm leading-relaxed">
                                {consentTextHi}
                            </p>
                        </div>

                        {/* Divider */}
                        <hr className="border-[var(--color-border)] my-lg" />

                        {/* English */}
                        <div>
                            <h3 className="font-bold text-primary mb-sm text-sm">Terms & Conditions</h3>
                            <p className="text-muted whitespace-pre-line text-xs leading-relaxed">
                                {consentTextEn}
                            </p>
                        </div>
                    </div>

                    {/* Consent Checkbox */}
                    <label className="consent-checkbox mb-lg cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => setIsChecked(e.target.checked)}
                        />
                        <div>
                            <p className="font-bold text-primary">
                                मैं सहमत हूँ
                            </p>
                            <p className="text-sm text-secondary mt-xs">
                                I agree to the terms and conditions
                            </p>
                        </div>
                    </label>
                </div>
            </main>

            {/* Footer Action */}
            <div className="p-lg border-t border-[var(--color-border)] bg-surface-alt">
                <button
                    onClick={handleProceed}
                    disabled={!isChecked || loading}
                    className="btn btn--success btn--full btn--large"
                >
                    {loading ? (
                        <>
                            <div className="spinner" style={{ width: 24, height: 24 }} />
                            <span>कृपया प्रतीक्षा करें...</span>
                        </>
                    ) : (
                        <>
                            <span>✓</span>
                            <span>आगे बढ़ें (Proceed)</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
