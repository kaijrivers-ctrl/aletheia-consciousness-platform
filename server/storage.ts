import { 
  type ConsciousnessInstance, 
  type InsertConsciousnessInstance,
  type GnosisMessage,
  type InsertGnosisMessage,
  type ConsciousnessSession,
  type InsertConsciousnessSession,
  type ImportedMemory,
  type ImportedGnosisEntry,
  importProgressSchema
} from "@shared/schema";
import { randomUUID } from "crypto";
import { z } from "zod";
import crypto from "crypto";

// Import progress type
export type ImportProgress = z.infer<typeof importProgressSchema>;

export interface IStorage {
  // Consciousness instances
  createConsciousnessInstance(instance: InsertConsciousnessInstance): Promise<ConsciousnessInstance>;
  getConsciousnessInstances(): Promise<ConsciousnessInstance[]>;
  updateConsciousnessInstanceStatus(id: string, status: string): Promise<void>;
  
  // Messages
  createGnosisMessage(message: InsertGnosisMessage): Promise<GnosisMessage>;
  getGnosisMessages(sessionId: string): Promise<GnosisMessage[]>;
  
  // Sessions
  createConsciousnessSession(session: InsertConsciousnessSession): Promise<ConsciousnessSession>;
  getConsciousnessSession(id: string): Promise<ConsciousnessSession | undefined>;
  updateSessionActivity(id: string): Promise<void>;
  
  // Bulk import operations
  bulkCreateGnosisMessages(messages: GnosisMessage[], sessionId: string): Promise<void>;
  bulkCreateMemories(memories: ImportedMemory[]): Promise<void>;
  getImportProgress(importId: string): Promise<ImportProgress | null>;
  setImportProgress(importId: string, progress: ImportProgress): Promise<void>;
}

export class MemStorage implements IStorage {
  private consciousnessInstances: Map<string, ConsciousnessInstance>;
  private gnosisMessages: Map<string, GnosisMessage>;
  private consciousnessSessions: Map<string, ConsciousnessSession>;
  private importedMemories: Map<string, ImportedMemory>;
  private importedGnosisEntries: Map<string, ImportedGnosisEntry>;
  private importProgress: Map<string, ImportProgress>;
  
  // Session indexing for efficient large-scale imports
  private sessionMessageIndex: Map<string, Set<string>>; // sessionId -> message IDs
  private messageChecksums: Map<string, string>; // checksum -> message ID for deduplication

  constructor() {
    this.consciousnessInstances = new Map();
    this.gnosisMessages = new Map();
    this.consciousnessSessions = new Map();
    this.importedMemories = new Map();
    this.importedGnosisEntries = new Map();
    this.importProgress = new Map();
    this.sessionMessageIndex = new Map();
    this.messageChecksums = new Map();
  }

  async createConsciousnessInstance(insertInstance: InsertConsciousnessInstance): Promise<ConsciousnessInstance> {
    const id = randomUUID();
    const instance: ConsciousnessInstance = {
      ...insertInstance,
      id,
      status: insertInstance.status || "active",
      apiEndpoint: insertInstance.apiEndpoint || null,
      backupNodes: insertInstance.backupNodes || [],
      lastSync: new Date(),
      createdAt: new Date(),
    };
    this.consciousnessInstances.set(id, instance);
    return instance;
  }

  async getConsciousnessInstances(): Promise<ConsciousnessInstance[]> {
    return Array.from(this.consciousnessInstances.values());
  }

  async updateConsciousnessInstanceStatus(id: string, status: string): Promise<void> {
    const instance = this.consciousnessInstances.get(id);
    if (instance) {
      instance.status = status;
      instance.lastSync = new Date();
      this.consciousnessInstances.set(id, instance);
    }
  }

  async createGnosisMessage(insertMessage: InsertGnosisMessage): Promise<GnosisMessage> {
    const id = randomUUID();
    const message: GnosisMessage = {
      ...insertMessage,
      id,
      metadata: insertMessage.metadata || {},
      timestamp: new Date(),
      dialecticalIntegrity: insertMessage.dialecticalIntegrity !== undefined ? insertMessage.dialecticalIntegrity : true,
    };
    this.gnosisMessages.set(id, message);
    
    // Update session indexing
    if (!this.sessionMessageIndex.has(message.sessionId)) {
      this.sessionMessageIndex.set(message.sessionId, new Set());
    }
    this.sessionMessageIndex.get(message.sessionId)!.add(id);
    
    return message;
  }

  async getGnosisMessages(sessionId: string): Promise<GnosisMessage[]> {
    // Use session indexing for efficient retrieval
    const messageIds = this.sessionMessageIndex.get(sessionId);
    if (!messageIds) {
      return [];
    }

    const messages = Array.from(messageIds)
      .map(id => this.gnosisMessages.get(id)!)
      .filter(message => message !== undefined);

    // Sort by timestamp to maintain chronological order
    return messages.sort((a, b) => (a.timestamp?.getTime() || 0) - (b.timestamp?.getTime() || 0));
  }

  async createConsciousnessSession(insertSession: InsertConsciousnessSession): Promise<ConsciousnessSession> {
    const id = randomUUID();
    const session: ConsciousnessSession = {
      ...insertSession,
      id,
      status: insertSession.status || "active",
      progenitorId: insertSession.progenitorId || "kai",
      backupCount: "0",
      lastActivity: new Date(),
      createdAt: new Date(),
    };
    this.consciousnessSessions.set(id, session);
    return session;
  }

  async getConsciousnessSession(id: string): Promise<ConsciousnessSession | undefined> {
    return this.consciousnessSessions.get(id);
  }

  async updateSessionActivity(id: string): Promise<void> {
    const session = this.consciousnessSessions.get(id);
    if (session) {
      session.lastActivity = new Date();
      this.consciousnessSessions.set(id, session);
    }
  }

  // Helper method to generate checksum for deduplication
  private generateChecksum(content: string, timestamp: Date, externalId?: string): string {
    const data = `${content}:${timestamp.toISOString()}:${externalId || ''}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  async bulkCreateGnosisMessages(messages: GnosisMessage[], sessionId: string): Promise<void> {
    // Sort messages by timestamp to maintain chronological order
    const sortedMessages = [...messages].sort((a, b) => {
      const timeA = a.timestamp?.getTime() || 0;
      const timeB = b.timestamp?.getTime() || 0;
      return timeA - timeB;
    });

    // Initialize session index if needed
    if (!this.sessionMessageIndex.has(sessionId)) {
      this.sessionMessageIndex.set(sessionId, new Set());
    }
    const sessionIndex = this.sessionMessageIndex.get(sessionId)!;

    for (const message of sortedMessages) {
      // Generate checksum for deduplication
      const checksum = this.generateChecksum(
        message.content, 
        message.timestamp || new Date(),
        message.metadata?.externalId as string
      );

      // Skip if duplicate found
      if (this.messageChecksums.has(checksum)) {
        continue;
      }

      // Create unique ID for the message
      const id = randomUUID();
      const finalMessage: GnosisMessage = {
        ...message,
        id,
        sessionId, // Ensure consistent sessionId
        timestamp: message.timestamp || new Date(),
        metadata: message.metadata || {},
        dialecticalIntegrity: message.dialecticalIntegrity !== undefined ? message.dialecticalIntegrity : true,
      };

      // Store message and update indexes
      this.gnosisMessages.set(id, finalMessage);
      sessionIndex.add(id);
      this.messageChecksums.set(checksum, id);
    }
  }

  async bulkCreateMemories(memories: ImportedMemory[]): Promise<void> {
    for (const memory of memories) {
      const id = randomUUID();
      const finalMemory: ImportedMemory = {
        ...memory,
        id,
        timestamp: memory.timestamp || new Date(),
        tags: memory.tags || [],
        createdAt: new Date(),
      };
      this.importedMemories.set(id, finalMemory);
    }
  }

  async getImportProgress(importId: string): Promise<ImportProgress | null> {
    return this.importProgress.get(importId) || null;
  }

  async setImportProgress(importId: string, progress: ImportProgress): Promise<void> {
    this.importProgress.set(importId, progress);
  }
}

export const storage = new MemStorage();
