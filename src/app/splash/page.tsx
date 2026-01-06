"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SplashPage() {
    const router = useRouter();
    const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

    useEffect(() => {
        const initializeSession = async () => {
            try {
                // Check if session exists
                const checkRes = await fetch("/api/session/check");
                const { hasSession, language } = await checkRes.json();

                if (hasSession && language) {
                    // Session exists with language - go to home or consent
                    router.replace("/");
                } else if (hasSession && !language) {
                    // Session exists but no language selected
                    router.replace("/language");
                } else {
                    // Create new session
                    const createRes = await fetch("/api/session/create", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            device_id: navigator.userAgent,
                            metadata: {
                                screen: { width: window.screen.width, height: window.screen.height },
                                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                            }
                        })
                    });

                    if (createRes.ok) {
                        setStatus("ready");
                        router.replace("/language");
                    } else {
                        throw new Error("Session creation failed");
                    }
                }
            } catch (error) {
                console.error("Initialization error:", error);
                setStatus("error");
                // Even on error, try to continue
                setTimeout(() => router.replace("/language"), 2000);
            }
        };

        // Minimum splash display time
        const minDisplayTime = new Promise(resolve => setTimeout(resolve, 1500));

        Promise.all([initializeSession(), minDisplayTime]);
    }, [router]);

    return (
        <div className="splash">
            {/* Government Emblem */}
            <div className="splash__emblem" aria-hidden="true">
                🏛️
            </div>

            {/* Government Title */}
            <p className="splash__title">
                राजस्थान सरकार
            </p>
            <p className="splash__title" style={{ opacity: 0.7, marginBottom: "var(--space-md)" }}>
                Government of Rajasthan
            </p>

            {/* App Name */}
            <h1 className="splash__app-name">
                जन सहायक
            </h1>

            {/* Loading Indicator */}
            <div className="flex flex-col items-center gap-md">
                <div className="spinner" aria-label="Loading" />
                <p style={{ fontSize: "0.875rem", opacity: 0.8 }}>
                    {status === "loading" && "कृपया प्रतीक्षा करें..."}
                    {status === "error" && "कनेक्शन त्रुटि, पुनः प्रयास..."}
                    {status === "ready" && "तैयार..."}
                </p>
            </div>

            {/* Footer */}
            <footer style={{
                position: "absolute",
                bottom: "var(--space-xl)",
                fontSize: "0.75rem",
                opacity: 0.7
            }}>
                Citizen Service Portal v2.0
            </footer>
        </div>
    );
}
