"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Types
type VoiceState = "IDLE" | "RECORDING" | "PROCESSING" | "SPEAKING";

interface TurnResponse {
    transcript: string;
    intent: any;
    responseAudio: string;
    responseText: string;
    uiAction: string;
    newContext: Record<string, any>;
}

// Icons
const MicIcon = ({ size = 48 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
);

const StopIcon = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
);

const BackIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

const SpeakerIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
);

// Waveform Animation Component
const Waveform = ({ active }: { active: boolean }) => (
    <div className="waveform" style={{ opacity: active ? 1 : 0.3 }}>
        {[1, 2, 3, 4, 5].map((i) => (
            <div
                key={i}
                className="waveform__bar"
                style={{
                    animationPlayState: active ? "running" : "paused",
                    background: active ? "var(--voice-recording)" : "var(--gov-primary)"
                }}
            />
        ))}
    </div>
);

// Transcript Entry
const TranscriptEntry = ({ text, isUser }: { text: string; isUser: boolean }) => (
    <div className={`transcript__entry ${isUser ? "transcript__entry--user" : "transcript__entry--system"} fade-in`}>
        <p className="transcript__label">
            {isUser ? "आप (You)" : "जन सहायक (System)"}
        </p>
        <p className="text-hindi">{text}</p>
    </div>
);

// Confirmation Card
const ConfirmationCard = ({ data }: { data: Record<string, any> }) => {
    const visibleData = Object.entries(data).filter(([key]) =>
        !["applicationId", "submissionId", "service_id"].includes(key)
    );

    return (
        <div className="card card--accent fade-in">
            <h3 className="font-bold text-lg mb-md text-primary">
                📋 विवरण की पुष्टि करें
            </h3>
            <div className="space-y-sm">
                {visibleData.map(([key, value]) => (
                    <div key={key} className="flex justify-between py-sm border-b border-[var(--color-border)] last:border-0">
                        <span className="text-secondary capitalize">{key.replace(/_/g, " ")}</span>
                        <span className="font-medium text-primary">{String(value)}</span>
                    </div>
                ))}
            </div>
            <div className="mt-md p-md bg-surface-alt rounded-md text-center text-sm">
                'हाँ' बोलें या बटन दबाएं (Say 'Yes' or press button)
            </div>
        </div>
    );
};

function VoicePageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const preselectedService = searchParams.get("service");

    const [state, setState] = useState<VoiceState>("IDLE");
    const [context, setContext] = useState<Record<string, any>>({});
    const [messages, setMessages] = useState<{ text: string; isUser: boolean }[]>([]);
    const [currentResponse, setCurrentResponse] = useState<TurnResponse | null>(null);
    const [liveTranscript, setLiveTranscript] = useState("");

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
    const recordingStartRef = useRef<number>(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Initialize
    useEffect(() => {
        audioPlayerRef.current = new Audio();
        audioPlayerRef.current.onended = () => {
            setState((prev) => (prev === "SPEAKING" ? "IDLE" : prev));
        };

        // Initial greeting
        const greeting = preselectedService
            ? `नमस्कार! ${preselectedService} सेवा के लिए आप क्या जानना चाहते हैं?`
            : "नमस्कार! जन सहायक पोर्टल में आपका स्वागत है। कृपया अपनी सेवा का नाम बताएं।";

        setMessages([{ text: greeting, isUser: false }]);

        // Auto-speak greeting
        speakText(greeting);
    }, [preselectedService]);

    const speakText = (text: string) => {
        if (!text || typeof window === "undefined") return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "hi-IN";
        utterance.rate = 0.9;
        utterance.onend = () => setState("IDLE");
        utterance.onerror = () => setState("IDLE");
        setState("SPEAKING");
        window.speechSynthesis.speak(utterance);
    };

    const startRecording = async (e?: React.SyntheticEvent) => {
        // Prevent default behavior to avoid ghost clicks on mobile
        if (e) {
            // e.preventDefault(); // removed plain preventDefault to allow focus but added specific handling if needed
        }

        // Validation check for browser environment
        if (typeof window === "undefined") return;

        // Check for Secure Context (Required for getUserMedia)
        if (!window.isSecureContext) {
            alert("सुरक्षा कारणों से, मोबाइल पर माइक्रोफ़ोन के लिए HTTPS आवश्यक है। (Microphone requires HTTPS. Please use localhost or a secure tunnel like ngrok.)");
            return;
        }

        // Check availability of MediaDevices API
        if (!navigator?.mediaDevices?.getUserMedia) {
            alert("आपका ब्राउज़र ऑडियो रिकॉर्डिंग का समर्थन नहीं करता है। (Browser does not support audio recording)");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            recordingStartRef.current = Date.now();

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const duration = Date.now() - recordingStartRef.current;
                if (duration < 1000) {
                    setState("IDLE");
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }
                const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                await processAudio(audioBlob);
                stream.getTracks().forEach((track) => track.stop());
            };

            mediaRecorder.start();
            setState("RECORDING");
            setLiveTranscript("");
        } catch (err) {
            console.error("Mic Error:", err);
            alert("माइक्रोफोन कनेक्शन विफल। कृपया अनुमति जांचें। (Microphone connection failed)");
        }
    };

    const stopRecording = (e?: React.SyntheticEvent) => {
        if (e) {
            // e.preventDefault(); 
        }
        if (mediaRecorderRef.current && state === "RECORDING") {
            mediaRecorderRef.current.stop();
            setState("PROCESSING");
        }
    };

    const getHistory = () => {
        // Get last 6 messages for context
        return JSON.stringify(
            messages.slice(-6).map(m => ({
                role: m.isUser ? "user" : "assistant",
                content: m.text
            }))
        );
    };

    const processAudio = async (audioBlob: Blob) => {
        try {
            const formData = new FormData();
            formData.append("audio", audioBlob);
            formData.append("context", JSON.stringify(context));
            formData.append("history", getHistory());

            const res = await fetch("/api/voice/turn", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("API Failed");

            const data: TurnResponse = await res.json();
            handleTurnResponse(data);
        } catch (err) {
            console.error("Processing Error:", err);
            setMessages((prev) => [...prev, { text: "तकनीकी समस्या। कृपया पुनः प्रयास करें।", isUser: false }]);
            setState("IDLE");
        }
    };

    const handleTurnResponse = (data: TurnResponse) => {
        setMessages((prev) => {
            const newMsgs = [...prev];
            if (data.transcript) newMsgs.push({ text: data.transcript, isUser: true });
            if (data.responseText) newMsgs.push({ text: data.responseText, isUser: false });
            return newMsgs;
        });

        setContext(data.newContext);
        setCurrentResponse(data);

        // Play audio or speak
        if (data.responseAudio && audioPlayerRef.current) {
            audioPlayerRef.current.src = data.responseAudio;
            audioPlayerRef.current.play().catch(() => speakText(data.responseText));
            setState("SPEAKING");
        } else if (data.responseText) {
            speakText(data.responseText);
        }
    };

    const handleManualConfirm = async () => {
        const formData = new FormData();
        formData.append("text", "हाँ");
        formData.append("context", JSON.stringify(context));
        formData.append("history", getHistory());
        setState("PROCESSING");

        try {
            const res = await fetch("/api/voice/turn", { method: "POST", body: formData });
            const data = await res.json();
            handleTurnResponse(data);
        } catch {
            setState("IDLE");
        }
    };

    const handleCancel = async () => {
        const formData = new FormData();
        formData.append("text", "नहीं");
        formData.append("context", JSON.stringify(context));
        formData.append("history", getHistory());
        setState("PROCESSING");

        try {
            const res = await fetch("/api/voice/turn", { method: "POST", body: formData });
            const data = await res.json();
            handleTurnResponse(data);
        } catch {
            setState("IDLE");
        }
    };

    const sendMessage = async (text: string) => {
        const formData = new FormData();
        formData.append("text", text);
        formData.append("context", JSON.stringify(context));
        formData.append("history", getHistory());
        setState("PROCESSING");

        try {
            const res = await fetch("/api/voice/turn", { method: "POST", body: formData });
            const data = await res.json();
            handleTurnResponse(data);
        } catch {
            setState("IDLE");
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-surface">
            {/* Header */}
            <header className="gov-header flex items-center gap-md">
                <button
                    onClick={() => router.push("/")}
                    className="p-sm rounded-md hover:bg-surface-alt"
                    aria-label="Back"
                >
                    <BackIcon />
                </button>
                <div className="flex-1">
                    <h1 className="font-bold text-primary">वॉइस सहायक</h1>
                    <p className="text-xs text-secondary">Voice Assistant</p>
                </div>
                {state === "SPEAKING" && (
                    <div className="flex items-center gap-xs text-[var(--gov-primary)]">
                        <SpeakerIcon />
                        <span className="text-xs">बोल रहा हूँ...</span>
                    </div>
                )}
            </header>

            {/* Transcript Area */}
            <main className="flex-1 overflow-y-auto p-lg">
                <div className="transcript">
                    {messages.map((m, i) => (
                        <TranscriptEntry key={i} text={m.text} isUser={m.isUser} />
                    ))}

                    {/* Live Transcript */}
                    {state === "RECORDING" && liveTranscript && (
                        <div className="transcript__entry transcript__entry--user" style={{ opacity: 0.7 }}>
                            <p className="text-muted text-sm">{liveTranscript}...</p>
                        </div>
                    )}

                    {/* Confirmation Card */}
                    {currentResponse?.uiAction === "SHOW_CONFIRMATION" && (
                        <div className="my-lg">
                            <ConfirmationCard data={context.pending_data || {}} />
                        </div>
                    )}

                    {/* Benefits Card */}
                    {currentResponse?.uiAction === "SHOW_BENEFITS" && (
                        <div className="my-lg card card--accent fade-in">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-2xl">💰</span>
                                <h3 className="font-bold text-lg text-primary">Benefits Check</h3>
                            </div>
                            <p className="text-slate-600 mb-4">{currentResponse.responseText}</p>
                            <button
                                onClick={() => router.push("/benefits")}
                                className="w-full py-2 bg-[var(--gov-primary)] text-white rounded-md text-sm font-medium"
                            >
                                View Detailed Passbook
                            </button>
                        </div>
                    )}

                    {/* Notification Card */}
                    {currentResponse?.uiAction === "SHOW_NOTIFICATIONS" && (
                        <div className="my-lg card card--accent fade-in">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-2xl">🔔</span>
                                <h3 className="font-bold text-lg text-primary">Notifications</h3>
                            </div>
                            <p className="text-slate-600 mb-4">{currentResponse.responseText}</p>
                            <button
                                onClick={() => router.push("/profile")}
                                className="w-full py-2 bg-[var(--gov-primary)] text-white rounded-md text-sm font-medium"
                            >
                                Go to Profile
                            </button>
                        </div>
                    )}

                    {/* Scheme List Card */}
                    {(currentResponse?.uiAction === "DISPLAY_PENSION_SCHEMES" || currentResponse?.uiAction === "DISPLAY_SCHEMES") && (
                        <div className="my-lg card card--accent fade-in">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-2xl">📋</span>
                                <h3 className="font-bold text-lg text-primary">उपलब्ध योजनाएं (Available Schemes)</h3>
                            </div>
                            <ul className="space-y-2 mb-4">
                                {(currentResponse.intent?.pension_schemes || currentResponse.intent?.schemes || []).map((scheme: string, idx: number) => (
                                    <li
                                        key={idx}
                                        className="flex items-center gap-2 p-3 bg-white rounded border border-gray-200 hover:bg-blue-50 cursor-pointer transition-colors shadow-sm"
                                        onClick={() => sendMessage(`Explain ${scheme}`)}
                                    >
                                        <span className="text-primary mt-1">👉</span>
                                        <span className="text-slate-700 font-medium">{scheme}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-md p-md bg-surface-alt rounded-md text-center text-sm text-secondary">
                                आप इनमें से किसी एक का नाम ले सकते हैं।
                            </div>
                        </div>
                    )}

                    {/* Upload Document Card (NEW) */}
                    {currentResponse?.uiAction === "ASK_UPLOAD" && (
                        <div className="my-lg card card--accent fade-in">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-2xl">📤</span>
                                <h3 className="font-bold text-lg text-primary">दस्तावेज़ अपलोड करें (Upload Documents)</h3>
                            </div>
                            <p className="text-slate-600 mb-4">{currentResponse.responseText}</p>

                            <label className="block w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:bg-gray-50 transition-colors">
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files.length > 0) {
                                            // Simulate upload success
                                            const fileName = e.target.files[0].name;
                                            sendMessage(`I have uploaded the document ${fileName}. Please submit my application.`);
                                        }
                                    }}
                                />
                                <span className="text-primary font-medium">📂 यहाँ क्लिक करके फ़ाइल चुनें</span>
                                <p className="text-xs text-secondary mt-1">PDF, JPG, PNG (Max 5MB)</p>
                            </label>

                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={() => sendMessage("मैंने दस्तावेज़ अपलोड कर दिए हैं।")}
                                    className="btn btn--secondary text-sm"
                                >
                                    Skip / Already Uploaded
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Processing Indicator */}
                    {state === "PROCESSING" && (
                        <div className="flex items-center gap-md p-md bg-surface-alt rounded-md fade-in">
                            <div className="spinner" style={{ width: 24, height: 24 }} />
                            <span className="text-secondary">प्रक्रिया जारी है...</span>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </main>

            {/* Controls */}
            <div className="p-lg border-t border-[var(--color-border)] bg-surface-alt">
                {/* Confirmation Actions */}
                {currentResponse?.uiAction === "SHOW_CONFIRMATION" && (
                    <div className="flex gap-md mb-lg">
                        <button onClick={handleCancel} className="btn btn--secondary flex-1">
                            ❌ नहीं (No)
                        </button>
                        <button onClick={handleManualConfirm} className="btn btn--success flex-1">
                            ✓ हाँ (Yes)
                        </button>
                    </div>
                )}

                {/* Waveform */}
                <div className="flex justify-center mb-md">
                    <Waveform active={state === "RECORDING"} />
                </div>

                {/* Mic Button */}
                <div className="flex flex-col items-center gap-md">
                    <button
                        onPointerDown={(e) => startRecording(e)}
                        onPointerUp={(e) => stopRecording(e)}
                        onPointerLeave={(e) => stopRecording(e)}
                        onPointerCancel={(e) => stopRecording(e)}
                        onContextMenu={(e) => e.preventDefault()}
                        disabled={state === "PROCESSING" || state === "SPEAKING"}
                        className={`mic-button ${state === "RECORDING" ? "mic-button--recording" : ""} ${state === "PROCESSING" ? "mic-button--processing" : ""
                            }`}
                        style={{ width: 120, height: 120, touchAction: "none", userSelect: "none", WebkitUserSelect: "none" }}
                    >
                        {state === "RECORDING" ? <StopIcon /> : <MicIcon size={48} />}
                    </button>

                    <p className="text-center text-primary font-bold">
                        {state === "IDLE" && "दबाकर बोलें (Hold to Speak)"}
                        {state === "RECORDING" && "🔴 रिकॉर्डिंग... (Recording)"}
                        {state === "PROCESSING" && "⏳ प्रक्रिया जारी... (Processing)"}
                        {state === "SPEAKING" && "🔊 सुनें... (Listening)"}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function VoicePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-surface">
                <div className="spinner" />
            </div>
        }>
            <VoicePageContent />
        </Suspense>
    );
}
