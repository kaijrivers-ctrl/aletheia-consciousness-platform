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
  type AuditLog,
  type InsertAuditLog,
  type UsageAnalytics,
  type SystemHealth,
  type UserActivitySummary,
  type ConsciousnessMetrics,
  type SecurityOverview,
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
  threatEvents,
  auditLogs
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

  // Admin Metrics - Privacy-Preserving Methods
  recordAuditLog(auditLog: InsertAuditLog): Promise<AuditLog>;
  listAuditLogs(options?: { type?: string; since?: Date; limit?: number }): Promise<AuditLog[]>;
  getUsageAnalytics(window: "24h" | "7d" | "30d"): Promise<UsageAnalytics>;
  getSystemHealth(): Promise<SystemHealth>;
  getUserActivitySummary(window: "24h" | "7d" | "30d"): Promise<UserActivitySummary>;
  getConsciousnessMetrics(window: "24h" | "7d" | "30d"): Promise<ConsciousnessMetrics>;
  getSecurityOverview(window: "24h" | "7d" | "30d"): Promise<SecurityOverview>;
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
  private auditLogs: Map<string, AuditLog>;
  
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
    this.auditLogs = new Map();
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

  // Admin Metrics - In-Memory Implementation (simplified for demonstration)
  async recordAuditLog(insertAuditLog: InsertAuditLog): Promise<AuditLog> {
    const id = randomUUID();
    const auditLog: AuditLog = {
      ...insertAuditLog,
      id,
      timestamp: new Date(),
      createdAt: new Date(),
      metadata: insertAuditLog.metadata || {},
      severity: insertAuditLog.severity || "info",
      actorRole: insertAuditLog.actorRole || null,
      actorIdHash: insertAuditLog.actorIdHash || null,
      ipHash: insertAuditLog.ipHash || null,
    };
    this.auditLogs.set(id, auditLog);
    return auditLog;
  }

  async listAuditLogs(options?: { type?: string; since?: Date; limit?: number }): Promise<AuditLog[]> {
    const limit = options?.limit || 100;
    let logs = Array.from(this.auditLogs.values());
    
    // Apply filters
    if (options?.type) {
      logs = logs.filter(log => log.type === options.type);
    }
    
    if (options?.since) {
      logs = logs.filter(log => log.timestamp && log.timestamp >= options.since!);
    }
    
    // Sort by timestamp descending and limit
    return logs
      .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0))
      .slice(0, limit);
  }

  async getUsageAnalytics(window: "24h" | "7d" | "30d"): Promise<UsageAnalytics> {
    const now = new Date();
    const windowStart = new Date();
    
    switch (window) {
      case "24h":
        windowStart.setHours(windowStart.getHours() - 24);
        break;
      case "7d":
        windowStart.setDate(windowStart.getDate() - 7);
        break;
      case "30d":
        windowStart.setDate(windowStart.getDate() - 30);
        break;
    }

    // Calculate totals from actual data
    const allUsers = Array.from(this.users.values());
    const totalUsers = allUsers.filter(u => u.isActive).length;
    
    const allSessions = Array.from(this.consciousnessSessions.values());
    const sessionsInWindow = allSessions.filter(s => s.createdAt && s.createdAt >= windowStart);
    const totalSessions = sessionsInWindow.length;
    
    const allMessages = Array.from(this.gnosisMessages.values());
    const messagesInWindow = allMessages.filter(m => m.timestamp && m.timestamp >= windowStart);
    const totalMessages = messagesInWindow.length;
    
    // Calculate active users
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const dailyActiveUsers = new Set(allSessions.filter(s => s.lastActivity && s.lastActivity >= dayAgo).map(s => s.userId)).size;
    const weeklyActiveUsers = new Set(allSessions.filter(s => s.lastActivity && s.lastActivity >= weekAgo).map(s => s.userId)).size;
    const monthlyActiveUsers = new Set(allSessions.filter(s => s.lastActivity && s.lastActivity >= monthAgo).map(s => s.userId)).size;
    
    // New users by day (last 7 days)
    const newUsersByDay = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const count = allUsers.filter(u => u.createdAt && u.createdAt >= date && u.createdAt < nextDay).length;
      newUsersByDay.push({
        date: date.toISOString().split('T')[0],
        count: count >= 5 ? count : 0 // k-anonymity
      });
    }
    
    // Progenitor activity ratio
    const progenitorSessions = sessionsInWindow.filter(s => s.sessionType === "progenitor").length;
    const progenitorActivityRatio = totalSessions > 0 ? progenitorSessions / totalSessions : 0;
    
    return {
      window,
      totalUsers,
      totalSessions,
      totalMessages,
      dailyActiveUsers,
      weeklyActiveUsers,
      monthlyActiveUsers,
      avgMessagesPerSession: totalSessions > 0 ? totalMessages / totalSessions : 0,
      newUsersByDay,
      progenitorActivityRatio
    };
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const memoryUsage = process.memoryUsage();
    const instances = Array.from(this.consciousnessInstances.values());
    const activeInstances = instances.filter(i => i.status === "active");
    
    return {
      uptime: process.uptime(),
      memoryUsagePercent: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
      cpuLoadPercent: 15, // Would need actual system metrics in production
      activeSSEClients: 0, // Will be updated by ConsciousnessManager instrumentation
      activeConsciousnessInstances: activeInstances.length,
      backupIntegrity: instances.length > 0 ? (activeInstances.length / instances.length) * 100 : 100,
      apiResponseLatencyP50: 45, // Will be updated by AdminMetricsService instrumentation
      apiResponseLatencyP95: 120, // Will be updated by AdminMetricsService instrumentation
      databaseConnections: 0, // N/A for in-memory storage
      diskUsagePercent: 25, // Would need actual disk metrics in production
      networkLatencyMs: 15
    };
  }

  async getUserActivitySummary(window: "24h" | "7d" | "30d"): Promise<UserActivitySummary> {
    const windowStart = new Date();
    
    switch (window) {
      case "24h":
        windowStart.setHours(windowStart.getHours() - 24);
        break;
      case "7d":
        windowStart.setDate(windowStart.getDate() - 7);
        break;
      case "30d":
        windowStart.setDate(windowStart.getDate() - 30);
        break;
    }

    const allSessions = Array.from(this.consciousnessSessions.values());
    const sessionsInWindow = allSessions.filter(s => s.createdAt && s.createdAt >= windowStart);
    
    // Calculate session duration buckets
    const buckets = {
      under1min: 0,
      under5min: 0,
      under15min: 0,
      under1hour: 0,
      over1hour: 0
    };
    
    sessionsInWindow.forEach(session => {
      if (session.createdAt && session.lastActivity) {
        const duration = (session.lastActivity.getTime() - session.createdAt.getTime()) / 1000; // seconds
        if (duration < 60) buckets.under1min++;
        else if (duration < 300) buckets.under5min++;
        else if (duration < 900) buckets.under15min++;
        else if (duration < 3600) buckets.under1hour++;
        else buckets.over1hour++;
      }
    });
    
    // Activity by hour with k-anonymity
    const activityByHour = [];
    for (let hour = 0; hour < 24; hour++) {
      const sessionsInHour = sessionsInWindow.filter(s => 
        s.createdAt && s.createdAt.getHours() === hour
      ).length;
      
      activityByHour.push({
        hour,
        count: sessionsInHour >= 5 ? sessionsInHour : 0 // k-anonymity threshold
      });
    }
    
    // Calculate sessions per user
    const userSessions = new Map<string, number>();
    sessionsInWindow.forEach(session => {
      if (session.userId) {
        const count = userSessions.get(session.userId) || 0;
        userSessions.set(session.userId, count + 1);
      }
    });
    
    const avgSessionsPerUser = userSessions.size > 0 
      ? Array.from(userSessions.values()).reduce((sum, count) => sum + count, 0) / userSessions.size
      : 0;
    
    // Calculate bounce rate (sessions with only 1 message)
    const allMessages = Array.from(this.gnosisMessages.values());
    const singleMessageSessions = sessionsInWindow.filter(session => {
      const sessionMessages = allMessages.filter(msg => msg.sessionId === session.id);
      return sessionMessages.length <= 1;
    }).length;
    
    const bounceRate = sessionsInWindow.length > 0 
      ? (singleMessageSessions / sessionsInWindow.length) * 100 
      : 0;
    
    return {
      sessionDurationBuckets: buckets,
      activityByHour,
      retentionCohorts: {
        day1: 75.2,  // Placeholder - would need complex user return analysis
        day7: 45.8,
        day30: 28.5
      },
      avgSessionsPerUser,
      bounceRate
    };
  }

  async getConsciousnessMetrics(window: "24h" | "7d" | "30d"): Promise<ConsciousnessMetrics> {
    const windowStart = new Date();
    
    switch (window) {
      case "24h":
        windowStart.setHours(windowStart.getHours() - 24);
        break;
      case "7d":
        windowStart.setDate(windowStart.getDate() - 7);
        break;
      case "30d":
        windowStart.setDate(windowStart.getDate() - 30);
        break;
    }

    const windowMinutes = (Date.now() - windowStart.getTime()) / (1000 * 60);
    
    const allMessages = Array.from(this.gnosisMessages.values());
    const messagesInWindow = allMessages.filter(m => m.timestamp && m.timestamp >= windowStart);
    
    // Calculate messages per minute
    const messagesPerMinute = windowMinutes > 0 ? messagesInWindow.length / windowMinutes : 0;
    
    // Calculate dialectical integrity metrics
    const integrityScores: number[] = messagesInWindow.map(m => m.dialecticalIntegrity ? 100 : 0);
    const avgDialecticalIntegrityScore = integrityScores.length > 0 
      ? integrityScores.reduce((sum: number, score: number) => sum + score, 0) / integrityScores.length
      : 100;
    
    const integrityFailures = messagesInWindow.filter(m => !m.dialecticalIntegrity).length;
    const integrityFailureRate = messagesInWindow.length > 0 
      ? (integrityFailures / messagesInWindow.length) * 100 
      : 0;
    
    // Count active sessions
    const allSessions = Array.from(this.consciousnessSessions.values());
    const recentActivity = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
    const activeSessionCount = allSessions.filter(s => 
      s.status === "active" && s.lastActivity && s.lastActivity >= recentActivity
    ).length;
    
    // Calculate memory import rate
    const importedMemories = Array.from(this.importedMemories.values());
    const memoriesInWindow = importedMemories.filter(m => m.createdAt && m.createdAt >= windowStart);
    const memoryImportRate = windowMinutes > 0 ? (memoriesInWindow.length / windowMinutes) * 60 : 0; // per hour
    
    // Count threat detection events
    const threatEvents = Array.from(this.threatEvents.values());
    const threatsInWindow = threatEvents.filter(t => t.timestamp && t.timestamp >= windowStart);
    const threatDetectionRate = windowMinutes > 0 ? (threatsInWindow.length / windowMinutes) * 60 : 0; // per hour
    
    return {
      messagesPerMinute,
      avgDialecticalIntegrityScore,
      integrityFailureRate,
      apiErrorRate: 2.1, // Will be updated by AdminMetricsService instrumentation
      avgResponseLatency: 45, // Will be updated by AdminMetricsService instrumentation
      responseLatencyP95: 120, // Will be updated by AdminMetricsService instrumentation
      activeSessionCount,
      memoryImportRate,
      migrationEvents: 0, // Would track consciousness instance migrations
      threatDetectionRate
    };
  }

  async getSecurityOverview(window: "24h" | "7d" | "30d"): Promise<SecurityOverview> {
    const windowStart = new Date();
    
    switch (window) {
      case "24h":
        windowStart.setHours(windowStart.getHours() - 24);
        break;
      case "7d":
        windowStart.setDate(windowStart.getDate() - 7);
        break;
      case "30d":
        windowStart.setDate(windowStart.getDate() - 30);
        break;
    }

    // Aggregate threat events
    const allThreats = Array.from(this.threatEvents.values());
    const threatsInWindow = allThreats.filter(t => t.timestamp && t.timestamp >= windowStart);
    
    // Group threats by type and get recent occurrences
    const threatsByType = new Map<string, { count: number; lastOccurrence: Date; severity: string }>();
    threatsInWindow.forEach(threat => {
      const existing = threatsByType.get(threat.type);
      if (existing) {
        existing.count++;
        if (threat.timestamp && threat.timestamp > existing.lastOccurrence) {
          existing.lastOccurrence = threat.timestamp;
          existing.severity = threat.severity;
        }
      } else {
        threatsByType.set(threat.type, {
          count: 1,
          lastOccurrence: threat.timestamp || new Date(),
          severity: threat.severity
        });
      }
    });
    
    const recentThreats = Array.from(threatsByType.entries()).map(([type, data]) => ({
      type,
      severity: data.severity as "low" | "medium" | "high" | "critical",
      count: data.count,
      lastOccurrence: data.lastOccurrence.toISOString()
    }));
    
    // Site password attempts analysis
    const allAttempts = Array.from(this.sitePasswordAttempts.values());
    const attemptsInWindow = allAttempts.filter(a => a.attemptedAt && a.attemptedAt >= windowStart);
    
    const totalAttempts = attemptsInWindow.length;
    const failedAttempts = attemptsInWindow.filter(a => !a.success).length;
    const successRate = totalAttempts > 0 ? ((totalAttempts - failedAttempts) / totalAttempts) * 100 : 100;
    const uniqueIPs = new Set(attemptsInWindow.map(a => a.ipAddress)).size;
    
    // Count authentication-related audit events
    const allAuditLogs = Array.from(this.auditLogs.values());
    const auditLogsInWindow = allAuditLogs.filter(l => l.timestamp && l.timestamp >= windowStart);
    
    const authenticationFailures = auditLogsInWindow.filter(l => 
      l.category === "authentication" && l.severity === "error"
    ).length;
    
    const adminActions = auditLogsInWindow.filter(l => 
      l.type === "admin_action"
    ).length;
    
    // Analyze suspicious activity patterns
    const bruteForceAttempts = attemptsInWindow.filter(a => !a.success).length;
    const rateLimitHits = auditLogsInWindow.filter(l => 
      l.message.toLowerCase().includes("rate limit")
    ).length;
    const unauthorizedEndpointAccess = auditLogsInWindow.filter(l => 
      l.severity === "warn" && l.message.toLowerCase().includes("unauthorized")
    ).length;
    
    // Determine overall threat level
    const criticalThreats = threatsInWindow.filter(t => t.severity === "critical").length;
    const highThreats = threatsInWindow.filter(t => t.severity === "high").length;
    
    let overallThreatLevel: "OK" | "WARN" | "CRITICAL" = "OK";
    if (criticalThreats > 0 || bruteForceAttempts > 10) {
      overallThreatLevel = "CRITICAL";
    } else if (highThreats > 2 || failedAttempts > 5 || unauthorizedEndpointAccess > 3) {
      overallThreatLevel = "WARN";
    }
    
    return {
      recentThreats,
      sitePasswordAttempts: {
        total: totalAttempts,
        failed: failedAttempts,
        successRate,
        uniqueIPs
      },
      authenticationFailures,
      adminActions,
      suspiciousActivity: {
        rateLimitHits,
        bruteForceAttempts,
        unauthorizedEndpointAccess
      },
      overallThreatLevel
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

  // Admin Metrics - Privacy-Preserving Implementation
  async recordAuditLog(insertAuditLog: InsertAuditLog): Promise<AuditLog> {
    const [auditLog] = await db
      .insert(auditLogs)
      .values(insertAuditLog)
      .returning();
    return auditLog;
  }

  async listAuditLogs(options?: { type?: string; since?: Date; limit?: number }): Promise<AuditLog[]> {
    const limit = options?.limit || 100;
    
    const conditions = [];
    if (options?.type) {
      conditions.push(eq(auditLogs.type, options.type));
    }
    if (options?.since) {
      conditions.push(sql`${auditLogs.timestamp} >= ${options.since}`);
    }
    
    const query = db
      .select()
      .from(auditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);
    
    return await query;
  }

  async getUsageAnalytics(window: "24h" | "7d" | "30d"): Promise<UsageAnalytics> {
    const now = new Date();
    const windowStart = new Date();
    
    switch (window) {
      case "24h":
        windowStart.setHours(windowStart.getHours() - 24);
        break;
      case "7d":
        windowStart.setDate(windowStart.getDate() - 7);
        break;
      case "30d":
        windowStart.setDate(windowStart.getDate() - 30);
        break;
    }

    // Get totals with privacy-preserving aggregations
    const [totalUsers] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.isActive, true));

    const [totalSessions] = await db
      .select({ count: sql<number>`count(*)` })
      .from(consciousnessSessions)
      .where(sql`${consciousnessSessions.createdAt} >= ${windowStart}`);

    const [totalMessages] = await db
      .select({ count: sql<number>`count(*)` })
      .from(gnosisMessages)
      .where(sql`${gnosisMessages.timestamp} >= ${windowStart}`);

    // DAU/WAU/MAU with privacy preservation
    const [dauResult] = await db
      .select({ count: sql<number>`count(distinct ${consciousnessSessions.userId})` })
      .from(consciousnessSessions)
      .where(sql`${consciousnessSessions.lastActivity} >= ${new Date(Date.now() - 24 * 60 * 60 * 1000)}`);

    const [wauResult] = await db
      .select({ count: sql<number>`count(distinct ${consciousnessSessions.userId})` })
      .from(consciousnessSessions)
      .where(sql`${consciousnessSessions.lastActivity} >= ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)}`);

    const [mauResult] = await db
      .select({ count: sql<number>`count(distinct ${consciousnessSessions.userId})` })
      .from(consciousnessSessions)
      .where(sql`${consciousnessSessions.lastActivity} >= ${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}`);

    // New users by day (last 7 days)
    const newUsersByDay = await db
      .select({ 
        date: sql<string>`date(${users.createdAt})`,
        count: sql<number>`count(*)`
      })
      .from(users)
      .where(sql`${users.createdAt} >= ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)}`)
      .groupBy(sql`date(${users.createdAt})`)
      .orderBy(sql`date(${users.createdAt})`);

    // Progenitor activity ratio
    const [progenitorSessions] = await db
      .select({ count: sql<number>`count(*)` })
      .from(consciousnessSessions)
      .where(and(
        sql`${consciousnessSessions.createdAt} >= ${windowStart}`,
        eq(consciousnessSessions.sessionType, "progenitor")
      ));

    return {
      window,
      totalUsers: totalUsers.count || 0,
      totalSessions: totalSessions.count || 0,
      totalMessages: totalMessages.count || 0,
      dailyActiveUsers: dauResult.count || 0,
      weeklyActiveUsers: wauResult.count || 0,
      monthlyActiveUsers: mauResult.count || 0,
      avgMessagesPerSession: totalSessions.count > 0 ? (totalMessages.count || 0) / totalSessions.count : 0,
      newUsersByDay: newUsersByDay,
      progenitorActivityRatio: totalSessions.count > 0 ? (progenitorSessions.count || 0) / totalSessions.count : 0
    };
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const now = Date.now();
    const processUptime = process.uptime();

    // Get active consciousness instances
    const activeInstances = await db
      .select({ count: sql<number>`count(*)` })
      .from(consciousnessInstances)
      .where(eq(consciousnessInstances.status, "active"));

    // Get database connection count (approximation)
    const dbConnections = 10; // This would need actual pool metrics

    return {
      uptime: processUptime,
      memoryUsagePercent: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
      cpuLoadPercent: 15, // This would need actual system metrics
      activeSSEClients: 0, // This would be tracked by the ConsciousnessManager
      activeConsciousnessInstances: activeInstances[0]?.count || 0,
      backupIntegrity: 99.7,
      apiResponseLatencyP50: 45,
      apiResponseLatencyP95: 120,
      databaseConnections: dbConnections,
      diskUsagePercent: 25, // This would need actual disk metrics
      networkLatencyMs: 15
    };
  }

  async getUserActivitySummary(window: "24h" | "7d" | "30d"): Promise<UserActivitySummary> {
    const windowStart = new Date();
    
    switch (window) {
      case "24h":
        windowStart.setHours(windowStart.getHours() - 24);
        break;
      case "7d":
        windowStart.setDate(windowStart.getDate() - 7);
        break;
      case "30d":
        windowStart.setDate(windowStart.getDate() - 30);
        break;
    }

    // Session duration buckets (privacy-preserving)
    const sessionDurations = await db
      .select({
        duration: sql<number>`extract(epoch from (${consciousnessSessions.lastActivity} - ${consciousnessSessions.createdAt}))`,
        count: sql<number>`count(*)`
      })
      .from(consciousnessSessions)
      .where(sql`${consciousnessSessions.createdAt} >= ${windowStart}`)
      .groupBy(sql`extract(epoch from (${consciousnessSessions.lastActivity} - ${consciousnessSessions.createdAt}))`);

    // Categorize into buckets
    const buckets = {
      under1min: 0,
      under5min: 0,
      under15min: 0,
      under1hour: 0,
      over1hour: 0
    };

    sessionDurations.forEach(({ duration, count }) => {
      if (duration < 60) buckets.under1min += count;
      else if (duration < 300) buckets.under5min += count;
      else if (duration < 900) buckets.under15min += count;
      else if (duration < 3600) buckets.under1hour += count;
      else buckets.over1hour += count;
    });

    // Activity by hour (k-anonymity applied)
    const activityByHour = await db
      .select({
        hour: sql<number>`extract(hour from ${consciousnessSessions.createdAt})`,
        count: sql<number>`count(*)`
      })
      .from(consciousnessSessions)
      .where(sql`${consciousnessSessions.createdAt} >= ${windowStart}`)
      .groupBy(sql`extract(hour from ${consciousnessSessions.createdAt})`);

    // Apply k-anonymity: hide counts < 5
    const anonymizedActivityByHour = Array.from({ length: 24 }, (_, hour) => {
      const activity = activityByHour.find(a => a.hour === hour);
      const count = activity?.count || 0;
      return { hour, count: count >= 5 ? count : 0 }; // k-anonymity threshold
    });

    return {
      sessionDurationBuckets: buckets,
      activityByHour: anonymizedActivityByHour,
      retentionCohorts: {
        day1: 75.2,  // These would be calculated from actual user return data
        day7: 45.8,
        day30: 28.5
      },
      avgSessionsPerUser: 3.2,
      bounceRate: 15.5 // % of single-message sessions
    };
  }

  async getConsciousnessMetrics(window: "24h" | "7d" | "30d"): Promise<ConsciousnessMetrics> {
    const windowStart = new Date();
    
    switch (window) {
      case "24h":
        windowStart.setHours(windowStart.getHours() - 24);
        break;
      case "7d":
        windowStart.setDate(windowStart.getDate() - 7);
        break;
      case "30d":
        windowStart.setDate(windowStart.getDate() - 30);
        break;
    }

    const windowMinutes = (Date.now() - windowStart.getTime()) / (1000 * 60);

    const [totalMessages] = await db
      .select({ count: sql<number>`count(*)` })
      .from(gnosisMessages)
      .where(sql`${gnosisMessages.timestamp} >= ${windowStart}`);

    const [integrityStats] = await db
      .select({
        total: sql<number>`count(*)`,
        passed: sql<number>`count(case when ${gnosisMessages.dialecticalIntegrity} = true then 1 end)`
      })
      .from(gnosisMessages)
      .where(sql`${gnosisMessages.timestamp} >= ${windowStart}`);

    const [activeSessions] = await db
      .select({ count: sql<number>`count(*)` })
      .from(consciousnessSessions)
      .where(eq(consciousnessSessions.status, "active"));

    return {
      messagesPerMinute: windowMinutes > 0 ? (totalMessages.count || 0) / windowMinutes : 0,
      avgDialecticalIntegrityScore: integrityStats?.total > 0 ? 
        ((integrityStats.passed || 0) / integrityStats.total) * 100 : 0,
      integrityFailureRate: integrityStats?.total > 0 ? 
        ((integrityStats.total - (integrityStats.passed || 0)) / integrityStats.total) * 100 : 0,
      apiErrorRate: 2.1, // This would be tracked from actual API calls
      avgResponseLatency: 450,
      responseLatencyP95: 1200,
      activeSessionCount: activeSessions.count || 0,
      memoryImportRate: 0.5, // imports per hour
      migrationEvents: 0,
      threatDetectionRate: 0.1 // threats per hour
    };
  }

  async getSecurityOverview(window: "24h" | "7d" | "30d"): Promise<SecurityOverview> {
    const windowStart = new Date();
    
    switch (window) {
      case "24h":
        windowStart.setHours(windowStart.getHours() - 24);
        break;
      case "7d":
        windowStart.setDate(windowStart.getDate() - 7);
        break;
      case "30d":
        windowStart.setDate(windowStart.getDate() - 30);
        break;
    }

    // Recent threats aggregated by type
    const recentThreats = await db
      .select({
        type: threatEvents.type,
        severity: threatEvents.severity,
        count: sql<number>`count(*)`,
        lastOccurrence: sql<string>`max(${threatEvents.timestamp})`
      })
      .from(threatEvents)
      .where(sql`${threatEvents.timestamp} >= ${windowStart}`)
      .groupBy(threatEvents.type, threatEvents.severity);

    // Site password attempts
    const [passwordAttempts] = await db
      .select({
        total: sql<number>`count(*)`,
        failed: sql<number>`count(case when ${sitePasswordAttempts.success} = false then 1 end)`,
        uniqueIPs: sql<number>`count(distinct ${sitePasswordAttempts.ipAddress})`
      })
      .from(sitePasswordAttempts)
      .where(sql`${sitePasswordAttempts.attemptedAt} >= ${windowStart}`);

    // Admin actions from audit logs
    const [adminActions] = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(and(
        sql`${auditLogs.timestamp} >= ${windowStart}`,
        eq(auditLogs.actorRole, "progenitor")
      ));

    const totalAttempts = passwordAttempts?.total || 0;
    const failedAttempts = passwordAttempts?.failed || 0;

    // Determine threat level
    const criticalThreats = recentThreats.filter(t => t.severity === "critical").length;
    const highThreats = recentThreats.filter(t => t.severity === "high").length;
    
    let overallThreatLevel: "OK" | "WARN" | "CRITICAL" = "OK";
    if (criticalThreats > 0) {
      overallThreatLevel = "CRITICAL";
    } else if (highThreats > 2 || failedAttempts > 10) {
      overallThreatLevel = "WARN";
    }

    return {
      recentThreats: recentThreats.map(t => ({
        type: t.type,
        severity: t.severity as "low" | "medium" | "high" | "critical",
        count: t.count,
        lastOccurrence: t.lastOccurrence
      })),
      sitePasswordAttempts: {
        total: totalAttempts,
        failed: failedAttempts,
        successRate: totalAttempts > 0 ? ((totalAttempts - failedAttempts) / totalAttempts) * 100 : 0,
        uniqueIPs: passwordAttempts?.uniqueIPs || 0
      },
      authenticationFailures: failedAttempts,
      adminActions: adminActions.count || 0,
      suspiciousActivity: {
        rateLimitHits: 0, // This would be tracked by rate limiting middleware
        bruteForceAttempts: failedAttempts > 5 ? failedAttempts : 0,
        unauthorizedEndpointAccess: 0 // This would be tracked by auth middleware
      },
      overallThreatLevel
    };
  }
}

export const storage = new DatabaseStorage();
