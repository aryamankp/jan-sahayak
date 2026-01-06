"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Icons
const BackIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

const VolumeIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
);

const ChevronDownIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

const PhoneIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
);

// Components
const AccordionItem = ({ title, content, isOpen, onClick, onSpeak }: { title: string, content: string, isOpen: boolean, onClick: () => void, onSpeak: (e: any) => void }) => (
    <div className="card mb-sm cursor-pointer hover:border-[var(--gov-primary)] transition-colors p-0 overflow-hidden" onClick={onClick}>
        <div className="flex justify-between items-center p-md bg-surface">
            <h3 className="font-semibold text-primary">{title}</h3>
            <div className={`transform transition-transform ${isOpen ? 'rotate-180' : ''} text-secondary`}>
                <ChevronDownIcon />
            </div>
        </div>
        {isOpen && (
            <div className="p-md pt-0 bg-surface border-t border-border/50 text-secondary text-sm">
                <div className="flex justify-end mb-2">
                    <button
                        onClick={onSpeak}
                        className="p-1.5 text-[var(--gov-primary)] bg-blue-50 rounded-full hover:bg-blue-100"
                    >
                        <VolumeIcon size={16} />
                    </button>
                </div>
                {content}
            </div>
        )}
    </div>
);

export default function HelpPage() {
    const router = useRouter();
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const speak = (text: string, e?: any) => {
        if (e) e.stopPropagation();
        if (typeof window === "undefined") return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "hi-IN";
        window.speechSynthesis.speak(utterance);
    };

    const faqs = [
        {
            title: "आवेदन की स्थिति कैसे जांचें?",
            content: "होम पेज पर 'आवेदन की स्थिति' बोलें या टाइप करें। फिर अपना आवेदन नंबर (Application Number) दर्ज करें या बोलकर बताएं।"
        },
        {
            title: "पेंशन के लिए आवेदन कैसे करें?",
            content: "माइक बटन दबाएं और बोलें 'मुझे पेंशन के लिए आवेदन करना है'। जन सहायक आपसे कुछ सवाल पूछेगा और आपका फॉर्म भर देगा।"
        },
        {
            title: "जन आधार कार्ड कहां मिलेगा?",
            content: "आप अपनी प्रोफाइल पेज पर अपना डिजिटल जन आधार कार्ड देख सकते हैं। भौतिक कार्ड के लिए नजदीकी ई-मित्र केंद्र पर जाएं।"
        },
        {
            title: "राशन नहीं मिला तो क्या करें?",
            content: "'शिकायत दर्ज करें' विकल्प चुनें और अपनी समस्या बताएं। आपकी शिकायत खाद्य विभाग को भेज दी जाएगी।"
        }
    ];

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <header className="gov-header sticky top-0 z-10">
                <div className="flex items-center gap-md">
                    <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-surface-alt transition-colors text-primary">
                        <BackIcon />
                    </button>
                    <div>
                        <h1 className="gov-header__subtitle text-lg">सहायता केंद्र (Help Center)</h1>
                    </div>
                    <button
                        onClick={() => speak("सहायता केंद्र में आपका स्वागत है। आप नीचे दिए गए विषयों में से चुन सकते हैं या सीधे हेल्पलाइन पर कॉल कर सकते हैं।")}
                        className="ml-auto p-2 text-[var(--gov-primary)] bg-white rounded-full shadow-sm"
                    >
                        <VolumeIcon />
                    </button>
                </div>
            </header>

            <main className="max-w-md mx-auto p-md space-y-lg">

                {/* Visual Guide */}
                <section className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-xl p-6 text-white text-center shadow-lg transform active:scale-[0.98] transition-all cursor-pointer" onClick={() => speak("माइक बटन दबाएं, अपनी समस्या बोलें, और समाधान पाएं।")}>
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm animate-pulse-slow">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            <line x1="12" y1="19" x2="12" y2="23" />
                            <line x1="8" y1="23" x2="16" y2="23" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold mb-2">कैसे उपयोग करें?</h2>
                    <p className="text-blue-100 text-sm">माइक बटन दबाएं → बोलें → समाधान पाएं</p>
                </section>

                {/* FAQs */}
                <section>
                    <h2 className="font-bold text-primary mb-md flex items-center gap-2">
                        <span className="text-xl">❓</span> अक्सर पूछे जाने वाले सवाल
                    </h2>
                    <div className="space-y-2">
                        {faqs.map((faq, index) => (
                            <AccordionItem
                                key={index}
                                title={faq.title}
                                content={faq.content}
                                isOpen={openIndex === index}
                                onClick={() => setOpenIndex(index === openIndex ? null : index)}
                                onSpeak={(e) => speak(faq.content, e)}
                            />
                        ))}
                    </div>
                </section>

                {/* Contact Support */}
                <section className="card bg-orange-50 border-orange-100 dark:bg-slate-800 dark:border-slate-700">
                    <div className="flex items-start gap-4 p-md">
                        <div className="p-3 bg-orange-100 text-orange-600 rounded-full">
                            <PhoneIcon />
                        </div>
                        <div>
                            <h3 className="font-bold text-primary mb-1">हेल्पलाइन संपर्क</h3>
                            <p className="text-sm text-secondary mb-3">
                                यदि आपको और सहायता की आवश्यकता है, तो हमारे टोल-फ्री नंबर पर कॉल करें।
                            </p>
                            <a href="tel:181" className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--gov-primary)] text-white rounded-lg text-sm font-bold shadow hover:bg-opacity-90 active:scale-95 transition-all">
                                <PhoneIcon />
                                181 पर कॉल करें
                            </a>
                        </div>
                    </div>
                </section>

            </main>
        </div>
    );
}
