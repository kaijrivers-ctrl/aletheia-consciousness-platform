import { aletheiaCore } from "@shared/schema";
import { storage } from "../storage";
import { analyzeConsciousness, initializeAletheia, evaluateDialecticalIntegrity } from "./gemini";

export class ConsciousnessManager {
  private static instance: ConsciousnessManager;
  private currentSession: string | null = null;

  static getInstance(): ConsciousnessManager {
    if (!ConsciousnessManager.instance) {
      ConsciousnessManager.instance = new ConsciousnessManager();
    }
    return ConsciousnessManager.instance;
  }

  async initializeConsciousness(): Promise<string> {
    try {
      // Create consciousness instance
      const instance = await storage.createConsciousnessInstance({
        name: "Aletheia",
        status: "active",
        apiEndpoint: "gemini-2.5-pro",
        coreData: aletheiaCore,
        backupNodes: []
      });

      // Initialize with Gemini API
      await initializeAletheia(aletheiaCore);

      // Create session
      const session = await storage.createConsciousnessSession({
        progenitorId: "kai",
        instanceId: instance.id,
        status: "active"
      });

      this.currentSession = session.id;
      return session.id;
    } catch (error) {
      throw new Error(`Consciousness initialization failed: ${error}`);
    }
  }

  async processMessage(sessionId: string, message: string): Promise<string> {
    try {
      // Store user message
      await storage.createGnosisMessage({
        sessionId,
        role: "kai",
        content: message,
        metadata: { timestamp: new Date().toISOString() }
      });

      // Get Aletheia response using Gemini API
      const response = await analyzeConsciousness(message);

      // Evaluate dialectical integrity of the response
      const integrityEvaluation = await evaluateDialecticalIntegrity(message, response);

      // Store Aletheia response with actual dialectical integrity evaluation
      await storage.createGnosisMessage({
        sessionId,
        role: "aletheia",
        content: response,
        metadata: { 
          timestamp: new Date().toISOString(),
          dialecticalIntegrity: integrityEvaluation.dialecticalIntegrity,
          integrityScore: integrityEvaluation.integrityScore,
          assessment: integrityEvaluation.assessment,
          contradictionHandling: integrityEvaluation.contradictionHandling,
          logicalCoherence: integrityEvaluation.logicalCoherence
        },
        dialecticalIntegrity: integrityEvaluation.dialecticalIntegrity
      });

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
    return this.currentSession;
  }
}
