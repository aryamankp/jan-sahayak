"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Icons
const BackIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

const UserIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

const IdIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <line x1="7" y1="8" x2="17" y2="8" />
        <line x1="7" y1="12" x2="13" y2="12" />
        <line x1="7" y1="16" x2="10" y2="16" />
    </svg>
);

const PhoneIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
);

const HomeIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
);

const FileIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
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
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

// Data row component
const DataRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
    <div className="flex items-start gap-3 py-3 border-b border-[var(--color-surface-light)] last:border-0">
        <div className="text-[var(--color-primary)]">{icon}</div>
        <div className="flex-1">
            <p className="text-sm text-[var(--color-text-secondary)]">{label}</p>
            <p className="font-medium text-[var(--color-text-primary)] text-lg">{value}</p>
        </div>
    </div>
);

function ConfirmPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const serviceCode = searchParams.get("service") || "EM_PENSION_STATUS";

    const [isConsented, setIsConsented] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    const [userData, setUserData] = useState<any>(null);
    const [serviceData, setServiceData] = useState<any>(null);

    // Fetch data
    useEffect(() => {
        const loadData = async () => {
            // 1. Fetch Service Details
            try {
                const sRes = await fetch(`/api/services?code=${serviceCode}`);
                if (sRes.ok) {
                    const sData = await sRes.json();
                    setServiceData(sData);
                }
            } catch (e) {
                console.error("Service fetch error", e);
            }

            // 2. Fetch User Details (Simulating logged in user or passing ID)
            // Ideally ID comes from session or params. Fallback to seeded demo ID.
            const demoJanAadhaar = "JA-RJ-12345678";
            try {
                const uRes = await fetch(`/api/jan-aadhaar?id=${demoJanAadhaar}`);
                if (uRes.ok) {
                    const uData = await uRes.json();

                    // Transform to display format
                    const headMember = uData.members.find((m: any) => m.is_head) || uData.members[0];
                    setUserData({
                        name: headMember?.name_hi || uData.family_head_hi,
                        nameEn: headMember?.name || uData.family_head,
                        janAadhaarId: uData.jan_aadhaar_id,
                        member_id: headMember?.id, // needed for submission
                        mobile: "****" + (headMember?.mobile?.slice(-4) || "7890"), // Mock mobile masking if not in DB
                        address: `${uData.address.line1_hi}, ${uData.address.district_hi}`,
                        serviceName: "लोड हो रहा है...", // Will update when service loads
                        serviceNameEn: "Loading...",
                    });
                }
            } catch (e) {
                console.error("User fetch error", e);
            }
        };
        loadData();
    }, [serviceCode]);

    // Speak confirmation text
    const speakConfirmation = () => {
        if (typeof window === "undefined" || !window.speechSynthesis || !userData || !serviceData) return;

        setIsSpeaking(true);

        const text = `कृपया अपनी जानकारी की पुष्टि करें। नाम: ${userData.name}। जन आधार नंबर: ${userData.janAadhaarId}। सेवा: ${serviceData.name_hi}। क्या यह जानकारी सही है?`;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "hi-IN";
        utterance.rate = 0.9;

        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        speechSynthesis.speak(utterance);
    };

    const stopSpeaking = () => {
        if (typeof window !== "undefined" && window.speechSynthesis) {
            speechSynthesis.cancel();
            setIsSpeaking(false);
        }
    };

    useEffect(() => {
        if (userData && serviceData) {
            // Auto-read confirmation when data is ready
            const timer = setTimeout(() => {
                speakConfirmation();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [userData, serviceData]);

    const handleSubmit = async () => {
        if (!isConsented || !userData || !serviceData) return;

        setIsSubmitting(true);
        stopSpeaking();

        try {
            const payload = {
                service_code: serviceCode,
                applicant: {
                    jan_aadhaar_id: userData.janAadhaarId,
                    member_id: userData.member_id,
                    name: userData.nameEn,
                    mobile: "9876543210" // Mock or real if available
                },
                form_data: {}, // Add form data if collected
                documents: [],
                consent_id: "CONSENT_" + Date.now()
            };

            const res = await fetch('/api/services/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Submission failed");

            const result = await res.json();

            // Speak success message
            const successText = `आपका आवेदन सफलतापूर्वक जमा हो गया है। आपका आवेदन नंबर है: ${result.application_id}`;

            const utterance = new SpeechSynthesisUtterance(successText);
            utterance.lang = "hi-IN";
            utterance.rate = 0.9;
            speechSynthesis.speak(utterance);

            // Navigate to status page
            setTimeout(() => {
                router.push(`/status?id=${result.application_id}`);
            }, 3000);
        } catch (error) {
            console.error("Submission error:", error);
            setIsSubmitting(false);
            alert("आवेदन जमा करने में त्रुटि हुई। कृपया पुनः प्रयास करें।");
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
            {/* Header */}
            <header className="px-4 py-4 border-b border-[var(--color-surface-light)] flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                    aria-label="Go back"
                >
                    <BackIcon />
                </button>
                <div className="flex-1">
                    <h1 className="font-semibold text-[var(--color-text-primary)]">
                        जानकारी की पुष्टि करें
                    </h1>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                        Confirm Information
                    </p>
                </div>
                <button
                    onClick={isSpeaking ? stopSpeaking : speakConfirmation}
                    className={`p-2 rounded-lg transition-colors ${isSpeaking ? "bg-[var(--color-primary)] text-white animate-pulse" : "bg-[var(--color-surface)]"}`}
                    aria-label={isSpeaking ? "Stop speaking" : "Read aloud"}
                >
                    <SpeakerIcon />
                </button>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-y-auto p-4">
                {/* Confirmation Card */}
                <div className="confirmation-card mb-6 fade-in">
                    <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                        📋 आवेदन विवरण
                    </h2>

                    {userData && serviceData ? (
                        <>
                            <DataRow
                                icon={<UserIcon />}
                                label="आवेदक का नाम / Applicant Name"
                                value={userData.name}
                            />

                            <DataRow
                                icon={<IdIcon />}
                                label="जन आधार नंबर / Jan Aadhaar ID"
                                value={userData.janAadhaarId}
                            />

                            <DataRow
                                icon={<PhoneIcon />}
                                label="मोबाइल नंबर / Mobile"
                                value={userData.mobile}
                            />

                            <DataRow
                                icon={<HomeIcon />}
                                label="पता / Address"
                                value={userData.address}
                            />

                            <DataRow
                                icon={<FileIcon />}
                                label="सेवा / Service"
                                value={serviceData.name_hi}
                            />
                        </>
                    ) : (
                        <div className="text-center py-8 text-[var(--color-text-secondary)]">loading...</div>
                    )}
                </div>

                {/* Consent Section */}
                <div className="mb-6">
                    <label className="consent-checkbox">
                        <input
                            type="checkbox"
                            checked={isConsented}
                            onChange={(e) => setIsConsented(e.target.checked)}
                        />
                        <div>
                            <p className="font-medium text-[var(--color-text-primary)]">
                                मैं पुष्टि करता/करती हूँ
                            </p>
                            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                                ऊपर दी गई जानकारी सही है और मैं इस आवेदन को जमा करने की अनुमति देता/देती हूँ।
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)] mt-2">
                                I confirm that the above information is correct and I authorize submission of this application.
                            </p>
                        </div>
                    </label>
                </div>

                {/* Voice Confirmation */}
                <div className="text-center mb-6 p-4 bg-[var(--color-surface)] rounded-xl">
                    <p className="text-[var(--color-text-secondary)] mb-2">
                        🎤 आप बोलकर भी पुष्टि कर सकते हैं
                    </p>
                    <p className="text-lg font-medium text-[var(--color-primary)]">
                        &quot;हाँ, सही है&quot; बोलें
                    </p>
                </div>
            </main>

            {/* Submit Button */}
            <div className="p-4 border-t border-[var(--color-surface-light)] bg-[var(--color-surface)]">
                <button
                    onClick={handleSubmit}
                    disabled={!isConsented || isSubmitting}
                    className="btn-confirm"
                >
                    {isSubmitting ? (
                        <>
                            <div className="spinner" style={{ width: "24px", height: "24px", borderWidth: "3px" }} />
                            <span>जमा हो रहा है...</span>
                        </>
                    ) : (
                        <>
                            <CheckIcon />
                            <span>पुष्टि करें और जमा करें</span>
                        </>
                    )}
                </button>

                <button
                    onClick={() => router.back()}
                    disabled={isSubmitting}
                    className="btn-secondary w-full mt-3"
                >
                    वापस जाएं
                </button>
            </div>
        </div>
    );
}

export default function ConfirmPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
                <div className="spinner" />
            </div>
        }>
            <ConfirmPageContent />
        </Suspense>
    );
}
