"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function LoginDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [step, setStep] = useState<"PHONE" | "OTP">("PHONE");
    const [mobile, setMobile] = useState("");
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    if (!isOpen) return null;

    const handleSendOtp = async () => {
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithOtp({
                phone: "+91" + mobile,
            });
            if (error) throw error;
            setStep("OTP");
        } catch (err: any) {
            setError(err.message || "OTP भेजने में विफल");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        setLoading(true);
        setError(null);
        try {
            const {
                data: { session },
                error,
            } = await supabase.auth.verifyOtp({
                phone: "+91" + mobile,
                token: otp,
                type: "sms",
            });

            if (error) throw error;

            if (session) {
                // Link the anonymous session!
                const linkRes = await fetch("/api/auth/link-session", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${session.access_token}` // Pass token for verification
                    },
                    body: JSON.stringify({}),
                });

                if (!linkRes.ok) {
                    console.error("Session linking failed but login succeeded");
                }

                onClose();
                router.refresh();
            }
        } catch (err: any) {
            setError(err.message || "OTP सत्यापन विफल");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl animate-in fade-in zoom-in duration-200">
                <h2 className="text-xl font-bold mb-4 text-center">
                    {step === "PHONE" ? "Login / Sign Up" : "Enter OTP"}
                </h2>

                {error && <div className="bg-red-50 text-red-600 p-2 text-sm rounded mb-4">{error}</div>}

                {step === "PHONE" ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                            <div className="flex gap-2">
                                <span className="flex items-center justify-center px-3 border rounded-lg bg-gray-50">+91</span>
                                <input
                                    type="tel"
                                    className="flex-1 border rounded-lg px-3 py-2 outline-none focus:ring-2 ring-orange-400"
                                    placeholder="9876543210"
                                    value={mobile}
                                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleSendOtp}
                            disabled={loading || mobile.length !== 10}
                            className="w-full bg-orange-600 text-white py-3 rounded-xl font-medium disabled:opacity-50"
                        >
                            {loading ? "Sending..." : "Send OTP"}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="text-center text-sm text-gray-600 mb-2">
                            Sent to +91 {mobile} <button onClick={() => setStep("PHONE")} className="text-blue-600 underline">Edit</button>
                        </div>
                        <input
                            type="text"
                            className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 ring-orange-400 text-center tracking-widest text-lg"
                            placeholder="XXXXXX"
                            maxLength={6}
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        />
                        <button
                            onClick={handleVerifyOtp}
                            disabled={loading || otp.length !== 6}
                            className="w-full bg-orange-600 text-white py-3 rounded-xl font-medium disabled:opacity-50"
                        >
                            {loading ? "Verifying..." : "Verify & Login"}
                        </button>
                    </div>
                )}

                <button onClick={onClose} className="mt-4 w-full text-gray-500 text-sm py-2">
                    Cancel
                </button>
            </div>
        </div>
    );
}
