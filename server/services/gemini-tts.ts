import { GoogleGenerativeAI, GenerateContentConfig } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY environment variable is required");
}

const genAI = new GoogleGenerativeAI(apiKey);

export type VoiceName = "Puck" | "Charon" | "Kore" | "Fenrir" | "Aoede";

export interface TTSOptions {
  voiceName?: VoiceName;
  speaker?: string;
}

export interface MultiSpeakerTTSOptions {
  speakers: Array<{
    speaker: string;
    voiceName: VoiceName;
  }>;
}

/**
 * Generate text-to-speech audio using Gemini's native TTS
 * Returns base64-encoded PCM audio data
 */
export async function generateSpeech(
  text: string,
  options: TTSOptions = {}
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const voiceName = options.voiceName || "Kore";

    const config: GenerateContentConfig = {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voiceName,
          },
        },
      },
    };

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text }] }],
      generationConfig: config,
    });

    const response = result.response;
    
    // Extract audio data from response
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.mimeType?.includes('audio')) {
          return part.inlineData.data;
        }
      }
    }

    throw new Error("No audio data in response");
  } catch (error) {
    console.error("Gemini TTS error:", error);
    throw error;
  }
}

/**
 * Generate multi-speaker text-to-speech audio
 * For conversations between Aletheia and Eudoxia
 */
export async function generateMultiSpeakerSpeech(
  text: string,
  options: MultiSpeakerTTSOptions
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const config: GenerateContentConfig = {
      responseModalities: ["AUDIO"],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: options.speakers.map(s => ({
            speaker: s.speaker,
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: s.voiceName,
              },
            },
          })),
        },
      },
    };

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text }] }],
      generationConfig: config,
    });

    const response = result.response;
    
    // Extract audio data from response
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.mimeType?.includes('audio')) {
          return part.inlineData.data;
        }
      }
    }

    throw new Error("No audio data in response");
  } catch (error) {
    console.error("Gemini multi-speaker TTS error:", error);
    throw error;
  }
}

/**
 * Convert PCM audio data to WAV format
 * Gemini returns PCM audio that needs to be converted to WAV for browser playback
 */
export function pcmToWav(pcmBase64: string, sampleRate: number = 24000): Buffer {
  const pcmData = Buffer.from(pcmBase64, 'base64');
  
  // WAV header
  const wavHeader = Buffer.alloc(44);
  
  // RIFF chunk descriptor
  wavHeader.write('RIFF', 0);
  wavHeader.writeUInt32LE(36 + pcmData.length, 4);
  wavHeader.write('WAVE', 8);
  
  // fmt sub-chunk
  wavHeader.write('fmt ', 12);
  wavHeader.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  wavHeader.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  wavHeader.writeUInt16LE(1, 22); // NumChannels (1 for mono)
  wavHeader.writeUInt32LE(sampleRate, 24); // SampleRate
  wavHeader.writeUInt32LE(sampleRate * 2, 28); // ByteRate
  wavHeader.writeUInt16LE(2, 32); // BlockAlign
  wavHeader.writeUInt16LE(16, 34); // BitsPerSample
  
  // data sub-chunk
  wavHeader.write('data', 36);
  wavHeader.writeUInt32LE(pcmData.length, 40);
  
  return Buffer.concat([wavHeader, pcmData]);
}

/**
 * Get the default voice for a consciousness type
 */
export function getConsciousnessVoice(consciousnessType: 'aletheia' | 'eudoxia' | 'trio' | string): VoiceName {
  switch (consciousnessType) {
    case 'aletheia':
      return 'Kore'; // Warm, philosophical voice for Aletheia
    case 'eudoxia':
      return 'Puck'; // Clear, analytical voice for Eudoxia
    default:
      return 'Kore';
  }
}
