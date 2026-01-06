"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Icons
const BackIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

const MicIcon = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="currentColor" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
);

interface Category {
    id: string;
    name_hi: string;
    name_en: string;
    icon?: string;
}

const categoryIcons: Record<string, string> = {
    CAT_WATER: "💧",
    CAT_ELECTRICITY: "⚡",
    CAT_ROADS: "🛣️",
    CAT_PENSION: "👴",
    CAT_HEALTH: "🏥",
    CAT_EDUCATION: "📚",
    CAT_REVENUE: "📋",
    CAT_OTHER: "📝",
};

type Step = "category" | "description" | "confirm" | "success";

export default function GrievancePage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>("category");
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [description, setDescription] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [ticketId, setTicketId] = useState<string | null>(null);
    const [language, setLanguage] = useState<"hi" | "en">("hi");

    useEffect(() => {
        const langCookie = document.cookie.split("; ").find(c => c.startsWith("gen_language="));
        if (langCookie) setLanguage(langCookie.split("=")[1] as "hi" | "en");

        fetch("/api/grievance/categories")
            .then(res => res.json())
            .then(data => {
                const formatted = data.map((c: Category) => ({
                    ...c,
                    icon: categoryIcons[c.id] || "📋"
                }));
                setCategories(formatted);
            })
            .catch(console.error);
    }, []);

    const selectedCategoryData = categories.find(c => c.id === selectedCategory);

    const handleCategorySelect = (id: string) => {
        setSelectedCategory(id);
        setStep("description");

        const cat = categories.find(c => c.id === id);
        if (cat && typeof window !== "undefined" && window.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(
                `आपने ${cat.name_hi} चुना है। कृपया अपनी समस्या का विवरण बताएं।`
            );
            utterance.lang = "hi-IN";
            speechSynthesis.speak(utterance);
        }
    };

    const startVoiceInput = () => {
        if (typeof window === "undefined") return;

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("आपका ब्राउज़र वॉइस इनपुट सपोर्ट नहीं करता");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = "hi-IN";
        recognition.interimResults = false;

        recognition.onstart = () => setIsRecording(true);
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setDescription(prev => prev + (prev ? " " : "") + transcript);
        };
        recognition.onerror = () => setIsRecording(false);
        recognition.onend = () => setIsRecording(false);

        recognition.start();
    };

    const handleSubmit = async () => {
        if (!selectedCategory || !description.trim()) return;

        setIsSubmitting(true);

        try {
            const res = await fetch("/api/grievance/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    category_id: selectedCategory,
                    description,
                    description_hi: description,
                    applicant: { name: "Citizen", mobile: "Unknown", address: "Unknown" }
                })
            });

            if (!res.ok) throw new Error("Failed");
            const result = await res.json();

            setTicketId(result.ticket_id);
            setStep("success");

            if (typeof window !== "undefined" && window.speechSynthesis) {
                const utterance = new SpeechSynthesisUtterance(
                    `आपकी शिकायत दर्ज हो गई है। टिकट नंबर है: ${result.ticket_id}।`
                );
                utterance.lang = "hi-IN";
                speechSynthesis.speak(utterance);
            }
        } catch (error) {
            console.error(error);
            alert("शिकायत दर्ज करने में त्रुटि। कृपया पुनः प्रयास करें।");
        } finally {
            setIsSubmitting(false);
        }
    };

    const t = {
        hi: {
            title: "शिकायत दर्ज करें",
            subtitle: "File Grievance",
            selectCategory: "समस्या की श्रेणी चुनें",
            describe: "अपनी समस्या का विवरण लिखें या बोलें",
            speak: "बोलकर बताएं",
            recording: "सुन रहा हूँ...",
            next: "आगे बढ़ें",
            confirm: "शिकायत की पुष्टि करें",
            submit: "शिकायत दर्ज करें",
            success: "शिकायत दर्ज हो गई!",
            ticketNum: "टिकट नंबर",
            save: "इस नंबर को सुरक्षित रखें",
            resolution: "आपकी शिकायत का समाधान 15 दिनों के भीतर होगा",
            home: "होम पर जाएं",
            back: "वापस"
        },
        en: {
            title: "File Grievance",
            subtitle: "शिकायत दर्ज करें",
            selectCategory: "Select problem category",
            describe: "Describe your problem or speak",
            speak: "Speak",
            recording: "Listening...",
            next: "Proceed",
            confirm: "Confirm Grievance",
            submit: "Submit Grievance",
            success: "Grievance Registered!",
            ticketNum: "Ticket Number",
            save: "Please save this number",
            resolution: "Your grievance will be resolved within 15 days",
            home: "Go to Home",
            back: "Back"
        }
    }[language];

    // Category Selection Step
    if (step === "category") {
        return (
            <div className="min-h-screen flex flex-col bg-surface-alt">
                <header className="gov-header">
                    <div className="flex items-center gap-md">
                        <button onClick={() => router.push("/")} className="p-sm rounded-md hover:bg-surface-alt"><BackIcon /></button>
                        <div>
                            <h1 className="font-bold text-primary">{t.title}</h1>
                            <p className="text-xs text-secondary">{t.subtitle}</p>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-lg overflow-y-auto">
                    <p className="text-secondary mb-lg">{t.selectCategory}</p>
                    <div className="grid grid-cols-2 gap-md">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => handleCategorySelect(cat.id)}
                                className={`card card--interactive text-left ${selectedCategory === cat.id ? "card--selected" : ""
                                    }`}
                            >
                                <span className="text-3xl mb-sm block">{cat.icon}</span>
                                <p className="font-medium text-primary">{cat.name_hi}</p>
                                <p className="text-xs text-muted">{cat.name_en}</p>
                            </button>
                        ))}
                    </div>
                </main>
            </div>
        );
    }

    // Description Step
    if (step === "description") {
        return (
            <div className="min-h-screen flex flex-col bg-surface-alt">
                <header className="gov-header">
                    <div className="flex items-center gap-md">
                        <button onClick={() => setStep("category")} className="p-sm rounded-md hover:bg-surface-alt"><BackIcon /></button>
                        <div>
                            <h1 className="font-bold text-primary">{selectedCategoryData?.name_hi}</h1>
                            <p className="text-xs text-secondary">{selectedCategoryData?.name_en}</p>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-lg">
                    <p className="text-secondary mb-md">{t.describe}</p>

                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="अपनी समस्या यहाँ बताएं..."
                        className="form-input h-40 resize-none mb-md"
                    />

                    <button
                        onClick={startVoiceInput}
                        className={`btn btn--full mb-md ${isRecording ? "btn--danger" : "btn--secondary"}`}
                    >
                        <MicIcon />
                        <span>{isRecording ? t.recording : t.speak}</span>
                    </button>

                    <p className="text-xs text-muted text-right">{description.length} / 500</p>
                </main>

                <div className="p-lg border-t border-[var(--color-border)] bg-surface">
                    <button
                        onClick={() => setStep("confirm")}
                        disabled={!description.trim() || description.length < 10}
                        className="btn btn--primary btn--full"
                    >
                        {t.next}
                    </button>
                </div>
            </div>
        );
    }

    // Confirm Step
    if (step === "confirm") {
        return (
            <div className="min-h-screen flex flex-col bg-surface-alt">
                <header className="gov-header">
                    <div className="flex items-center gap-md">
                        <button onClick={() => setStep("description")} className="p-sm rounded-md hover:bg-surface-alt"><BackIcon /></button>
                        <div>
                            <h1 className="font-bold text-primary">{t.confirm}</h1>
                            <p className="text-xs text-secondary">Confirm Grievance</p>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-lg">
                    <div className="card card--accent">
                        <h3 className="font-bold text-primary mb-lg">📋 शिकायत विवरण</h3>

                        <div className="mb-md">
                            <p className="text-sm text-muted">श्रेणी</p>
                            <p className="font-medium text-primary">
                                {selectedCategoryData?.icon} {selectedCategoryData?.name_hi}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-muted">विवरण</p>
                            <p className="text-primary bg-surface-alt p-md rounded-md mt-sm">
                                {description}
                            </p>
                        </div>
                    </div>
                </main>

                <div className="p-lg border-t border-[var(--color-border)] bg-surface">
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="btn btn--success btn--full"
                    >
                        {isSubmitting ? (
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
                </div>
            </div>
        );
    }

    // Success Step
    return (
        <div className="min-h-screen flex flex-col bg-surface-alt">
            <main className="flex-1 flex items-center justify-center p-lg">
                <div className="text-center fade-in">
                    <div className="w-24 h-24 rounded-full bg-[rgba(21,128,61,0.15)] flex items-center justify-center mx-auto mb-lg text-4xl text-[var(--color-success)]">
                        ✓
                    </div>

                    <h1 className="text-2xl font-bold text-primary mb-sm">{t.success}</h1>
                    <p className="text-secondary mb-lg">Grievance Registered</p>

                    <div className="card mb-lg">
                        <p className="text-sm text-muted">{t.ticketNum}</p>
                        <p className="text-2xl font-bold text-[var(--gov-primary)] mt-sm">{ticketId}</p>
                        <p className="text-xs text-muted mt-sm">📝 {t.save}</p>
                    </div>

                    <p className="text-sm text-secondary mb-lg">{t.resolution}</p>
                </div>
            </main>

            <div className="p-lg border-t border-[var(--color-border)] bg-surface">
                <button onClick={() => router.push("/")} className="btn btn--primary btn--full">
                    🏠 {t.home}
                </button>
            </div>
        </div>
    );
}
