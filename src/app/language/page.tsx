"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Language = "hi" | "en";

export default function LanguagePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<Language | null>(null);

    const handleSelect = async (lang: Language) => {
        setSelected(lang);
        setLoading(true);

        try {
            // Save language preference
            const res = await fetch("/api/session/language", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ language: lang })
            });

            if (!res.ok) throw new Error("Failed to save language");

            // Navigate to login
            router.push("/login");
        } catch (error) {
            console.error("Language selection error:", error);
            // Continue anyway
            router.push("/login");
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

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center p-xl">
                <div className="text-center mb-lg">
                    <h2 className="text-2xl font-bold text-primary mb-sm">
                        भाषा चुनें
                    </h2>
                    <p className="text-secondary">
                        Select Language
                    </p>
                </div>

                {/* Language Buttons */}
                <div className="w-full max-w-sm space-y-4">
                    {/* Hindi - Primary */}
                    <button
                        onClick={() => handleSelect("hi")}
                        disabled={loading}
                        className={`w-full p-lg rounded-lg border-2 transition-all text-left ${selected === "hi"
                                ? "border-[var(--gov-primary)] bg-[rgba(30,64,175,0.05)]"
                                : "border-[var(--color-border)] bg-surface hover:border-[var(--gov-primary)]"
                            }`}
                    >
                        <div className="flex items-center gap-md">
                            <span className="text-3xl">🇮🇳</span>
                            <div>
                                <p className="text-xl font-bold text-primary">हिन्दी</p>
                                <p className="text-sm text-secondary">Hindi (Default)</p>
                            </div>
                            {selected === "hi" && (
                                <span className="ml-auto text-[var(--color-success)] text-2xl">✓</span>
                            )}
                        </div>
                    </button>

                    {/* English */}
                    <button
                        onClick={() => handleSelect("en")}
                        disabled={loading}
                        className={`w-full p-lg rounded-lg border-2 transition-all text-left ${selected === "en"
                                ? "border-[var(--gov-primary)] bg-[rgba(30,64,175,0.05)]"
                                : "border-[var(--color-border)] bg-surface hover:border-[var(--gov-primary)]"
                            }`}
                    >
                        <div className="flex items-center gap-md">
                            <span className="text-3xl">🌐</span>
                            <div>
                                <p className="text-xl font-bold text-primary">English</p>
                                <p className="text-sm text-secondary">अंग्रेज़ी</p>
                            </div>
                            {selected === "en" && (
                                <span className="ml-auto text-[var(--color-success)] text-2xl">✓</span>
                            )}
                        </div>
                    </button>
                </div>

                {/* Loading indicator */}
                {loading && (
                    <div className="mt-lg flex items-center gap-sm text-secondary">
                        <div className="spinner" style={{ width: 24, height: 24 }} />
                        <span>कृपया प्रतीक्षा करें...</span>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="p-md text-center border-t border-[var(--color-border)]">
                <p className="text-sm text-muted">
                    हेल्पलाइन: 181 | Helpline: 181
                </p>
            </footer>
        </div>
    );
}
