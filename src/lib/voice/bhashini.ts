/**
 * Bhashini API Integration for Voice Services
 * Provides Speech-to-Text (ASR) and Text-to-Speech (TTS) for Indian languages
 * 
 * Documentation: https://bhashini.gov.in/ulca
 * Language code for Hindi: hin_Deva
 */

export interface BhashiniConfig {
    userId: string;
    apiKey: string;
    inferenceKey: string;
}

export interface TranscriptionResult {
    text: string;
    confidence: number;
    language: string;
    duration: number;
}

export interface TTSResult {
    audioContent: string; // Base64 encoded audio
    format: "wav" | "mp3";
}

export interface VoiceConfig {
    language: string;
    gender: "male" | "female";
    pitch?: number;
    rate?: number;
}

// Bhashini ULCA Pipeline configuration
interface PipelineConfig {
    pipelineId: string;
    taskType: "asr" | "tts" | "translation";
    config: {
        language: {
            sourceLanguage: string;
            targetLanguage?: string;
        };
        audioFormat?: string;
        gender?: string;
    };
}

// Language codes mapping
export const LANGUAGE_CODES = {
    hindi: "hi",
    hinglish: "hi", // Treat as Hindi for ASR
    english: "en",
    rajasthani: "hi", // Fallback to Hindi
} as const;

export const BHASHINI_LANGUAGE_CODES = {
    hindi: "hin_Deva",
    english: "eng_Latn",
} as const;

/**
 * Speech-to-Text Provider Interface
 */
export interface STTProvider {
    transcribe(audio: Blob, lang: string): Promise<TranscriptionResult>;
    supportsStreaming: boolean;
    name: string;
}

/**
 * Text-to-Speech Provider Interface
 */
export interface TTSProvider {
    speak(text: string, config: VoiceConfig): Promise<TTSResult>;
    getVoices(lang: string): Promise<string[]>;
    name: string;
}

/**
 * Bhashini STT Implementation
 */
export class BhashiniSTT implements STTProvider {
    private config: BhashiniConfig;
    public supportsStreaming = false;
    public name = "Bhashini ASR";

    constructor(config: BhashiniConfig) {
        this.config = config;
    }

    async transcribe(audio: Blob, lang: string = "hi"): Promise<TranscriptionResult> {
        const startTime = Date.now();

        // Convert blob to base64
        const audioBase64 = await this.blobToBase64(audio);

        // First, get the pipeline config
        const pipelineResponse = await this.getPipelineConfig("asr", lang);

        if (!pipelineResponse.success) {
            throw new Error("Failed to get Bhashini pipeline config");
        }

        // Make the ASR call
        const asrResponse = await fetch(pipelineResponse.inferenceEndpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": this.config.inferenceKey,
            },
            body: JSON.stringify({
                pipelineTasks: [
                    {
                        taskType: "asr",
                        config: {
                            language: {
                                sourceLanguage: lang === "hi" ? "hi" : "en",
                            },
                            serviceId: pipelineResponse.serviceId,
                            audioFormat: "wav",
                            samplingRate: 16000,
                        },
                    },
                ],
                inputData: {
                    audio: [
                        {
                            audioContent: audioBase64,
                        },
                    ],
                },
            }),
        });

        if (!asrResponse.ok) {
            throw new Error(`Bhashini ASR failed: ${asrResponse.statusText}`);
        }

        const result = await asrResponse.json();
        const duration = Date.now() - startTime;

        // Extract transcription from response
        const transcription = result?.pipelineResponse?.[0]?.output?.[0]?.source || "";

        return {
            text: transcription,
            confidence: 0.85, // Bhashini doesn't return confidence, use default
            language: lang,
            duration,
        };
    }

    private async getPipelineConfig(taskType: string, lang: string) {
        const response = await fetch(
            "https://meity-auth.ulca.ai/ulca/apis/v0/model/getModelsPipeline",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "ulcaApiKey": this.config.apiKey,
                    "userID": this.config.userId,
                },
                body: JSON.stringify({
                    pipelineTasks: [
                        {
                            taskType: taskType,
                            config: {
                                language: {
                                    sourceLanguage: lang === "hi" ? "hi" : "en",
                                },
                            },
                        },
                    ],
                    pipelineRequestConfig: {
                        pipelineId: "64392f96daac500b55c543cd",
                    },
                }),
            }
        );

        if (!response.ok) {
            return { success: false };
        }

        const data = await response.json();

        return {
            success: true,
            inferenceEndpoint: data?.pipelineInferenceAPIEndPoint?.callbackUrl || "",
            serviceId: data?.pipelineResponseConfig?.[0]?.config?.[0]?.serviceId || "",
        };
    }

    private async blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = (reader.result as string).split(",")[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
}

/**
 * Bhashini TTS Implementation
 */
export class BhashiniTTS implements TTSProvider {
    private config: BhashiniConfig;
    public name = "Bhashini TTS";

    constructor(config: BhashiniConfig) {
        this.config = config;
    }

    async speak(text: string, voiceConfig: VoiceConfig): Promise<TTSResult> {
        const lang = voiceConfig.language === "hi" ? "hi" : "en";

        // Get pipeline config
        const pipelineResponse = await this.getPipelineConfig("tts", lang, voiceConfig.gender);

        if (!pipelineResponse.success) {
            throw new Error("Failed to get Bhashini TTS pipeline config");
        }

        // Make TTS call
        const ttsResponse = await fetch(pipelineResponse.inferenceEndpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": this.config.inferenceKey,
            },
            body: JSON.stringify({
                pipelineTasks: [
                    {
                        taskType: "tts",
                        config: {
                            language: {
                                sourceLanguage: lang,
                            },
                            serviceId: pipelineResponse.serviceId,
                            gender: voiceConfig.gender,
                        },
                    },
                ],
                inputData: {
                    input: [
                        {
                            source: text,
                        },
                    ],
                },
            }),
        });

        if (!ttsResponse.ok) {
            throw new Error(`Bhashini TTS failed: ${ttsResponse.statusText}`);
        }

        const result = await ttsResponse.json();
        const audioContent = result?.pipelineResponse?.[0]?.audio?.[0]?.audioContent || "";

        return {
            audioContent,
            format: "wav",
        };
    }

    async getVoices(lang: string): Promise<string[]> {
        // Bhashini provides male and female voices for most Indian languages
        return ["male", "female"];
    }

    private async getPipelineConfig(taskType: string, lang: string, gender: string) {
        const response = await fetch(
            "https://meity-auth.ulca.ai/ulca/apis/v0/model/getModelsPipeline",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "ulcaApiKey": this.config.apiKey,
                    "userID": this.config.userId,
                },
                body: JSON.stringify({
                    pipelineTasks: [
                        {
                            taskType: taskType,
                            config: {
                                language: {
                                    sourceLanguage: lang,
                                },
                                gender: gender,
                            },
                        },
                    ],
                    pipelineRequestConfig: {
                        pipelineId: "64392f96daac500b55c543cd",
                    },
                }),
            }
        );

        if (!response.ok) {
            return { success: false };
        }

        const data = await response.json();

        return {
            success: true,
            inferenceEndpoint: data?.pipelineInferenceAPIEndPoint?.callbackUrl || "",
            serviceId: data?.pipelineResponseConfig?.[0]?.config?.[0]?.serviceId || "",
        };
    }
}

/**
 * Web Speech API Fallback for STT (browser-native)
 */
export class WebSpeechSTT implements STTProvider {
    public supportsStreaming = true;
    public name = "Web Speech API";

    async transcribe(audio: Blob, lang: string = "hi"): Promise<TranscriptionResult> {
        // This is used when Bhashini is unavailable
        // Uses the browser's built-in speech recognition
        return new Promise((resolve, reject) => {
            const SpeechRecognition = (window as any).SpeechRecognition ||
                (window as any).webkitSpeechRecognition;

            if (!SpeechRecognition) {
                reject(new Error("Speech recognition not supported in this browser"));
                return;
            }

            const recognition = new SpeechRecognition();
            recognition.lang = lang === "hi" ? "hi-IN" : "en-US";
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            recognition.onresult = (event: any) => {
                const result = event.results[0][0];
                resolve({
                    text: result.transcript,
                    confidence: result.confidence || 0.8,
                    language: lang,
                    duration: 0,
                });
            };

            recognition.onerror = (event: any) => {
                reject(new Error(`Speech recognition error: ${event.error}`));
            };

            recognition.start();
        });
    }
}

/**
 * Web Speech API Fallback for TTS (browser-native)
 */
export class WebSpeechTTS implements TTSProvider {
    public name = "Web Speech API";

    async speak(text: string, config: VoiceConfig): Promise<TTSResult> {
        return new Promise((resolve) => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = config.language === "hi" ? "hi-IN" : "en-US";
            utterance.pitch = config.pitch || 1;
            utterance.rate = config.rate || 0.9; // Slightly slower for clarity

            // Find a suitable voice
            const voices = speechSynthesis.getVoices();
            const langVoice = voices.find(v =>
                v.lang.startsWith(config.language === "hi" ? "hi" : "en")
            );
            if (langVoice) {
                utterance.voice = langVoice;
            }

            utterance.onend = () => {
                resolve({ audioContent: "", format: "wav" });
            };

            speechSynthesis.speak(utterance);
            resolve({ audioContent: "", format: "wav" });
        });
    }

    async getVoices(lang: string): Promise<string[]> {
        const voices = speechSynthesis.getVoices();
        return voices
            .filter(v => v.lang.startsWith(lang === "hi" ? "hi" : "en"))
            .map(v => v.name);
    }
}

/**
 * Voice Service Manager - Manages STT and TTS providers with fallback
 */
export class VoiceService {
    private sttProviders: STTProvider[];
    private ttsProviders: TTSProvider[];
    private currentSTT: STTProvider;
    private currentTTS: TTSProvider;

    constructor(bhashiniConfig?: BhashiniConfig) {
        // Initialize providers
        if (bhashiniConfig) {
            const bhashiniSTT = new BhashiniSTT(bhashiniConfig);
            const bhashiniTTS = new BhashiniTTS(bhashiniConfig);
            this.sttProviders = [bhashiniSTT, new WebSpeechSTT()];
            this.ttsProviders = [bhashiniTTS, new WebSpeechTTS()];
            this.currentSTT = bhashiniSTT;
            this.currentTTS = bhashiniTTS;
        } else {
            // Fallback to Web Speech API only
            this.sttProviders = [new WebSpeechSTT()];
            this.ttsProviders = [new WebSpeechTTS()];
            this.currentSTT = this.sttProviders[0];
            this.currentTTS = this.ttsProviders[0];
        }
    }

    async transcribe(audio: Blob, lang: string = "hi"): Promise<TranscriptionResult> {
        try {
            return await this.currentSTT.transcribe(audio, lang);
        } catch (error) {
            console.warn(`Primary STT failed (${this.currentSTT.name}), trying fallback...`);

            // Try fallback providers
            for (const provider of this.sttProviders) {
                if (provider !== this.currentSTT) {
                    try {
                        return await provider.transcribe(audio, lang);
                    } catch (e) {
                        continue;
                    }
                }
            }

            throw new Error("All STT providers failed");
        }
    }

    async speak(text: string, config?: Partial<VoiceConfig>): Promise<void> {
        const voiceConfig: VoiceConfig = {
            language: config?.language || "hi",
            gender: config?.gender || "female",
            pitch: config?.pitch || 1,
            rate: config?.rate || 0.9,
        };

        try {
            const result = await this.currentTTS.speak(text, voiceConfig);

            if (result.audioContent) {
                // Play the audio from base64
                await this.playBase64Audio(result.audioContent);
            }
        } catch (error) {
            console.warn(`Primary TTS failed (${this.currentTTS.name}), trying fallback...`);

            // Try fallback providers
            for (const provider of this.ttsProviders) {
                if (provider !== this.currentTTS) {
                    try {
                        await provider.speak(text, voiceConfig);
                        return;
                    } catch (e) {
                        continue;
                    }
                }
            }

            throw new Error("All TTS providers failed");
        }
    }

    private async playBase64Audio(base64Audio: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
            audio.onended = () => resolve();
            audio.onerror = (e) => reject(e);
            audio.play();
        });
    }

    getSTTProviderName(): string {
        return this.currentSTT.name;
    }

    getTTSProviderName(): string {
        return this.currentTTS.name;
    }
}

// Export singleton instance creator
export function createVoiceService(): VoiceService {
    const config = process.env.BHASHINI_USER_ID && process.env.BHASHINI_API_KEY
        ? {
            userId: process.env.BHASHINI_USER_ID,
            apiKey: process.env.BHASHINI_API_KEY,
            inferenceKey: process.env.BHASHINI_INFERENCE_KEY || "",
        }
        : undefined;

    return new VoiceService(config);
}
