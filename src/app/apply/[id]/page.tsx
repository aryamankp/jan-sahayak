"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { UploadService } from "@/lib/services/upload";

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

interface FormStep {
    step_number: number;
    step_identifier: string;
    question_text_hi: string;
    question_text_en: string;
    input_type: "text" | "number" | "select" | "date" | "file";
    options?: { value: string; label_hi: string; label_en: string }[];
    required: boolean;
    user_response?: string;
}
const SERVICE_FORM_CONFIG: Record<string, FormStep[]> = {
    default: [
        {
            step_number: 1,
            step_identifier: "name",
            question_text_hi: "आपका पूरा नाम क्या है?",
            question_text_en: "What is your full name?",
            input_type: "text",
            required: true,
        },
        {
            step_number: 2,
            step_identifier: "jan_aadhaar",
            question_text_hi: "आपका जन आधार नंबर क्या है?",
            question_text_en: "What is your Jan Aadhaar number?",
            input_type: "text",
            required: true,
        },
        {
            step_number: 3,
            step_identifier: "mobile",
            question_text_hi: "आपका मोबाइल नंबर क्या है?",
            question_text_en: "What is your mobile number?",
            input_type: "number",
            required: true,
        },
        {
            step_number: 4,
            step_identifier: "address",
            question_text_hi: "आपका पता क्या है?",
            question_text_en: "What is your address?",
            input_type: "text",
            required: true,
        },
    ],
    PENSION_NEW: [
        {
            step_number: 1,
            step_identifier: "name",
            question_text_hi: "आवेदक का पूरा नाम बताएं",
            question_text_en: "Applicant's full name",
            input_type: "text",
            required: true,
        },
        {
            step_number: 2,
            step_identifier: "jan_aadhaar",
            question_text_hi: "जन आधार नंबर बताएं",
            question_text_en: "Jan Aadhaar Number",
            input_type: "text",
            required: true,
        },
        {
            step_number: 3,
            step_identifier: "age",
            question_text_hi: "आपकी आयु कितनी है?",
            question_text_en: "What is your age?",
            input_type: "number",
            required: true,
        },
        {
            step_number: 4,
            step_identifier: "pension_type",
            question_text_hi: "किस पेंशन के लिए आवेदन करना है?",
            question_text_en: "Which pension are you applying for?",
            input_type: "select",
            required: true,
            options: [
                { value: "OLD_AGE", label_hi: "वृद्धावस्था पेंशन", label_en: "Old Age Pension" },
                { value: "WIDOW", label_hi: "विधवा पेंशन", label_en: "Widow Pension" },
                { value: "DISABLED", label_hi: "विकलांग पेंशन", label_en: "Disability Pension" },
            ],
        },
        {
            step_number: 5,
            step_identifier: "mobile",
            question_text_hi: "मोबाइल नंबर बताएं",
            question_text_en: "Mobile Number",
            input_type: "number",
            required: true,
        },
        {
            step_number: 6,
            step_identifier: "doc_aadhaar",
            question_text_hi: "आधार कार्ड अपलोड करें",
            question_text_en: "Upload Aadhaar Card",
            input_type: "file",
            required: true,
        },
        {
            step_number: 7,
            step_identifier: "doc_income",
            question_text_hi: "आय प्रमाण पत्र अपलोड करें",
            question_text_en: "Upload Income Certificate",
            input_type: "file",
            required: true,
        },
    ],
    CERT_CASTE: [
        {
            step_number: 1,
            step_identifier: "name",
            question_text_hi: "आवेदक का नाम",
            question_text_en: "Applicant Name",
            input_type: "text",
            required: true,
        },
        {
            step_number: 2,
            step_identifier: "jan_aadhaar",
            question_text_hi: "जन आधार नंबर",
            question_text_en: "Jan Aadhaar Number",
            input_type: "text",
            required: true,
        },
        {
            step_number: 3,
            step_identifier: "caste",
            question_text_hi: "आपकी जाति क्या है?",
            question_text_en: "What is your caste?",
            input_type: "text",
            required: true,
        },
        {
            step_number: 4,
            step_identifier: "father_name",
            question_text_hi: "पिता का नाम",
            question_text_en: "Father's Name",
            input_type: "text",
            required: true,
        },
        {
            step_number: 5,
            step_identifier: "mobile",
            question_text_hi: "मोबाइल नंबर",
            question_text_en: "Mobile Number",
            input_type: "number",
            required: true,
        },
        {
            step_number: 6,
            step_identifier: "doc_old_caste",
            question_text_hi: "पुराना जाति प्रमाण (या पिता का) अपलोड करें",
            question_text_en: "Upload Old Caste Proof (or Father's)",
            input_type: "file",
            required: true,
        }
    ],
};

export default function GuidedFormPage() {
    const router = useRouter();
    const params = useParams();
    const appId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false); // Upload loading state
    const [appData, setAppData] = useState<any>(null);
    const [steps, setSteps] = useState<FormStep[]>([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [currentAnswer, setCurrentAnswer] = useState("");
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [isRecording, setIsRecording] = useState(false);
    const [language, setLanguage] = useState<"hi" | "en">("hi");
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

    useEffect(() => {
        const langCookie = document.cookie.split("; ").find(c => c.startsWith("gen_language="));
        if (langCookie) setLanguage(langCookie.split("=")[1] as "hi" | "en");

        const fetchApplication = async () => {
            try {
                // Fetch application details
                const res = await fetch(`/api/applications/${appId}`);
                if (!res.ok) throw new Error("Application not found");
                const data = await res.json();
                setAppData(data);

                // Get form config for this service
                const serviceCode = data.service?.code || "default";
                const formConfig = SERVICE_FORM_CONFIG[serviceCode] || SERVICE_FORM_CONFIG.default;

                // Merge with existing steps if any
                const existingAnswers: Record<string, string> = {};
                if (data.steps) {
                    data.steps.forEach((s: any) => {
                        if (s.user_response) {
                            existingAnswers[s.step_identifier] =
                                typeof s.user_response === "object" ? s.user_response.value : s.user_response;
                        }
                    });
                }
                setAnswers(existingAnswers);

                // Find first unanswered step
                const firstUnanswered = formConfig.findIndex(
                    (step) => !existingAnswers[step.step_identifier]
                );
                setCurrentStep(firstUnanswered >= 0 ? firstUnanswered : 0);
                setSteps(formConfig);
            } catch (error) {
                console.error("Error loading application:", error);
            } finally {
                setLoading(false);
            }
        };

        if (appId) fetchApplication();
    }, [appId]);

    // Auto-speak question
    useEffect(() => {
        if (steps[currentStep] && typeof window !== "undefined" && window.speechSynthesis) {
            const question = language === "hi"
                ? steps[currentStep].question_text_hi
                : steps[currentStep].question_text_en;
            const utterance = new SpeechSynthesisUtterance(question);
            utterance.lang = language === "hi" ? "hi-IN" : "en-IN";
            utterance.rate = 0.9;
            speechSynthesis.speak(utterance);
        }
        // Focus input
        setTimeout(() => inputRef.current?.focus(), 300);
    }, [currentStep, steps, language]);

    const currentStepData = steps[currentStep];

    const handleVoiceInput = () => {
        if (typeof window === "undefined") return;

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("वॉइस इनपुट उपलब्ध नहीं है");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = "hi-IN";
        recognition.interimResults = false;

        recognition.onstart = () => setIsRecording(true);
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setCurrentAnswer(transcript);
        };
        recognition.onerror = () => setIsRecording(false);
        recognition.onend = () => setIsRecording(false);

        recognition.start();
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const doc = await UploadService.uploadDocument(file, appId);
            setCurrentAnswer(doc.file_path); // Save public URL as answer
        } catch (error) {
            alert("Upload failed. Please try again.");
            console.error(error);
        } finally {
            setUploading(false);
        }
    };

    const saveStepAndProceed = async () => {
        if (!currentAnswer.trim() && currentStepData?.required) return;

        setSaving(true);

        try {
            // Save to database
            await fetch(`/api/applications/${appId}/steps`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    step_number: currentStepData.step_number,
                    step_identifier: currentStepData.step_identifier,
                    question_text_hi: currentStepData.question_text_hi,
                    question_text_en: currentStepData.question_text_en,
                    user_response: { value: currentAnswer.trim() }
                })
            });

            // Update local state
            setAnswers(prev => ({ ...prev, [currentStepData.step_identifier]: currentAnswer.trim() }));

            // Move to next step or preview
            if (currentStep < steps.length - 1) {
                setCurrentStep(prev => prev + 1);
                setCurrentAnswer("");
            } else {
                // All steps complete - go to preview
                router.push(`/apply/${appId}/preview`);
            }
        } catch (error) {
            console.error("Save error:", error);
        } finally {
            setSaving(false);
        }
    };

    const goBack = () => {
        if (currentStep > 0) {
            const prevStep = steps[currentStep - 1];
            setCurrentStep(prev => prev - 1);
            setCurrentAnswer(answers[prevStep.step_identifier] || "");
        } else {
            router.push("/");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface">
                <div className="text-center">
                    <div className="spinner mx-auto mb-md" />
                    <p className="text-secondary">फॉर्म लोड हो रहा है...</p>
                </div>
            </div>
        );
    }

    if (!appData || !currentStepData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface">
                <div className="text-center">
                    <p className="text-error mb-lg">आवेदन नहीं मिला</p>
                    <button onClick={() => router.push("/")} className="btn btn--primary">
                        होम पर जाएं
                    </button>
                </div>
            </div>
        );
    }

    const progress = ((currentStep + 1) / steps.length) * 100;

    return (
        <div className="min-h-screen flex flex-col bg-surface-alt">
            {/* Header */}
            <header className="gov-header">
                <div className="flex items-center gap-md">
                    <button onClick={goBack} className="p-sm rounded-md hover:bg-surface-alt">
                        <BackIcon />
                    </button>
                    <div className="flex-1">
                        <h1 className="font-bold text-primary text-sm">
                            {language === "hi" ? appData.service?.name_hi : appData.service?.name_en}
                        </h1>
                        <p className="text-xs text-secondary">
                            चरण {currentStep + 1} / {steps.length}
                        </p>
                    </div>
                </div>
            </header>

            {/* Progress Bar */}
            <div className="h-1 bg-[var(--color-border)]">
                <div
                    className="h-full bg-[var(--gov-primary)] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Main */}
            <main className="flex-1 flex flex-col p-lg">
                {/* Question */}
                <div className="card card--accent mb-lg fade-in">
                    <p className="text-xl font-bold text-primary mb-sm">
                        {language === "hi" ? currentStepData.question_text_hi : currentStepData.question_text_en}
                    </p>
                    <p className="text-sm text-muted">
                        {language === "hi" ? currentStepData.question_text_en : currentStepData.question_text_hi}
                    </p>
                </div>

                {/* Input Area */}
                <div className="flex-1 flex flex-col">
                    {currentStepData.input_type === "select" ? (
                        <div className="space-y-md">
                            {currentStepData.options?.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setCurrentAnswer(opt.value)}
                                    className={`w-full p-lg rounded-lg border-2 text-left transition-all ${currentAnswer === opt.value
                                        ? "border-[var(--gov-primary)] bg-[rgba(30,64,175,0.05)]"
                                        : "border-[var(--color-border)] bg-surface"
                                        }`}
                                >
                                    <p className="font-medium text-primary">{opt.label_hi}</p>
                                    <p className="text-sm text-muted">{opt.label_en}</p>
                                </button>
                            ))}
                        </div>
                    ) : currentStepData.input_type === "file" ? (
                        <div className="flex flex-col items-center justify-center p-xl border-2 border-dashed border-gray-300 rounded-lg bg-surface relative">
                            {uploading ? (
                                <div className="text-center">
                                    <div className="spinner mb-sm" />
                                    <p>Uploading...</p>
                                </div>
                            ) : currentAnswer ? (
                                <div className="text-center w-full">
                                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-sm">
                                        ✓
                                    </div>
                                    <p className="text-sm text-green-700 font-medium mb-sm">
                                        File Uploaded Successfully
                                    </p>
                                    <p className="text-xs text-secondary break-all mb-lg">
                                        {currentAnswer}
                                    </p>
                                    <label className="btn btn--secondary btn--sm cursor-pointer">
                                        Change File
                                        <input
                                            type="file"
                                            className="hidden"
                                            onChange={handleFileUpload}
                                            accept="image/*,.pdf"
                                        />
                                    </label>
                                </div>
                            ) : (
                                <>
                                    <p className="mb-sm text-secondary">
                                        {language === "hi" ? "फाइल चुनें (Image/PDF)" : "Choose File (Image/PDF)"}
                                    </p>
                                    <label className="btn btn--secondary cursor-pointer">
                                        Browse
                                        <input
                                            type="file"
                                            className="hidden"
                                            onChange={handleFileUpload}
                                            accept="image/*,.pdf"
                                        />
                                    </label>
                                </>
                            )}
                        </div>
                    ) : (
                        <>
                            {currentStepData.input_type === "number" ? (
                                <input
                                    ref={inputRef as any}
                                    type="tel"
                                    className="form-input text-xl"
                                    placeholder={language === "hi" ? "यहाँ टाइप करें..." : "Type here..."}
                                    value={currentAnswer}
                                    onChange={(e) => setCurrentAnswer(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && saveStepAndProceed()}
                                />
                            ) : (
                                <textarea
                                    ref={inputRef as any}
                                    className="form-input text-lg flex-1 min-h-[120px] resize-none"
                                    placeholder={language === "hi" ? "यहाँ टाइप करें..." : "Type here..."}
                                    value={currentAnswer}
                                    onChange={(e) => setCurrentAnswer(e.target.value)}
                                />
                            )}

                            {/* Voice Input */}
                            <button
                                onClick={handleVoiceInput}
                                className={`mt-md btn btn--full ${isRecording ? "btn--danger" : "btn--secondary"}`}
                            >
                                <MicIcon />
                                <span>{isRecording ? "सुन रहा हूँ..." : "बोलकर बताएं"}</span>
                            </button>
                        </>
                    )}
                </div>

                {/* Previous Answer (if editing) */}
                {answers[currentStepData.step_identifier] && (
                    <div className="mt-md p-md bg-surface rounded-md">
                        <p className="text-xs text-muted">पहले का उत्तर:</p>
                        <p className="text-secondary">{answers[currentStepData.step_identifier]}</p>
                    </div>
                )}
            </main>

            {/* Footer */}
            <div className="p-lg border-t border-[var(--color-border)] bg-surface">
                <button
                    onClick={saveStepAndProceed}
                    disabled={saving || (!currentAnswer.trim() && currentStepData.required) || uploading}
                    className="btn btn--primary btn--full btn--large"
                >
                    {saving ? (
                        <>
                            <div className="spinner" style={{ width: 24, height: 24 }} />
                            <span>सहेज रहा है...</span>
                        </>
                    ) : currentStep === steps.length - 1 ? (
                        <>
                            <span>✓</span>
                            <span>पूर्वावलोकन देखें (Preview)</span>
                        </>
                    ) : (
                        <>
                            <span>आगे बढ़ें (Next)</span>
                            <span>→</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
