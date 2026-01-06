"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Session } from "@supabase/supabase-js";

type Step = "PHONE" | "OTP" | "JAN_AADHAAR" | "CONFIRM" | "LOADING";

interface JanAadhaarData {
    jan_aadhaar_id: string;
    head_of_family: string;
    head_of_family_hi: string;
    mobile_number: string;
    address_hi: string;
    district: string;
    category: string;
    members: any[];
}

export default function LoginPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>("PHONE");
    const [mobile, setMobile] = useState("");
    const [otp, setOtp] = useState("");
    const [janAadhaar, setJanAadhaar] = useState("");
    const [janAadhaarData, setJanAadhaarData] = useState<JanAadhaarData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState("");
    const [language, setLanguage] = useState<"hi" | "en">("hi");
    const [session, setSession] = useState<Session | null>(null);

    useEffect(() => {
        const langCookie = document.cookie.split("; ").find(c => c.startsWith("gen_language="));
        if (langCookie) setLanguage(langCookie.split("=")[1] as "hi" | "en");
    }, []);

    // Send OTP
    const handleSendOtp = async () => {
        if (mobile.length !== 10) return;

        setStep("LOADING");
        setLoadingMessage("OTP भेज रहे हैं...");
        setError(null);

        // DEMO LOGIN BYPASS
        if (mobile !== "9234297070") {
            setTimeout(() => {
                setStep("OTP");
            }, 500);
            return;
        }

        try {
            const { error } = await supabase.auth.signInWithOtp({
                phone: "+91" + mobile
            });

            if (error) throw error;

            setTimeout(() => {
                setStep("OTP");
            }, 500);
        } catch (err: any) {
            console.error("OTP Error:", err);
            setError(err.message || "OTP भेजने में विफल। पुनः प्रयास करें।");
            setStep("PHONE");
        }
    };

    // Verify OTP
    const handleVerifyOtp = async () => {
        if (otp.length !== 6) return;

        setStep("LOADING");
        setLoadingMessage("OTP सत्यापित हो रहा है...");
        setError(null);

        try {
            let sessionData = null;

            // DEMO LOGIN BYPASS
            if (mobile !== "9234297070") {
                if (otp === "987654") {
                    // Create fake session for demo
                    const mockSession = {
                        access_token: "demo_token",
                        token_type: "bearer",
                        expires_in: 3600,
                        refresh_token: "mock",
                        user: { id: "demo_" + mobile, aud: "authenticated", app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString(), phone: mobile, role: "authenticated" }
                    };

                    // Set Session State immediately for UI
                    setSession(mockSession as any);

                    // Call API with demo flag
                    const res = await fetch("/api/auth/session", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ phone: mobile, type: 'demo' })
                    });

                    const result = await res.json();
                    if (result.isNewUser) {
                        setStep("JAN_AADHAAR");
                        return;
                    } else if (result.success) {
                        setLoadingMessage("सफलतापूर्वक लॉग इन हो गया...");
                        setTimeout(() => {
                            router.push("/consent-gate");
                        }, 1000);
                        return;
                    } else {
                        throw new Error(result.error || "Login failed");
                    }
                } else {
                    throw new Error("Invalid Demo OTP");
                }
            }

            // REAL AUTH FLOW
            const { data, error } = await supabase.auth.verifyOtp({
                phone: "+91" + mobile,
                token: otp,
                type: 'sms'
            });

            if (error) throw error;
            if (!data.session) throw new Error("No session created");

            setSession(data.session);

            // Sync with Server Session
            const res = await fetch("/api/auth/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ session: data.session, type: 'login' })
            });

            const result = await res.json();

            if (result.isNewUser) {
                // New user - need Jan Aadhaar
                setStep("JAN_AADHAAR");
            } else if (result.success) {
                // Existing user - login complete
                setLoadingMessage("सफलतापूर्वक लॉग इन हो गया...");
                setTimeout(() => {
                    router.push("/consent-gate");
                }, 1000);
            } else {
                throw new Error(result.error || "Login failed");
            }

        } catch (err: any) {
            console.error("Verify Error:", err);
            setError("OTP गलत है या एक्सपायर हो गया है।");
            setStep("OTP");
        }
    };

    // Fetch Jan Aadhaar
    const handleFetchJanAadhaar = async () => {
        if (janAadhaar.length < 5) return;

        setStep("LOADING");
        setLoadingMessage("जन आधार से जुड़ रहे हैं...");
        setError(null);

        try {
            // Simulate API connection delay
            await new Promise(r => setTimeout(r, 1500));

            setLoadingMessage("जानकारी प्राप्त हो रही है...");

            if (!session) throw new Error("Authentication session missing");

            // Use existing Jan Aadhaar API (assuming it works or is mocked correctly elsewhere)
            const res = await fetch(`/api/jan-aadhaar?id=${janAadhaar}`, {
                headers: {
                    "Authorization": `Bearer ${session.access_token}`
                }
            });

            if (!res.ok) {
                throw new Error("Jan Aadhaar not found");
            }

            const data = await res.json();
            setJanAadhaarData(data);
            setStep("CONFIRM");

            // Speak confirmation
            if (typeof window !== "undefined" && window.speechSynthesis) {
                const text = `जन आधार से जानकारी मिली। परिवार का मुखिया: ${data.head_of_family_hi}। क्या यह सही है?`;
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = "hi-IN";
                speechSynthesis.speak(utterance);
            }
        } catch (err) {
            setError("जन आधार नहीं मिला। कृपया सही नंबर दर्ज करें।");
            setStep("JAN_AADHAAR");
        }
    };

    // Confirm and Register
    const handleConfirmAndRegister = async () => {
        if (!janAadhaarData || !session) return;

        setStep("LOADING");
        setLoadingMessage("खाता बनाया जा रहा है...");

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    phone: mobile,
                    jan_aadhaar_id: janAadhaarData.jan_aadhaar_id,
                    name: janAadhaarData.head_of_family,
                    name_hi: janAadhaarData.head_of_family_hi,
                    session: session // Pass session for verification
                })
            });

            if (!res.ok) throw new Error("Registration failed");

            // Success
            setLoadingMessage("स्वागत है! आपका खाता बन गया।");

            setTimeout(() => {
                router.push("/consent-gate");
            }, 1500);
        } catch (err) {
            setError("खाता बनाने में त्रुटि। पुनः प्रयास करें।");
            setStep("CONFIRM");
        }
    };

    const handleGuestMode = async () => {
        setStep("LOADING");
        setLoadingMessage("अतिथि मोड...");

        try {
            await fetch("/api/auth/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: 'guest' })
            });
            router.push("/consent-gate");
        } catch (e) {
            setError("Guest login failed");
            setStep("PHONE");
        }
    };

    const t = {
        hi: {
            title: "लॉग इन करें",
            subtitle: "Login",
            mobileLabel: "मोबाइल नंबर",
            sendOtp: "OTP भेजें",
            enterOtp: "OTP दर्ज करें",
            verify: "सत्यापित करें",
            resendOtp: "OTP पुनः भेजें",
            janAadhaarTitle: "जन आधार नंबर दर्ज करें",
            janAadhaarHint: "परिवार के मुखिया का जन आधार नंबर",
            fetchDetails: "जानकारी प्राप्त करें",
            confirmTitle: "जानकारी की पुष्टि करें",
            familyHead: "परिवार का मुखिया",
            address: "पता",
            district: "जिला",
            category: "श्रेणी",
            confirmProceed: "सही है, आगे बढ़ें",
            wrongDetails: "गलत है, बदलें",
            guest: "अतिथि के रूप में जारी रखें",
            guestNote: "अतिथि मोड में सीमित सेवाएं उपलब्ध हैं",
            connecting: "जन आधार पोर्टल से जुड़ रहे हैं..."
        },
        en: {
            title: "Login",
            subtitle: "लॉग इन करें",
            mobileLabel: "Mobile Number",
            sendOtp: "Send OTP",
            enterOtp: "Enter OTP",
            verify: "Verify",
            resendOtp: "Resend OTP",
            janAadhaarTitle: "Enter Jan Aadhaar Number",
            janAadhaarHint: "Family head's Jan Aadhaar number",
            fetchDetails: "Fetch Details",
            confirmTitle: "Confirm Details",
            familyHead: "Family Head",
            address: "Address",
            district: "District",
            category: "Category",
            confirmProceed: "Correct, Proceed",
            wrongDetails: "Wrong, Change",
            guest: "Continue as Guest",
            guestNote: "Limited services in guest mode",
            connecting: "Connecting to Jan Aadhaar portal..."
        }
    }[language];

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
            <main className="flex-1 flex flex-col items-center justify-center p-xl">
                <div className="w-full max-w-sm">
                    {/* Title */}
                    <div className="text-center mb-xl">
                        <h2 className="text-2xl font-bold text-primary mb-sm">
                            {step === "JAN_AADHAAR" ? t.janAadhaarTitle :
                                step === "CONFIRM" ? t.confirmTitle :
                                    step === "OTP" ? t.enterOtp : t.title}
                        </h2>
                        <p className="text-secondary">
                            {step === "JAN_AADHAAR" ? t.janAadhaarHint :
                                step === "CONFIRM" ? "Confirm Details" :
                                    step === "OTP" ? "Enter OTP" : t.subtitle}
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-md p-md bg-[rgba(220,38,38,0.1)] border border-[var(--color-error)] rounded-md text-error text-sm">
                            {error}
                        </div>
                    )}

                    {/* Phone Input */}
                    {step === "PHONE" && (
                        <div className="space-y-6">
                            <div className="form-group">
                                <label className="form-label">{t.mobileLabel}</label>
                                <div className="flex gap-sm">
                                    <span className="flex items-center justify-center px-4 bg-surface-alt border-2 border-[var(--color-border)] rounded-md font-medium">
                                        +91
                                    </span>
                                    <input
                                        type="tel"
                                        className="form-input flex-1"
                                        placeholder="9876543210"
                                        value={mobile}
                                        onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleSendOtp}
                                disabled={mobile.length !== 10}
                                className="btn btn--primary btn--full btn--large"
                            >
                                {t.sendOtp}
                            </button>
                        </div>
                    )}

                    {/* OTP Input */}
                    {step === "OTP" && (
                        <div className="space-y-6">
                            <div className="text-center text-sm text-secondary mb-md">
                                +91 {mobile} पर OTP भेजा गया
                                <button
                                    onClick={() => setStep("PHONE")}
                                    className="text-[var(--gov-primary)] underline ml-2"
                                >
                                    बदलें
                                </button>
                            </div>

                            <div className="form-group">
                                <input
                                    type="text"
                                    className="form-input text-center text-2xl tracking-widest"
                                    placeholder="● ● ● ● ● ●"
                                    maxLength={6}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                    autoFocus
                                />
                            </div>

                            <button
                                onClick={handleVerifyOtp}
                                disabled={otp.length !== 6}
                                className="btn btn--primary btn--full btn--large"
                            >
                                {t.verify}
                            </button>

                            <button
                                onClick={handleSendOtp}
                                className="btn btn--secondary btn--full"
                            >
                                {t.resendOtp}
                            </button>
                        </div>
                    )}

                    {/* Jan Aadhaar Input */}
                    {step === "JAN_AADHAAR" && (
                        <div className="space-y-6">
                            <div className="p-md bg-[rgba(30,64,175,0.05)] border border-[var(--gov-primary)] rounded-lg text-center mb-lg">
                                <p className="text-sm text-[var(--gov-primary)]">
                                    🆔 नए उपयोगकर्ता के रूप में पहचान सत्यापन आवश्यक है
                                </p>
                            </div>

                            <div className="form-group">
                                <label className="form-label">जन आधार नंबर</label>
                                <input
                                    type="text"
                                    className="form-input text-center text-xl"
                                    placeholder="जैसे: 1093847291"
                                    value={janAadhaar}
                                    onChange={(e) => setJanAadhaar(e.target.value.replace(/\D/g, "").slice(0, 12))}
                                    autoFocus
                                />
                                <p className="text-xs text-muted mt-sm text-center">
                                    Demo: 1093847291, 4401234567, 6623456789
                                </p>
                            </div>

                            <button
                                onClick={handleFetchJanAadhaar}
                                disabled={janAadhaar.length < 5}
                                className="btn btn--primary btn--full btn--large"
                            >
                                🔗 {t.fetchDetails}
                            </button>
                        </div>
                    )}

                    {/* Confirm Details */}
                    {step === "CONFIRM" && janAadhaarData && (
                        <div className="space-y-6">
                            <div className="card card--accent">
                                <div className="text-center mb-md">
                                    <span className="text-4xl">✓</span>
                                    <p className="text-sm text-[var(--color-success)] mt-sm">जन आधार से जानकारी मिली</p>
                                </div>

                                <div className="space-y-md">
                                    <div className="flex justify-between py-sm border-b border-[var(--color-border)]">
                                        <span className="text-muted">{t.familyHead}</span>
                                        <span className="font-medium text-primary">{janAadhaarData.head_of_family_hi}</span>
                                    </div>
                                    <div className="flex justify-between py-sm border-b border-[var(--color-border)]">
                                        <span className="text-muted">जन आधार</span>
                                        <span className="font-medium text-primary">{janAadhaarData.jan_aadhaar_id}</span>
                                    </div>
                                    <div className="flex justify-between py-sm border-b border-[var(--color-border)]">
                                        <span className="text-muted">{t.district}</span>
                                        <span className="font-medium text-primary">{janAadhaarData.district}</span>
                                    </div>
                                    <div className="flex justify-between py-sm">
                                        <span className="text-muted">{t.category}</span>
                                        <span className="font-medium text-primary">{janAadhaarData.category}</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleConfirmAndRegister}
                                className="btn btn--success btn--full btn--large"
                            >
                                ✓ {t.confirmProceed}
                            </button>

                            <button
                                onClick={() => setStep("JAN_AADHAAR")}
                                className="btn btn--secondary btn--full"
                            >
                                ✗ {t.wrongDetails}
                            </button>
                        </div>
                    )}

                    {/* Loading */}
                    {step === "LOADING" && (
                        <div className="flex flex-col items-center gap-md py-xl">
                            <div className="spinner" />
                            <p className="text-secondary text-center">{loadingMessage}</p>
                        </div>
                    )}

                    {/* Divider - only show on phone step */}
                    {step === "PHONE" && (
                        <>
                            <div className="flex items-center gap-md my-xl">
                                <div className="flex-1 h-px bg-[var(--color-border)]" />
                                <span className="text-muted text-sm">या</span>
                                <div className="flex-1 h-px bg-[var(--color-border)]" />
                            </div>

                            {/* Guest Mode */}
                            <button
                                onClick={handleGuestMode}
                                className="btn btn--secondary btn--full"
                            >
                                {t.guest}
                            </button>
                            <p className="text-xs text-muted text-center mt-sm">
                                {t.guestNote}
                            </p>
                        </>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="p-md text-center border-t border-[var(--color-border)] bg-surface-alt">
                <p className="text-xs text-muted">
                    आपकी जानकारी सुरक्षित है। केवल सरकारी सेवाओं के लिए उपयोग होगी।
                </p>
            </footer>
        </div>
    );
}

