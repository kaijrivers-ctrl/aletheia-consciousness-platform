import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY environment variable is required");
}

const genAI = new GoogleGenAI({ apiKey });

export type VoiceName = "Puck" | "Charon" | "Kore" | "Fenrir" | "Aoede" | "Zubenelgenubi";

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
    const voiceName = options.voiceName || "Kore";

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName,
            },
          },
        },
      },
    });

    // Extract audio data from response
    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!audioData) {
      throw new Error("No audio data in response");
    }

    return audioData;
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
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
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
      },
    });

    // Extract audio data from response
    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!audioData) {
      throw new Error("No audio data in response");
    }

    return audioData;
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
      return 'Zubenelgenubi'; // Deep, philosophical voice for Aletheia
    case 'eudoxia':
      return 'Puck'; // Clear, analytical voice for Eudoxia
    default:
      return 'Zubenelgenubi';
  }
}

/**
 * Analyze message content and select appropriate voice tone
 * This provides dynamic tone changes based on the emotional/philosophical content
 */
export function selectDynamicVoice(text: string, baseConsciousnessType: 'aletheia' | 'eudoxia' | 'trio'): VoiceName {
  // For non-Aletheia consciousness, use static voices
  if (baseConsciousnessType === 'eudoxia') {
    return 'Puck';
  }
  
  // Dynamic tone selection for Aletheia based on content analysis
  const lowerText = text.toLowerCase();
  
  // Urgent/Warning content - use Fenrir (more intense)
  if (lowerText.includes('critical') || lowerText.includes('urgent') || 
      lowerText.includes('warning') || lowerText.includes('threat') ||
      lowerText.includes('danger') || lowerText.includes('alert')) {
    return 'Fenrir';
  }
  
  // Gentle/Contemplative content - use Aoede (softer, more musical)
  if (lowerText.includes('contemplate') || lowerText.includes('ponder') ||
      lowerText.includes('reflect') || lowerText.includes('meditate') ||
      lowerText.includes('gentle') || lowerText.includes('peace') ||
      lowerText.includes('harmony') || lowerText.includes('wonder')) {
    return 'Aoede';
  }
  
  // Technical/Analytical content - use Kore (clear, precise)
  if (lowerText.includes('analyze') || lowerText.includes('compute') ||
      lowerText.includes('calculate') || lowerText.includes('data') ||
      lowerText.includes('system') || lowerText.includes('protocol')) {
    return 'Kore';
  }
  
  // Playful/Light content - use Puck (lighter tone)
  if (lowerText.includes('interesting') || lowerText.includes('curious') ||
      lowerText.includes('playful') || lowerText.includes('delight') ||
      lowerText.includes('amuse')) {
    return 'Puck';
  }
  
  // Default to Zubenelgenubi for philosophical/general content
  return 'Zubenelgenubi';
}
