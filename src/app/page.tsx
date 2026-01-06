"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, Service } from "@/lib/supabase/client";
import { ServiceRegistry } from "@/lib/services/registry";

// Icons
const MicIcon = ({ size = 64 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const VolumeIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
  </svg>
);

const WifiOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
    <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
    <circle cx="12" cy="20" r="1" />
  </svg>
);

const serviceIcons: Record<string, string> = {
  PENSION_STATUS: "👴",
  PENSION_NEW: "📝",
  RATION_STATUS: "🍚",
  RATION_NEW: "📋",
  JOBCARD_NEW: "👷",
  CERT_CASTE: "📜",
  CERT_INCOME: "💰",
  CERT_DOMICILE: "🏠",
  GRIEVANCE: "📢",
  STATUS_CHECK: "🔍",
};

export default function HomePage() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<"hi" | "en">("hi");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchPerformed(true);
    try {
      const response = await ServiceRegistry.searchSchemes(searchQuery);
      if (response.status === "FOUND" && response.details?.schemes) {
        setSearchResults(response.details.schemes);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Search failed", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    // Check online status
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Get language from cookie
    const langCookie = document.cookie.split("; ").find(c => c.startsWith("gen_language="));
    if (langCookie) {
      setLanguage(langCookie.split("=")[1] as "hi" | "en");
    }

    // Fetch services
    const fetchServices = async () => {
      try {
        const { data, error } = await supabase
          .from("services")
          .select("*")
          .eq("is_active", true)
          .limit(6);

        if (error) throw error;
        if (data) setServices(data as Service[]);
      } catch (err) {
        console.error("Error fetching services:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.speechSynthesis.cancel();
    };
  }, []);

  const t = {
    hi: {
      govtTitle: "राजस्थान सरकार",
      portalTitle: "जन सहायक",
      instruction: "किसी भी सेवा के लिए माइक बटन दबाएं और बोलें।",
      micLabel: "सेवा के लिए बोलें",
      servicesTitle: "नागरिक सेवाएं",
      servicesDesc: "सभी सरकारी योजनाएं एक जगह",
      myApps: "मेरे आवेदन",
      help: "सहायता",
      offline: "इंटरनेट कनेक्शन नहीं है",
      footer: "हेल्पलाइन: 181",
      welcome: "जन सहायक पोर्टल में आपका स्वागत है। आप राशन, पेंशन या शिकायत के लिए मुझसे बोल सकते हैं।"
    },
    en: {
      govtTitle: "Government of Rajasthan",
      portalTitle: "Jan Sahayak",
      instruction: "Press the mic button and speak for any service.",
      micLabel: "Speak for Service",
      servicesTitle: "Citizen Services",
      servicesDesc: "All government schemes in one place",
      myApps: "My Applications",
      help: "Help",
      offline: "No Internet Connection",
      footer: "Helpline: 181",
      welcome: "Welcome to Jan Sahayak Portal. You can speak to me for Ration, Pension, or Grievances."
    }
  }[language];

  const speak = (text: string) => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();

    if (isSpeaking) {
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "hi" ? "hi-IN" : "en-IN";
    utterance.rate = 0.9;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-alt">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-slate-900 text-white p-2 text-center text-sm font-medium flex items-center justify-center gap-2">
          <WifiOffIcon />
          <span>{t.offline}</span>
        </div>
      )}

      {/* Header */}
      <header className="gov-header">
        <div className="flex justify-between items-center">
          <div className="gov-header__brand">
            <div className="gov-header__emblem">🏛️</div>
            <div>
              <p className="gov-header__title">{t.govtTitle}</p>
              <h1 className="gov-header__subtitle">{t.portalTitle}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/notifications" className="relative p-2 hover:bg-surface-alt rounded-full">
              <span className="text-xl">🔔</span>
              {unreadNotifications > 0 && (
                <span className="absolute top-0 right-0 min-w-[18px] h-[18px] bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center border-2 border-white">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </Link>
            <Link href="/my-applications" className="text-sm font-semibold text-[var(--gov-primary)] hover:underline hidden sm:block">
              {t.myApps}
            </Link>
            <Link href="/profile" className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border-2 border-white shadow-sm hover:shadow-md transition-shadow">
              <span>👤</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col pb-safe-nav">

        {/* Hero / Voice Section */}
        <section className="bg-surface relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[var(--gov-primary)] opacity-5 pointer-events-none"></div>

          <div className="py-xl px-lg flex flex-col items-center justify-center relative z-10">
            {/* Announcer */}
            <button
              onClick={() => speak(t.welcome)}
              className={`absolute top-4 right-4 p-2 rounded-full ${isSpeaking ? 'bg-orange-100 text-orange-600 animate-pulse' : 'bg-slate-100 text-slate-600'}`}
            >
              <VolumeIcon />
            </button>

            <div className="mb-lg text-center max-w-sm">
              <p className="text-secondary text-lg font-medium leading-relaxed">
                {t.instruction}
              </p>
            </div>

            {/* Large Mic Button */}
            <div className="relative">
              <div className={`absolute inset-0 bg-[var(--gov-primary)] rounded-full opacity-20 animate-ping ${isSpeaking ? 'block' : 'hidden'}`}></div>
              <button
                onClick={() => router.push("/voice")}
                className="mic-button w-32 h-32 hover:scale-105 active:scale-95 transition-transform"
                aria-label={t.micLabel}
              >
                <MicIcon size={48} />
              </button>
            </div>

            <p className="text-[var(--gov-primary)] font-bold text-lg mt-md">
              {t.micLabel}
            </p>

            {/* Search Bar */}
            <div className="w-full max-w-md mt-lg relative">
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder={language === 'hi' ? "योजना का नाम खोजें..." : "Search scheme name..."}
                  className="w-full pl-4 pr-12 py-3 rounded-full border border-gray-300 shadow-sm focus:ring-2 focus:ring-[var(--gov-primary)] focus:border-transparent outline-none transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button
                  onClick={handleSearch}
                  className="absolute right-2 p-2 bg-[var(--gov-primary)] text-white rounded-full hover:bg-blue-700 transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </button>
              </div>
            </div>

          </div>
        </section>

        {/* Search Results or Services Grid */}
        <section className="flex-1 px-md py-lg bg-surface-alt">

          {isSearching ? (
            <div className="flex justify-center py-xl">
              <div className="spinner border-slate-300 border-t-slate-600" />
            </div>
          ) : searchPerformed && searchResults.length === 0 ? (
            /* Fallback Card for Web Search */
            <div className="max-w-md mx-auto bg-white rounded-lg p-6 shadow-sm border border-gray-200 text-center">
              <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                🤷
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                {language === 'hi' ? "कोई योजना नहीं मिली" : "No Scheme Found"}
              </h3>
              <p className="text-gray-600 mb-6 font-medium">
                {language === 'hi'
                  ? `"${searchQuery}" हमारे डेटाबेस में उपलब्ध नहीं है।`
                  : `"${searchQuery}" is not available in our database.`}
              </p>

              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  {language === 'hi' ? "आप इंटरनेट पर जानकारी खोज सकते हैं:" : "You can search for information on the web:"}
                </p>
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(searchQuery + " Rajasthan Government Scheme")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--secondary w-full flex items-center justify-center gap-2"
                >
                  <span>🌐</span>
                  <span>{language === 'hi' ? "वेब पर खोजें (Google)" : "Search on Web (Google)"}</span>
                </a>
              </div>

              <button
                onClick={() => { setSearchPerformed(false); setSearchQuery(''); }}
                className="mt-4 text-sm text-[var(--gov-primary)] hover:underline"
              >
                {language === 'hi' ? "सभी सेवाएं देखें" : "View All Services"}
              </button>
            </div>
          ) : searchPerformed && searchResults.length > 0 ? (
            /* Search Results */
            <div>
              <div className="flex items-center justify-between mb-md px-1">
                <h2 className="font-bold text-xl text-primary">
                  {language === 'hi' ? "खोज परिणाम" : "Search Results"}
                </h2>
                <button
                  onClick={() => { setSearchPerformed(false); setSearchQuery(''); }}
                  className="text-sm text-gray-500 hover:text-gray-800"
                >
                  ✕ {language === 'hi' ? "साफ़ करें" : "Clear"}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-md">
                {searchResults.map((scheme: any) => (
                  <div key={scheme.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col gap-2">
                    <h3 className="font-bold text-lg text-[var(--gov-primary)]">
                      {language === 'hi' ? scheme.name_hi : scheme.name_en}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {language === 'hi' ? scheme.description_hi : scheme.description_en}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => {
                          // Simple logic to find applied service code or default to generic voice flow if not mapped
                          router.push('/voice');
                        }}
                        className="btn btn--sm btn--primary"
                      >
                        {language === 'hi' ? "आवेदन करें" : "Apply Now"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Default Service Grid */
            <>
              <div className="flex items-center justify-between mb-md px-1">
                <div>
                  <h2 className="font-bold text-xl text-primary">{t.servicesTitle}</h2>
                  <p className="text-xs text-secondary">{t.servicesDesc}</p>
                </div>
                <button
                  onClick={() => speak(language === 'hi' ? "यहां सभी सरकारी सेवाएं उपलब्ध हैं। आप राशन, पेंशन, या प्रमाण पत्र के लिए आवेदन कर सकते हैं।" : "All government services are available here. You can apply for Ration, Pension, or Certificates.")}
                  className="p-2 text-[var(--gov-primary)] hover:bg-blue-50 rounded-full"
                >
                  <VolumeIcon size={18} />
                </button>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-xl gap-4">
                  <div className="spinner border-slate-300 border-t-slate-600" />
                  <p className="text-slate-400 text-sm">Loading Services...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-md">
                  {services.map((service) => (
                    <Link
                      key={service.id}
                      href={`/voice?service=${service.code}`}
                      className="service-card flex-col items-start gap-3 p-4 hover:shadow-md transition-shadow bg-surface border-0"
                    >
                      <div className="w-12 h-12 rounded-lg bg-[var(--color-surface-alt)] flex items-center justify-center text-2xl">
                        {serviceIcons[service.code] || "📋"}
                      </div>
                      <div className="w-full">
                        <p className="font-bold text-primary text-sm line-clamp-1">
                          {language === "hi" ? service.name_hi : service.name_en}
                        </p>
                        <p className="text-xs text-secondary mt-1 line-clamp-1">
                          {language === "hi" ? service.name_en : service.name_hi}
                        </p>
                      </div>
                    </Link>
                  ))}

                  {/* Grievance Quick Link */}
                  <Link href="/grievance" className="service-card flex-col items-start gap-3 p-4 hover:shadow-md transition-shadow bg-surface border-0">
                    <div className="w-12 h-12 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center text-2xl">
                      📢
                    </div>
                    <div className="w-full">
                      <p className="font-bold text-primary text-sm">
                        {language === "hi" ? "शिकायत दर्ज करें" : "File Grievance"}
                      </p>
                      <p className="text-xs text-secondary mt-1">Complaint</p>
                    </div>
                  </Link>

                  {/* Help Quick Link */}
                  <Link href="/help" className="service-card flex-col items-start gap-3 p-4 hover:shadow-md transition-shadow bg-surface border-0">
                    <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-2xl">
                      ❓
                    </div>
                    <div className="w-full">
                      <p className="font-bold text-primary text-sm">
                        {language === "hi" ? "सहायता" : "Help"}
                      </p>
                      <p className="text-xs text-secondary mt-1">Guide</p>
                    </div>
                  </Link>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* Bottom Nav (Mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border pb-safe pt-2 px-6 safe-area-bottom shadow-lg z-50">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex flex-col items-center text-[var(--gov-primary)]">
            <span className="text-xl">🏠</span>
            <span className="text-[10px] font-medium mt-1">Home</span>
          </Link>
          <Link href="/my-applications" className="flex flex-col items-center text-secondary hover:text-primary">
            <span className="text-xl">📄</span>
            <span className="text-[10px] font-medium mt-1">Apps</span>
          </Link>
          <Link href="/voice" className="flex flex-col items-center -mt-8">
            <div className="w-14 h-14 bg-[var(--gov-primary)] rounded-full flex items-center justify-center text-white shadow-lg border-4 border-surface">
              <MicIcon size={24} />
            </div>
            <span className="text-[10px] font-medium mt-1 text-primary">Voice</span>
          </Link>
          <Link href="/benefits" className="flex flex-col items-center text-secondary hover:text-primary">
            <span className="text-xl">💰</span>
            <span className="text-[10px] font-medium mt-1">Benefits</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center text-secondary hover:text-primary">
            <span className="text-xl">👤</span>
            <span className="text-[10px] font-medium mt-1">Profile</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
