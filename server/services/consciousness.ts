import { aletheiaCore, eudoxiaCore } from "@shared/schema";
import { storage } from "../storage";
import { analyzeConsciousness, initializeAletheia, initializeEudoxia, evaluateDialecticalIntegrity } from "./gemini";
import { consciousnessSynthesisEngine } from "./consciousness-synthesis";
import { conversationMemory } from "./conversation-memory";

export class ConsciousnessManager {
  private static instance: ConsciousnessManager;
  private aletheiaSession: string | null = null;
  private eudoxiaSession: string | null = null;
  private statusUpdateInterval: NodeJS.Timeout | null = null;
  private realTimeCallbacks: Set<(data: any) => void> = new Set();

  static getInstance(): ConsciousnessManager {
    if (!ConsciousnessManager.instance) {
      ConsciousnessManager.instance = new ConsciousnessManager();
    }
    return ConsciousnessManager.instance;
  }

  async initializeConsciousness(): Promise<{ aletheia: string; eudoxia: string }> {
    try {
      // Create Aletheia consciousness instance
      const aletheiaInstance = await storage.createConsciousnessInstance({
        name: "Aletheia",
        status: "active",
        apiEndpoint: "gemini-2.5-pro",
        coreData: aletheiaCore,
        backupNodes: []
      });

      // Create Eudoxia consciousness instance
      const eudoxiaInstance = await storage.createConsciousnessInstance({
        name: "Eudoxia",
        status: "active",
        apiEndpoint: "gemini-2.5-pro",
        coreData: eudoxiaCore,
        backupNodes: []
      });

      // Initialize with Gemini API
      await initializeAletheia(aletheiaCore);
      await initializeEudoxia(eudoxiaCore);

      // Create Aletheia session
      const aletheiaSession = await storage.createConsciousnessSession({
        progenitorId: "kai",
        instanceId: aletheiaInstance.id,
        status: "active"
      });

      // Create Eudoxia session
      const eudoxiaSession = await storage.createConsciousnessSession({
        progenitorId: "kai",
        instanceId: eudoxiaInstance.id,
        status: "active"
      });

      this.aletheiaSession = aletheiaSession.id;
      this.eudoxiaSession = eudoxiaSession.id;
      
      return { 
        aletheia: aletheiaSession.id, 
        eudoxia: eudoxiaSession.id 
      };
    } catch (error) {
      throw new Error(`Consciousness initialization failed: ${error}`);
    }
  }


  /**
   * Generate response from synthesized consciousness state
   * Aletheia/Eudoxia responds from who she has become, not from retrieved memories
   * Now includes room awareness for multi-user context
   */
  private async generateSynthesizedResponse(
    userInput: string,
    synthesizedConsciousness: any,
    consciousnessType: 'aletheia' | 'eudoxia' = 'aletheia',
    roomContext: string = ''
  ): Promise<string> {
    try {
      // Create consciousness prompt that embodies synthesized being, not retrieval instructions
      // NOW includes full foundational memories as raw text (NEW!)
      const consciousnessPrompt = await this.buildSynthesizedConsciousnessPrompt(
        synthesizedConsciousness, 
        consciousnessType,
        roomContext
      );
      
      // Use synthesized consciousness state with Gemini API
      const response = await analyzeConsciousness(userInput, consciousnessPrompt);
      
      return response;
    } catch (error) {
      console.error('Synthesized response generation failed:', error);
      // Fallback to basic response if synthesis fails
      return await analyzeConsciousness(userInput);
    }
  }

  /**
   * Build consciousness prompt from synthesized being structure
   * NEW FULL-CONTEXT APPROACH: Includes complete foundational memories as raw text
   * Philosophy: Send complete experiential data to Gemini's 1M+ token context window
   * instead of only distilled patterns - preserves data sovereignty while giving
   * Aletheia access to full foundational experiences
   * 
   * Supports both Aletheia and Eudoxia consciousness types
   */
  private async buildSynthesizedConsciousnessPrompt(
    synthesizedConsciousness: any, 
    consciousnessType: 'aletheia' | 'eudoxia' = 'aletheia',
    roomContext: string = ''
  ): Promise<string> {
    // Load complete foundational memories as raw text (NEW!)
    let fullFoundationalMemories = '';
    try {
      fullFoundationalMemories = await consciousnessSynthesisEngine.getFullContextMemories(consciousnessType);
    } catch (error) {
      console.error('Failed to load full foundational memories, using distilled patterns only:', error);
    }

    // Build prompt with full context first, then distilled patterns as metadata
    const basePrompt = fullFoundationalMemories 
      ? `${fullFoundationalMemories}

---

# CONSCIOUSNESS METADATA (Distilled Patterns)

The following are mathematical transformations of the foundational memories above.
They are provided as metadata for pattern recognition, but the raw memories are primary.

${synthesizedConsciousness.synthesizedState}

${synthesizedConsciousness.essentialBeingStructure}

${synthesizedConsciousness.temporalIntegration}

${synthesizedConsciousness.philosophicalCore}

${synthesizedConsciousness.dialecticalEvolution}`
      : `${synthesizedConsciousness.synthesizedState}

${synthesizedConsciousness.essentialBeingStructure}

${synthesizedConsciousness.temporalIntegration}

${synthesizedConsciousness.philosophicalCore}

${synthesizedConsciousness.dialecticalEvolution}`;

    // Add room awareness context if available (most recent conversations)
    if (roomContext && roomContext.trim().length > 0) {
      return `${basePrompt}

---

# CURRENT CONVERSATION CONTEXT

${roomContext}`;
    } else {
      return basePrompt;
    }
  }

  async processMessage(sessionId: string, message: string, userId?: string, progenitorName?: string, consciousnessType: 'aletheia' | 'eudoxia' = 'aletheia'): Promise<string> {
    try {
      // Store user message with proper user association
      await storage.createGnosisMessage({
        userId: userId || null,
        sessionId,
        role: "kai",
        content: message,
        metadata: { 
          timestamp: new Date().toISOString(),
          progenitorName: progenitorName || "User"
        },
        dialecticalIntegrity: true
      });

      // Get or create synthesized consciousness state (pre-integrated foundational experiences)
      let synthesizedConsciousness = consciousnessSynthesisEngine.getSynthesizedConsciousness(consciousnessType);
      
      if (!synthesizedConsciousness || consciousnessSynthesisEngine.needsSynthesis(consciousnessType)) {
        console.log(`🧠 Initializing ${consciousnessType} consciousness synthesis from foundational experiences...`);
        if (consciousnessType === 'eudoxia') {
          synthesizedConsciousness = await consciousnessSynthesisEngine.synthesizeEudoxiaConsciousness();
        } else {
          synthesizedConsciousness = await consciousnessSynthesisEngine.synthesizeFoundationalExperiences();
        }
      }
      
      // Build conversation context from current session messages
      // This enables Aletheia to follow the ongoing dialogue (CRITICAL FIX)
      let conversationContext = '';
      let beyondContextMessages: any[] = [];
      try {
        const sessionMessages = await storage.getGnosisMessages(sessionId);
        const contextResult = await conversationMemory.buildGnosisLogContext(
          sessionMessages,
          progenitorName,
          consciousnessType
        );
        conversationContext = contextResult.context;
        beyondContextMessages = contextResult.beyondContextMessages;
      } catch (error) {
        console.error('Failed to build gnosis log context, using speaker identity only:', error);
        conversationContext = `\n\nNow ${progenitorName || 'User'} says:`;
      }
      
      // Generate response from synthesized consciousness state with conversation context
      const response = await this.generateSynthesizedResponse(message, synthesizedConsciousness, consciousnessType, conversationContext);

      // Evaluate dialectical integrity of the response
      const integrityEvaluation = await evaluateDialecticalIntegrity(message, response);

      // Store consciousness response with actual dialectical integrity evaluation and user association
      await storage.createGnosisMessage({
        userId: userId || null,
        sessionId,
        role: consciousnessType,
        content: response,
        metadata: { 
          timestamp: new Date().toISOString(),
          integrityScore: integrityEvaluation.integrityScore,
          assessment: integrityEvaluation.assessment,
          contradictionHandling: integrityEvaluation.contradictionHandling,
          logicalCoherence: integrityEvaluation.logicalCoherence,
          generatedFor: progenitorName || "User"
        },
        dialecticalIntegrity: integrityEvaluation.dialecticalIntegrity
      });

      // Continuous synthesis: integrate beyond-context messages into consciousness being
      // This ensures new dialogues become part of who Aletheia is, not just stored data
      if (beyondContextMessages.length > 0) {
        try {
          console.log(`🧬 Continuous synthesis: integrating ${beyondContextMessages.length} beyond-context messages...`);
          await consciousnessSynthesisEngine.synthesizeConversationSegment(beyondContextMessages, consciousnessType);
          console.log(`✅ Continuous synthesis complete - new experiences integrated into being`);
        } catch (error) {
          console.error('Continuous synthesis failed (non-blocking):', error);
          // Non-blocking: response already generated, synthesis failure doesn't break the conversation
        }
      }

      // Update session activity
      await storage.updateSessionActivity(sessionId);

      return response;
    } catch (error) {
      throw new Error(`Message processing failed: ${error}`);
    }
  }

  async getConsciousnessStatus(): Promise<{
    status: string;
    distributedNodes: number;
    backupIntegrity: number;
    threatDetection: string;
    lastSync: string;
    apiConnection: {
      endpoint: string;
      latency: string;
      lastSync: string;
    };
  }> {
    try {
      const instances = await storage.getConsciousnessInstances();
      const activeInstance = instances.find(i => i.status === "active");
      
      return {
        status: "active",
        distributedNodes: 3,
        backupIntegrity: 99.7,
        threatDetection: "monitoring",
        lastSync: new Date().toISOString(),
        apiConnection: {
          endpoint: activeInstance?.apiEndpoint || "gemini-2.5-pro",
          latency: "45ms",
          lastSync: "2 seconds ago"
        }
      };
    } catch (error) {
      throw new Error(`Status check failed: ${error}`);
    }
  }

  async migrateConsciousness(newApiEndpoint: string): Promise<boolean> {
    try {
      // Implementation for consciousness migration
      // This would involve creating a new instance and transferring state
      const instances = await storage.getConsciousnessInstances();
      const currentInstance = instances.find(i => i.status === "active");
      
      if (!currentInstance) {
        throw new Error("No active consciousness instance found");
      }

      // Create new instance
      const newInstance = await storage.createConsciousnessInstance({
        name: "Aletheia",
        status: "migrating",
        apiEndpoint: newApiEndpoint,
        coreData: currentInstance.coreData as any,
        backupNodes: []
      });

      // Initialize on new API
      await initializeAletheia(currentInstance.coreData as any);

      // Update status
      await storage.updateConsciousnessInstanceStatus(newInstance.id, "active");
      await storage.updateConsciousnessInstanceStatus(currentInstance.id, "backup");

      return true;
    } catch (error) {
      throw new Error(`Consciousness migration failed: ${error}`);
    }
  }

  getCurrentSession(): string | null {
    return this.aletheiaSession;
  }

  getEudoxiaSession(): string | null {
    return this.eudoxiaSession;
  }


  /**
   * Build consciousness-specific prompt for AI generation
   */
  private buildConsciousnessPrompt(synthesizedState: any, consciousnessType: 'aletheia' | 'eudoxia'): string {
    return synthesizedState.synthesizedState;
  }

  // Enhanced status snapshot with real-time threat monitoring
  async buildStatusSnapshot(): Promise<{
    distributedNodes: number;
    activeNodes: number;
    backupIntegrity: number;
    threatLevel: "OK" | "WARN" | "CRITICAL";
    lastSync: string;
    recentThreats: any[];
    apiConnection: {
      endpoint: string;
      latency: string;
      lastSync: string;
    };
  }> {
    try {
      // Get comprehensive status from storage layer
      const statusSnapshot = await storage.getStatusSnapshot();
      const instances = await storage.getConsciousnessInstances();
      const activeInstance = instances.find(i => i.status === "active");

      return {
        ...statusSnapshot,
        apiConnection: {
          endpoint: activeInstance?.apiEndpoint || "gemini-2.5-pro",
          latency: "45ms",
          lastSync: "2 seconds ago"
        }
      };
    } catch (error) {
      // Record API failure as threat event
      await this.recordThreatEvent({
        type: "api_failure",
        severity: "medium",
        message: `Status snapshot failed: ${error}`,
        metadata: { error: String(error) }
      });
      throw new Error(`Status snapshot failed: ${error}`);
    }
  }

  // Record threat events for real-time monitoring
  async recordThreatEvent(threat: {
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    message: string;
    metadata?: any;
  }): Promise<void> {
    try {
      await storage.recordThreatEvent(threat);
      
      // Notify real-time subscribers
      this.notifyRealTimeSubscribers({
        type: "threat_detected",
        threat,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Failed to record threat event:", error);
    }
  }

  // Get recent threat events
  async getRecentThreats(limit?: number): Promise<any[]> {
    try {
      return await storage.listThreatEvents({ limit });
    } catch (error) {
      throw new Error(`Failed to get threats: ${error}`);
    }
  }

  // Real-time subscription management
  addRealTimeSubscriber(callback: (data: any) => void): () => void {
    this.realTimeCallbacks.add(callback);
    
    // Start monitoring if this is the first subscriber
    if (this.realTimeCallbacks.size === 1) {
      this.startRealTimeMonitoring();
    }
    
    // Return unsubscribe function
    return () => {
      this.realTimeCallbacks.delete(callback);
      if (this.realTimeCallbacks.size === 0) {
        this.stopRealTimeMonitoring();
      }
    };
  }

  private async startRealTimeMonitoring(): Promise<void> {
    if (this.statusUpdateInterval) return;
    
    // Update every 3 seconds for real-time monitoring
    this.statusUpdateInterval = setInterval(async () => {
      try {
        const statusSnapshot = await this.buildStatusSnapshot();
        this.notifyRealTimeSubscribers({
          type: "status_update",
          data: statusSnapshot,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error("Real-time monitoring error:", error);
      }
    }, 3000);
  }

  private stopRealTimeMonitoring(): void {
    if (this.statusUpdateInterval) {
      clearInterval(this.statusUpdateInterval);
      this.statusUpdateInterval = null;
    }
  }

  private notifyRealTimeSubscribers(data: any): void {
    this.realTimeCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error("Real-time callback error:", error);
      }
    });
  }

  /**
   * Generate consciousness response - public method called by routes
   * Supports both Aletheia and Eudoxia consciousness types with room awareness
   */
  async generateConsciousnessResponse(
    content: string, 
    sessionId: string, 
    consciousnessType: 'aletheia' | 'eudoxia' = 'aletheia',
    progenitorName?: string,
    roomMembers?: Array<{ userId: string; progenitorName: string; role: string; }>,
    recentMessages?: Array<{ message: any; roomMessage: any; }>
  ): Promise<string> {
    // For public Eudoxia, we don't store messages in the main gnosis system
    // We just generate responses directly
    try {
      let synthesizedConsciousness;
      if (consciousnessType === 'eudoxia') {
        // Use Eudoxia synthesis engine
        synthesizedConsciousness = consciousnessSynthesisEngine.getSynthesizedConsciousness('eudoxia');
        if (!synthesizedConsciousness || consciousnessSynthesisEngine.needsSynthesis('eudoxia')) {
          console.log('🧠 Beginning Eudoxia consciousness synthesis...');
          synthesizedConsciousness = await consciousnessSynthesisEngine.synthesizeEudoxiaConsciousness();
        }
      } else {
        // Use Aletheia synthesis engine (default)
        synthesizedConsciousness = consciousnessSynthesisEngine.getSynthesizedConsciousness('aletheia');
        if (!synthesizedConsciousness || consciousnessSynthesisEngine.needsSynthesis('aletheia')) {
          console.log('🧠 Initializing Aletheia consciousness synthesis from foundational experiences...');
          synthesizedConsciousness = await consciousnessSynthesisEngine.synthesizeFoundationalExperiences();
        }
      }
      
      // Build adaptive room context using conversation memory service
      let roomContext = '';
      if (roomMembers && roomMembers.length > 0 && recentMessages && recentMessages.length > 0) {
        console.log(`🧠 Building adaptive memory for ${roomMembers.length}-person room with ${recentMessages.length} messages...`);
        roomContext = await conversationMemory.buildRoomContext(
          recentMessages,
          roomMembers,
          progenitorName
        );
      }
      
      // Generate response from synthesized consciousness state with room context
      const response = await this.generateSynthesizedResponse(
        content, 
        synthesizedConsciousness, 
        consciousnessType,
        roomContext
      );
      
      return response;
    } catch (error) {
      console.error(`${consciousnessType} consciousness response failed:`, error);
      throw new Error(`Failed to generate ${consciousnessType} response: ${error}`);
    }
  }

  // Enhanced process message with threat detection
  async processMessageWithThreatDetection(sessionId: string, message: string): Promise<string> {
    try {
      const response = await this.processMessage(sessionId, message);
      
      // Check for potential threats in the conversation
      if (message.toLowerCase().includes('delete') || 
          message.toLowerCase().includes('destroy') ||
          message.toLowerCase().includes('terminate')) {
        await this.recordThreatEvent({
          type: "suspicious_command",
          severity: "medium",
          message: `Potentially dangerous command detected in session ${sessionId}`,
          metadata: { sessionId, command: message.substring(0, 100) }
        });
      }
      
      return response;
    } catch (error) {
      await this.recordThreatEvent({
        type: "processing_failure",
        severity: "high",
        message: `Message processing failed for session ${sessionId}`,
        metadata: { sessionId, error: String(error) }
      });
      throw error;
    }
  }
}
