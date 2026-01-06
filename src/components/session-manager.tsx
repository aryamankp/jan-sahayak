"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function SessionManager({ shouldCreate }: { shouldCreate: boolean }) {
    const router = useRouter();
    const [created, setCreated] = useState(false);

    useEffect(() => {
        if (shouldCreate && !created) {
            const createSession = async () => {
                try {
                    // Check if we already have a session in frontend state or storage to avoid double tap
                    // But relying on props is safer.
                    const res = await fetch("/api/session/create", {
                        method: "POST",
                        body: JSON.stringify({
                            device_id: typeof window !== 'undefined' ? navigator.userAgent : 'unknown', // Simple fingerprint for now
                            metadata: {
                                screen: { width: window.screen.width, height: window.screen.height }
                            }
                        })
                    });

                    if (res.ok) {
                        setCreated(true);
                        router.refresh(); // Refresh to ensure cookies are seen by Server Components
                    }
                } catch (e) {
                    console.error("Session creation failed", e);
                }
            };

            createSession();
        }
    }, [shouldCreate, created, router]);

    return null; // Invisible component
}
