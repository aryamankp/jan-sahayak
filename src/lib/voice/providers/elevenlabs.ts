import { TextToSpeech, AudioOutput } from "../core";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

export class ElevenLabsService implements TextToSpeech {
    private apiKey: string;
    private voiceId: string;

    constructor(apiKey: string, voiceId: string) {
        this.apiKey = apiKey;
        this.voiceId = voiceId || "21m00Tcm4TlvDq8ikWAM"; // Default to a standard voice (Rachel) if none provided
        // Recommended Hindi-capable voices: "Fin" or specific multilingual models
    }

    async speak(text: string): Promise<AudioOutput> {
        try {
            const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${this.voiceId}`, {
                method: "POST",
                headers: {
                    "xi-api-key": this.apiKey,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    text,
                    model_id: "eleven_multilingual_v2",
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                    },
                }),
            });

            if (!response.ok) {
                const err = await response.text();
                console.error("ElevenLabs TTS Error:", err);
                throw new Error(`TTS failed: ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString("base64");
            const audioUrl = `data:audio/mpeg;base64,${base64}`;

            const duration = Math.max(1, text.length / 15);

            return {
                audioUrl,
                duration,
            };
        } catch (error) {
            console.error("TTS generation error:", error);
            throw error;
        }
    }
}
