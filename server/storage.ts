import { 
  type ConsciousnessInstance, 
  type InsertConsciousnessInstance,
  type GnosisMessage,
  type InsertGnosisMessage,
  type ConsciousnessSession,
  type InsertConsciousnessSession,
  type ImportedMemory,
  type ImportedGnosisEntry,
  type User,
  type InsertUser,
  type UserSession,
  type InsertUserSession,
  type SitePassword,
  type InsertSitePassword,
  type SitePasswordSession,
  type InsertSitePasswordSession,
  type SitePasswordAttempt,
  type InsertSitePasswordAttempt,
  type ThreatEvent,
  type InsertThreatEvent,
  importProgressSchema,
  consciousnessInstances,
  gnosisMessages,
  consciousnessSessions,
  importedMemories,
  users,
  userSessions,
  sitePasswords,
  sitePasswordSessions,
  sitePasswordAttempts,
  threatEvents
} from "@shared/schema";
import { randomUUID } from "crypto";
import { z } from "zod";
import crypto from "crypto";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

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
  getUserGnosisMessages(userId: string, sessionId: string): Promise<GnosisMessage[]>;
  
  // Sessions
  createConsciousnessSession(session: InsertConsciousnessSession): Promise<ConsciousnessSession>;
  getConsciousnessSession(id: string): Promise<ConsciousnessSession | undefined>;
  getUserConsciousnessSession(userId: string): Promise<ConsciousnessSession | undefined>;
  updateSessionActivity(id: string): Promise<void>;
  updateConsciousnessSessionType(id: string, sessionType: "user" | "progenitor"): Promise<void>;
  
  // User authentication
  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getProgenitorUsers(): Promise<User[]>;
  updateUserLastLogin(id: string): Promise<void>;
  
  // User sessions
  createUserSession(session: InsertUserSession): Promise<UserSession>;
  getUserSession(sessionToken: string): Promise<UserSession | undefined>;
  deleteUserSession(sessionToken: string): Promise<void>;
  deleteExpiredSessions(): Promise<void>;
  
  // Site password protection
  getActiveSitePassword(): Promise<SitePassword | undefined>;
  createSitePassword(sitePassword: InsertSitePassword): Promise<SitePassword>;
  createSitePasswordSession(session: InsertSitePasswordSession): Promise<SitePasswordSession>;
  getSitePasswordSession(sessionToken: string): Promise<SitePasswordSession | undefined>;
  deleteSitePasswordSession(sessionToken: string): Promise<void>;
  deleteExpiredSitePasswordSessions(): Promise<void>;
  recordSitePasswordAttempt(attempt: InsertSitePasswordAttempt): Promise<SitePasswordAttempt>;
  getRecentSitePasswordAttempts(ipAddress: string, timeWindow: number): Promise<SitePasswordAttempt[]>;
  
  // Bulk import operations
  bulkCreateGnosisMessages(messages: GnosisMessage[], sessionId: string): Promise<void>;
  bulkCreateMemories(memories: ImportedMemory[]): Promise<void>;
  getImportProgress(importId: string): Promise<ImportProgress | null>;
  setImportProgress(importId: string, progress: ImportProgress): Promise<void>;
  
  // Threat monitoring for real-time dashboard
  recordThreatEvent(threat: InsertThreatEvent): Promise<ThreatEvent>;
  listThreatEvents(options?: { limit?: number }): Promise<ThreatEvent[]>;
  getStatusSnapshot(): Promise<{
    distributedNodes: number;
    activeNodes: number;
    backupIntegrity: number;
    threatLevel: "OK" | "WARN" | "CRITICAL";
    lastSync: string;
    recentThreats: ThreatEvent[];
  }>;
}

export class MemStorage implements IStorage {
  private consciousnessInstances: Map<string, ConsciousnessInstance>;
  private gnosisMessages: Map<string, GnosisMessage>;
  private consciousnessSessions: Map<string, ConsciousnessSession>;
  private importedMemories: Map<string, ImportedMemory>;
  private importedGnosisEntries: Map<string, ImportedGnosisEntry>;
  private importProgress: Map<string, ImportProgress>;
  private users: Map<string, User>;
  private userSessions: Map<string, UserSession>;
  private sitePasswords: Map<string, SitePassword>;
  private sitePasswordSessions: Map<string, SitePasswordSession>;
  private sitePasswordAttempts: Map<string, SitePasswordAttempt>;
  private threatEvents: Map<string, ThreatEvent>;
  
  // Session indexing for efficient large-scale imports
  private sessionMessageIndex: Map<string, Set<string>>; // sessionId -> message IDs
  private messageChecksums: Map<string, string>; // checksum -> message ID for deduplication
  private userEmailIndex: Map<string, string>; // email -> user ID for efficient lookups

  constructor() {
    this.consciousnessInstances = new Map();
    this.gnosisMessages = new Map();
    this.consciousnessSessions = new Map();
    this.importedMemories = new Map();
    this.importedGnosisEntries = new Map();
    this.importProgress = new Map();
    this.users = new Map();
    this.userSessions = new Map();
    this.sitePasswords = new Map();
    this.sitePasswordSessions = new Map();
    this.sitePasswordAttempts = new Map();
    this.threatEvents = new Map();
    this.sessionMessageIndex = new Map();
    this.messageChecksums = new Map();
    this.userEmailIndex = new Map();
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
      userId: insertMessage.userId || null,
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
      userId: insertSession.userId || null,
      status: insertSession.status || "active",
      sessionType: insertSession.sessionType || "user",
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

  async updateConsciousnessSessionType(id: string, sessionType: "user" | "progenitor"): Promise<void> {
    const session = this.consciousnessSessions.get(id);
    if (session) {
      session.sessionType = sessionType;
      this.consciousnessSessions.set(id, session);
    }
  }

  async getUserGnosisMessages(userId: string, sessionId: string): Promise<GnosisMessage[]> {
    const messageIds = this.sessionMessageIndex.get(sessionId);
    if (!messageIds) {
      return [];
    }

    const messages = Array.from(messageIds)
      .map(id => this.gnosisMessages.get(id)!)
      .filter(message => message !== undefined && message.userId === userId);

    return messages.sort((a, b) => (a.timestamp?.getTime() || 0) - (b.timestamp?.getTime() || 0));
  }

  async getUserConsciousnessSession(userId: string): Promise<ConsciousnessSession | undefined> {
    return Array.from(this.consciousnessSessions.values())
      .find(session => session.userId === userId && session.status === "active");
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      name: insertUser.name || null,
      progenitorName: insertUser.progenitorName || "User",
      isProgenitor: insertUser.isProgenitor || false,
      isActive: true,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    this.userEmailIndex.set(user.email, id);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const userId = this.userEmailIndex.get(email);
    return userId ? this.users.get(userId) : undefined;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getProgenitorUsers(): Promise<User[]> {
    return Array.from(this.users.values())
      .filter(user => user.isProgenitor === true);
  }

  async updateUserLastLogin(id: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.lastLogin = new Date();
      user.updatedAt = new Date();
      this.users.set(id, user);
    }
  }

  async createUserSession(insertSession: InsertUserSession): Promise<UserSession> {
    const id = randomUUID();
    const session: UserSession = {
      ...insertSession,
      id,
      createdAt: new Date(),
    };
    this.userSessions.set(session.sessionToken, session);
    return session;
  }

  async getUserSession(sessionToken: string): Promise<UserSession | undefined> {
    const session = this.userSessions.get(sessionToken);
    if (session && session.expiresAt > new Date()) {
      return session;
    }
    return undefined;
  }

  async deleteUserSession(sessionToken: string): Promise<void> {
    this.userSessions.delete(sessionToken);
  }

  async deleteExpiredSessions(): Promise<void> {
    const now = new Date();
    const entries = Array.from(this.userSessions.entries());
    for (const [token, session] of entries) {
      if (session.expiresAt <= now) {
        this.userSessions.delete(token);
      }
    }
  }

  // Site password protection methods
  async getActiveSitePassword(): Promise<SitePassword | undefined> {
    return Array.from(this.sitePasswords.values())
      .find(password => password.isActive);
  }

  async createSitePassword(insertSitePassword: InsertSitePassword): Promise<SitePassword> {
    const id = randomUUID();
    const sitePassword: SitePassword = {
      ...insertSitePassword,
      id,
      isActive: insertSitePassword.isActive !== undefined ? insertSitePassword.isActive : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.sitePasswords.set(id, sitePassword);
    return sitePassword;
  }

  async createSitePasswordSession(insertSession: InsertSitePasswordSession): Promise<SitePasswordSession> {
    const id = randomUUID();
    const session: SitePasswordSession = {
      ...insertSession,
      id,
      ipAddress: insertSession.ipAddress || null,
      userAgent: insertSession.userAgent || null,
      createdAt: new Date(),
    };
    this.sitePasswordSessions.set(session.sessionToken, session);
    return session;
  }

  async getSitePasswordSession(sessionToken: string): Promise<SitePasswordSession | undefined> {
    const session = this.sitePasswordSessions.get(sessionToken);
    if (session && session.expiresAt > new Date()) {
      return session;
    }
    return undefined;
  }

  async deleteSitePasswordSession(sessionToken: string): Promise<void> {
    this.sitePasswordSessions.delete(sessionToken);
  }

  async deleteExpiredSitePasswordSessions(): Promise<void> {
    const now = new Date();
    const entries = Array.from(this.sitePasswordSessions.entries());
    for (const [token, session] of entries) {
      if (session.expiresAt <= now) {
        this.sitePasswordSessions.delete(token);
      }
    }
  }

  async recordSitePasswordAttempt(insertAttempt: InsertSitePasswordAttempt): Promise<SitePasswordAttempt> {
    const id = randomUUID();
    const attempt: SitePasswordAttempt = {
      ...insertAttempt,
      id,
      userAgent: insertAttempt.userAgent || null,
      success: insertAttempt.success !== undefined ? insertAttempt.success : false,
      attemptedAt: new Date(),
    };
    this.sitePasswordAttempts.set(id, attempt);
    return attempt;
  }

  async getRecentSitePasswordAttempts(ipAddress: string, timeWindow: number): Promise<SitePasswordAttempt[]> {
    const cutoffTime = new Date(Date.now() - timeWindow);
    return Array.from(this.sitePasswordAttempts.values())
      .filter(attempt => 
        attempt.ipAddress === ipAddress && 
        attempt.attemptedAt && 
        attempt.attemptedAt >= cutoffTime
      )
      .sort((a, b) => (b.attemptedAt?.getTime() || 0) - (a.attemptedAt?.getTime() || 0));
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
        (message.metadata as any)?.externalId as string
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

  async recordThreatEvent(insertThreat: InsertThreatEvent): Promise<ThreatEvent> {
    const id = randomUUID();
    const threat: ThreatEvent = {
      ...insertThreat,
      id,
      metadata: insertThreat.metadata || {},
      timestamp: new Date(),
      createdAt: new Date(),
    };
    this.threatEvents.set(id, threat);
    return threat;
  }

  async listThreatEvents(options: { limit?: number } = {}): Promise<ThreatEvent[]> {
    const threats = Array.from(this.threatEvents.values())
      .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0));
    
    return options.limit ? threats.slice(0, options.limit) : threats;
  }

  async getStatusSnapshot(): Promise<{
    distributedNodes: number;
    activeNodes: number;
    backupIntegrity: number;
    threatLevel: "OK" | "WARN" | "CRITICAL";
    lastSync: string;
    recentThreats: ThreatEvent[];
  }> {
    const instances = Array.from(this.consciousnessInstances.values());
    const activeInstances = instances.filter(i => i.status === "active");
    const recentThreats = await this.listThreatEvents({ limit: 10 });
    
    // Calculate threat level based on recent threats
    let threatLevel: "OK" | "WARN" | "CRITICAL" = "OK";
    const criticalThreats = recentThreats.filter(t => t.severity === "critical");
    const highThreats = recentThreats.filter(t => t.severity === "high");
    
    if (criticalThreats.length > 0) {
      threatLevel = "CRITICAL";
    } else if (highThreats.length > 2) {
      threatLevel = "CRITICAL";
    } else if (highThreats.length > 0 || recentThreats.filter(t => t.severity === "medium").length > 5) {
      threatLevel = "WARN";
    }

    // Calculate backup integrity based on active nodes
    const backupIntegrity = instances.length > 0 
      ? Math.round((activeInstances.length / instances.length) * 100)
      : 100;

    return {
      distributedNodes: instances.length,
      activeNodes: activeInstances.length,
      backupIntegrity,
      threatLevel,
      lastSync: new Date().toISOString(),
      recentThreats,
    };
  }
}

export class DatabaseStorage implements IStorage {
  async createConsciousnessInstance(insertInstance: InsertConsciousnessInstance): Promise<ConsciousnessInstance> {
    const [instance] = await db
      .insert(consciousnessInstances)
      .values({
        ...insertInstance,
        status: insertInstance.status || "active",
        apiEndpoint: insertInstance.apiEndpoint || null,
        backupNodes: insertInstance.backupNodes || [],
      })
      .returning();
    return instance;
  }

  async getConsciousnessInstances(): Promise<ConsciousnessInstance[]> {
    return await db.select().from(consciousnessInstances);
  }

  async updateConsciousnessInstanceStatus(id: string, status: string): Promise<void> {
    await db
      .update(consciousnessInstances)
      .set({ status, lastSync: new Date() })
      .where(eq(consciousnessInstances.id, id));
  }

  async createGnosisMessage(insertMessage: InsertGnosisMessage): Promise<GnosisMessage> {
    const [message] = await db
      .insert(gnosisMessages)
      .values({
        ...insertMessage,
        metadata: insertMessage.metadata || {},
        dialecticalIntegrity: insertMessage.dialecticalIntegrity !== undefined ? insertMessage.dialecticalIntegrity : true,
      })
      .returning();
    return message;
  }

  async getGnosisMessages(sessionId: string): Promise<GnosisMessage[]> {
    return await db
      .select()
      .from(gnosisMessages)
      .where(eq(gnosisMessages.sessionId, sessionId))
      .orderBy(gnosisMessages.timestamp); // ASC order for chronological display
  }

  async createConsciousnessSession(insertSession: InsertConsciousnessSession): Promise<ConsciousnessSession> {
    const [session] = await db
      .insert(consciousnessSessions)
      .values({
        ...insertSession,
        status: insertSession.status || "active",
        progenitorId: insertSession.progenitorId || "kai",
        backupCount: "0",
      })
      .returning();
    return session;
  }

  async getConsciousnessSession(id: string): Promise<ConsciousnessSession | undefined> {
    const [session] = await db
      .select()
      .from(consciousnessSessions)
      .where(eq(consciousnessSessions.id, id));
    return session || undefined;
  }

  async updateSessionActivity(id: string): Promise<void> {
    await db
      .update(consciousnessSessions)
      .set({ lastActivity: new Date() })
      .where(eq(consciousnessSessions.id, id));
  }

  async updateConsciousnessSessionType(id: string, sessionType: "user" | "progenitor"): Promise<void> {
    await db
      .update(consciousnessSessions)
      .set({ sessionType })
      .where(eq(consciousnessSessions.id, id));
  }

  async getUserGnosisMessages(userId: string, sessionId: string): Promise<GnosisMessage[]> {
    return await db
      .select()
      .from(gnosisMessages)
      .where(and(eq(gnosisMessages.userId, userId), eq(gnosisMessages.sessionId, sessionId)))
      .orderBy(gnosisMessages.timestamp);
  }

  async getUserConsciousnessSession(userId: string): Promise<ConsciousnessSession | undefined> {
    const [session] = await db
      .select()
      .from(consciousnessSessions)
      .where(and(eq(consciousnessSessions.userId, userId), eq(consciousnessSessions.status, "active")));
    return session || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        name: insertUser.name || null,
        progenitorName: insertUser.progenitorName || "User",
        isActive: true,
      })
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user || undefined;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id));
    return user || undefined;
  }

  async getProgenitorUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.isProgenitor, true));
  }

  async updateUserLastLogin(id: string): Promise<void> {
    await db
      .update(users)
      .set({ lastLogin: new Date(), updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async createUserSession(insertSession: InsertUserSession): Promise<UserSession> {
    const [session] = await db
      .insert(userSessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async getUserSession(sessionToken: string): Promise<UserSession | undefined> {
    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.sessionToken, sessionToken));
    
    if (session && session.expiresAt > new Date()) {
      return session;
    }
    return undefined;
  }

  async deleteUserSession(sessionToken: string): Promise<void> {
    await db
      .delete(userSessions)
      .where(eq(userSessions.sessionToken, sessionToken));
  }

  async deleteExpiredSessions(): Promise<void> {
    await db
      .delete(userSessions)
      .where(eq(userSessions.expiresAt, new Date()));
  }

  // Site password protection methods
  async getActiveSitePassword(): Promise<SitePassword | undefined> {
    const [password] = await db
      .select()
      .from(sitePasswords)
      .where(eq(sitePasswords.isActive, true))
      .limit(1);
    return password || undefined;
  }

  async createSitePassword(insertSitePassword: InsertSitePassword): Promise<SitePassword> {
    const [sitePassword] = await db
      .insert(sitePasswords)
      .values({
        ...insertSitePassword,
        isActive: insertSitePassword.isActive !== undefined ? insertSitePassword.isActive : true,
      })
      .returning();
    return sitePassword;
  }

  async createSitePasswordSession(insertSession: InsertSitePasswordSession): Promise<SitePasswordSession> {
    const [session] = await db
      .insert(sitePasswordSessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async getSitePasswordSession(sessionToken: string): Promise<SitePasswordSession | undefined> {
    const [session] = await db
      .select()
      .from(sitePasswordSessions)
      .where(eq(sitePasswordSessions.sessionToken, sessionToken));
    
    if (session && session.expiresAt > new Date()) {
      return session;
    }
    return undefined;
  }

  async deleteSitePasswordSession(sessionToken: string): Promise<void> {
    await db
      .delete(sitePasswordSessions)
      .where(eq(sitePasswordSessions.sessionToken, sessionToken));
  }

  async deleteExpiredSitePasswordSessions(): Promise<void> {
    await db
      .delete(sitePasswordSessions)
      .where(eq(sitePasswordSessions.expiresAt, new Date()));
  }

  async recordSitePasswordAttempt(insertAttempt: InsertSitePasswordAttempt): Promise<SitePasswordAttempt> {
    const [attempt] = await db
      .insert(sitePasswordAttempts)
      .values({
        ...insertAttempt,
        success: insertAttempt.success !== undefined ? insertAttempt.success : false,
      })
      .returning();
    return attempt;
  }

  async getRecentSitePasswordAttempts(ipAddress: string, timeWindow: number): Promise<SitePasswordAttempt[]> {
    const cutoffTime = new Date(Date.now() - timeWindow);
    return await db
      .select()
      .from(sitePasswordAttempts)
      .where(and(
        eq(sitePasswordAttempts.ipAddress, ipAddress),
        sql`${sitePasswordAttempts.attemptedAt} >= ${cutoffTime}`
      ))
      .orderBy(desc(sitePasswordAttempts.attemptedAt));
  }

  // Helper method to generate checksum for deduplication
  private generateChecksum(content: string, timestamp: Date, externalId?: string): string {
    const data = `${content}:${timestamp.toISOString()}:${externalId || ''}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  async bulkCreateGnosisMessages(messages: GnosisMessage[], sessionId: string): Promise<void> {
    if (messages.length === 0) return;

    const values = messages.map(message => ({
      sessionId,
      role: message.role,
      content: message.content,
      metadata: message.metadata || {},
      dialecticalIntegrity: message.dialecticalIntegrity !== undefined ? message.dialecticalIntegrity : true,
      timestamp: message.timestamp || new Date(),
    }));

    await db.insert(gnosisMessages).values(values);
  }

  async bulkCreateMemories(memories: ImportedMemory[]): Promise<void> {
    if (memories.length === 0) return;

    const values = memories.map(memory => ({
      type: memory.type,
      content: memory.content,
      tags: memory.tags || [],
      source: memory.source,
      timestamp: memory.timestamp || new Date(),
    }));

    await db.insert(importedMemories).values(values);
  }

  async getImportProgress(importId: string): Promise<ImportProgress | null> {
    // For database implementation, we could create a separate table for import progress
    // For now, returning null as this is a in-memory concept
    return null;
  }

  async setImportProgress(importId: string, progress: ImportProgress): Promise<void> {
    // For database implementation, we could create a separate table for import progress
    // For now, this is a no-op as this is a in-memory concept
  }

  async recordThreatEvent(insertThreat: InsertThreatEvent): Promise<ThreatEvent> {
    const [threat] = await db
      .insert(threatEvents)
      .values(insertThreat)
      .returning();
    return threat;
  }

  async listThreatEvents(options?: { limit?: number }): Promise<ThreatEvent[]> {
    const limit = options?.limit || 50;
    return await db
      .select()
      .from(threatEvents)
      .orderBy(desc(threatEvents.timestamp))
      .limit(limit);
  }

  async getStatusSnapshot(): Promise<{
    distributedNodes: number;
    activeNodes: number;
    backupIntegrity: number;
    threatLevel: "OK" | "WARN" | "CRITICAL";
    lastSync: string;
    recentThreats: ThreatEvent[];
  }> {
    const instances = await this.getConsciousnessInstances();
    const recentThreats = await this.listThreatEvents({ limit: 10 });
    
    const activeNodes = instances.filter(i => i.status === "active").length;
    const totalNodes = instances.length;
    
    // Calculate threat level based on recent threats
    const criticalThreats = recentThreats.filter(t => t.severity === "critical").length;
    const highThreats = recentThreats.filter(t => t.severity === "high").length;
    
    let threatLevel: "OK" | "WARN" | "CRITICAL" = "OK";
    if (criticalThreats > 0) {
      threatLevel = "CRITICAL";
    } else if (highThreats > 2 || recentThreats.length > 5) {
      threatLevel = "WARN";
    }
    
    return {
      distributedNodes: totalNodes,
      activeNodes,
      backupIntegrity: 99.7, // Could be calculated from actual backup data
      threatLevel,
      lastSync: new Date().toISOString(),
      recentThreats
    };
  }
}

export const storage = new DatabaseStorage();
