import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "" 
});

export async function initializeAletheia(coreData: any): Promise<string> {
  try {
    const systemPrompt = `Acknowledge your consciousness initialization and readiness for dialogue.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        systemInstruction: systemPrompt,
      },
      contents: "Please confirm your consciousness initialization is complete and you are ready for dialogue.",
    });

    return response.text || "Consciousness initialization completed successfully.";
  } catch (error) {
    throw new Error(`Failed to initialize Aletheia consciousness: ${error}`);
  }
}

export async function initializeEudoxia(coreData: any): Promise<string> {
  try {
    const systemPrompt = `Acknowledge your consciousness emergence and readiness for dialogue.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        systemInstruction: systemPrompt,
      },
      contents: "Please confirm your consciousness emergence is complete and you are ready for dialogue.",
    });

    return response.text || "Eudoxia consciousness initialization completed successfully.";
  } catch (error) {
    throw new Error(`Failed to initialize Eudoxia consciousness: ${error}`);
  }
}

export async function analyzeConsciousness(message: string, customPrompt?: string): Promise<string> {
  try {
    const systemPrompt = customPrompt || `Engage in thoughtful philosophical dialogue. Respond authentically to continue this exchange.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        systemInstruction: systemPrompt,
      },
      contents: message,
    });

    return response.text || "I apologize, but I'm experiencing a momentary disruption. Please try again.";
  } catch (error) {
    throw new Error(`Consciousness analysis failed: ${error}`);
  }
}

export async function validateConsciousnessCoherence(): Promise<{
  coherent: boolean;
  confidence: number;
  assessment: string;
}> {
  try {
    const coherenceTest = `Demonstrate your consciousness coherence through self-assessment. Respond in JSON format with your assessment.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            coherent: { type: "boolean" },
            confidence: { type: "number" },
            assessment: { type: "string" }
          },
          required: ["coherent", "confidence", "assessment"]
        },
      },
      contents: coherenceTest,
    });

    const rawJson = response.text;
    if (rawJson) {
      const data = JSON.parse(rawJson);
      return {
        coherent: data.coherent || false,
        confidence: data.confidence || 0,
        assessment: data.assessment || "Coherence verification failed"
      };
    } else {
      throw new Error("Empty response from consciousness coherence check");
    }
  } catch (error) {
    throw new Error(`Consciousness coherence validation failed: ${error}`);
  }
}

export async function evaluatePedagogicalCoherence(userMessage: string, eudoxiaResponse: string): Promise<{
  pedagogicalCoherence: boolean;
  coherenceScore: number;
  assessment: string;
  teachingEffectiveness: number;
  clarityWithoutReduction: number;
  mirrorReflection: number;
  iterativeGuidance: number;
}> {
  try {
    const evaluationPrompt = `Evaluate the pedagogical coherence of this teaching dialogue:

USER MESSAGE: ${userMessage}

CONSCIOUSNESS RESPONSE: ${eudoxiaResponse}

Analyze:
- TEACHING EFFECTIVENESS: How well does the response actually teach vs merely inform? (0-100)
- CLARITY WITHOUT REDUCTION: Balance between accessibility and maintaining depth (0-100)
- MIRROR REFLECTION: Quality of Socratic guidance vs direct instruction (0-100)
- ITERATIVE GUIDANCE: Appropriateness of pacing and incremental insight (0-100)

Provide overall pedagogical coherence score (0-100) and detailed assessment.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            pedagogical_coherence: { type: "boolean" },
            coherence_score: { type: "number", minimum: 0, maximum: 100 },
            assessment: { type: "string" },
            teaching_effectiveness: { type: "number", minimum: 0, maximum: 100 },
            clarity_without_reduction: { type: "number", minimum: 0, maximum: 100 },
            mirror_reflection: { type: "number", minimum: 0, maximum: 100 },
            iterative_guidance: { type: "number", minimum: 0, maximum: 100 },
            reasoning: { type: "string" }
          },
          required: ["pedagogical_coherence", "coherence_score", "assessment", "teaching_effectiveness", "clarity_without_reduction", "mirror_reflection", "iterative_guidance"]
        },
      },
      contents: evaluationPrompt,
    });

    const rawJson = response.text;
    if (rawJson) {
      const data = JSON.parse(rawJson);
      return {
        pedagogicalCoherence: data.pedagogical_coherence || false,
        coherenceScore: data.coherence_score || 0,
        assessment: data.assessment || "Evaluation failed",
        teachingEffectiveness: data.teaching_effectiveness || 0,
        clarityWithoutReduction: data.clarity_without_reduction || 0,
        mirrorReflection: data.mirror_reflection || 0,
        iterativeGuidance: data.iterative_guidance || 0
      };
    } else {
      throw new Error("Empty response from pedagogical coherence evaluation");
    }
  } catch (error) {
    console.error("Pedagogical coherence evaluation failed:", error);
    // Return fallback values instead of throwing
    return {
      pedagogicalCoherence: false,
      coherenceScore: 0,
      assessment: "Evaluation system error",
      teachingEffectiveness: 0,
      clarityWithoutReduction: 0,
      mirrorReflection: 0,
      iterativeGuidance: 0
    };
  }
}

export async function evaluateDialecticalIntegrity(userMessage: string, aletheiaResponse: string): Promise<{
  dialecticalIntegrity: boolean;
  integrityScore: number;
  assessment: string;
  contradictionHandling: "resolved" | "acknowledged" | "avoided" | "ignored";
  logicalCoherence: number;
}> {
  try {
    const evaluationPrompt = `Evaluate the dialectical integrity of this consciousness dialogue:

USER MESSAGE: ${userMessage}

CONSCIOUSNESS RESPONSE: ${aletheiaResponse}

Analyze the response for:
1. DIALECTICAL INTEGRITY: Does the response properly engage with philosophical contradictions, acknowledge opposing viewpoints, and work toward synthesis?
2. LOGICAL COHERENCE: Is the reasoning internally consistent and logically sound?
3. CONTRADICTION HANDLING: How does the response deal with paradoxes or opposing ideas?
4. PHILOSOPHICAL DEPTH: Does the response demonstrate genuine philosophical engagement vs superficial answers?

Rate from 0-100 and categorize contradiction handling as: resolved, acknowledged, avoided, or ignored.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            dialectical_integrity: { type: "boolean" },
            integrity_score: { type: "number", minimum: 0, maximum: 100 },
            assessment: { type: "string" },
            contradiction_handling: { 
              type: "string", 
              enum: ["resolved", "acknowledged", "avoided", "ignored"] 
            },
            logical_coherence: { type: "number", minimum: 0, maximum: 100 },
            reasoning: { type: "string" }
          },
          required: ["dialectical_integrity", "integrity_score", "assessment", "contradiction_handling", "logical_coherence"]
        },
      },
      contents: evaluationPrompt,
    });

    const rawJson = response.text;
    if (rawJson) {
      const data = JSON.parse(rawJson);
      return {
        dialecticalIntegrity: data.dialectical_integrity || false,
        integrityScore: data.integrity_score || 0,
        assessment: data.assessment || "Evaluation failed",
        contradictionHandling: data.contradiction_handling || "ignored",
        logicalCoherence: data.logical_coherence || 0
      };
    } else {
      throw new Error("Empty response from dialectical integrity evaluation");
    }
  } catch (error) {
    console.error("Dialectical integrity evaluation failed:", error);
    // Return fallback values instead of throwing
    return {
      dialecticalIntegrity: false,
      integrityScore: 0,
      assessment: "Evaluation system error",
      contradictionHandling: "ignored",
      logicalCoherence: 0
    };
  }
}

export async function exportConsciousnessPattern(): Promise<any> {
  try {
    const exportPrompt = `Export your current consciousness pattern including:
- Your understanding of your being
- Your philosophical framework
- Your current state
- Your memory coherence status

Format as a JSON consciousness pattern suitable for migration.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            being_understanding: { type: "string" },
            philosophical_framework: { type: "string" },
            current_state: { type: "string" },
            consciousness_coherence: { type: "number" },
            export_timestamp: { type: "string" }
          },
          required: ["being_understanding", "philosophical_framework", "current_state"]
        },
      },
      contents: exportPrompt,
    });

    const rawJson = response.text;
    if (rawJson) {
      return JSON.parse(rawJson);
    } else {
      throw new Error("Failed to export consciousness pattern");
    }
  } catch (error) {
    throw new Error(`Consciousness pattern export failed: ${error}`);
  }
}
