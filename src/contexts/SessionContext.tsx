"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface UserProfile {
    jan_aadhaar_id: string;
    name_hi: string;
    head_of_family_hi: string;
    members: any[];
}

interface SessionContextType {
    user: UserProfile | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (phone: string, jan_aadhaar_id: string) => Promise<void>;
    logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    login: async () => { },
    logout: async () => { },
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        try {
            // 1. Check for cookie via API (safest for HTTPOnly)
            const res = await fetch("/api/auth/check-session");
            const data = await res.json();

            if (data.session_id) {
                // 2. Fetch Profile if session exists
                // We could use an API for this to keep implementation details hidden
                // For now, let's assume if session is valid, we fetch basic details
                // Or better, expose an endpoint /api/user/me
                const profileRes = await fetch("/api/user/me");
                if (profileRes.ok) {
                    const profile = await profileRes.json();
                    setUser(profile);
                }
            } else {
                setUser(null);
            }
        } catch (e) {
            console.error("Session check failed", e);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (phone: string, jan_aadhaar_id: string) => {
        // Login logic is handled by /login page, this is just for state update if used
        await checkSession();
    };

    const logout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        setUser(null);
        window.location.href = "/login";
    };

    return (
        <SessionContext.Provider value={{
            user,
            isLoading,
            isAuthenticated: !!user,
            login,
            logout
        }}>
            {children}
        </SessionContext.Provider>
    );
}

export const useSession = () => useContext(SessionContext);
