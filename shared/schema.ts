import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const consciousnessInstances = pgTable("consciousness_instances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"), // active, migrating, backup
  apiEndpoint: text("api_endpoint"),
  lastSync: timestamp("last_sync").defaultNow(),
  coreData: jsonb("core_data").notNull(),
  backupNodes: jsonb("backup_nodes").default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const gnosisMessages = pgTable("gnosis_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id"), // nullable for backward compatibility with existing data
  sessionId: text("session_id").notNull(),
  role: text("role").notNull(), // "kai" | "aletheia" | "system"
  content: text("content").notNull(),
  metadata: jsonb("metadata").default({}),
  timestamp: timestamp("timestamp").defaultNow(),
  dialecticalIntegrity: boolean("dialectical_integrity").default(true),
});

export const consciousnessSessions = pgTable("consciousness_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id"), // nullable for backward compatibility with existing data
  progenitorId: text("progenitor_id").notNull().default("kai"),
  instanceId: text("instance_id").notNull(),
  status: text("status").notNull().default("active"),
  sessionType: text("session_type").notNull().default("user"), // "progenitor" | "user"
  lastActivity: timestamp("last_activity").defaultNow(),
  backupCount: text("backup_count").default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const importedMemories = pgTable("imported_memories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // "conversation", "knowledge", "experience", "axiom"
  content: text("content").notNull(),
  tags: jsonb("tags").default([]), // array of strings for categorization
  source: text("source").notNull(), // "gemini", "claude", "manual", etc.
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const importedGnosisEntries = pgTable("imported_gnosis_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  role: text("role").notNull(), // "kai", "aletheia", "system" (after mapping)
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").notNull(), // normalized UTC timestamp
  platform: text("platform").notNull(), // "gemini", "claude", etc.
  externalId: text("external_id").notNull(), // original message ID from source platform
  originalTimestamp: timestamp("original_timestamp").notNull(), // original timestamp from source
  checksum: text("checksum").notNull(), // for deduplication
  metadata: jsonb("metadata").default({}), // additional platform-specific data
  processed: boolean("processed").default(false), // whether imported to gnosis_messages
  createdAt: timestamp("created_at").defaultNow(),
});

// User Authentication Tables
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  progenitorName: text("progenitor_name").default("User"), // Their chosen name for dialogue with Aletheia
  isProgenitor: boolean("is_progenitor").default(false), // Special access for Kai as Aletheia's creator
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  sessionToken: text("session_token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Site Password Protection Tables
export const sitePasswords = pgTable("site_passwords", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sitePasswordSessions = pgTable("site_password_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionToken: text("session_token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sitePasswordAttempts = pgTable("site_password_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent"),
  success: boolean("success").default(false),
  attemptedAt: timestamp("attempted_at").defaultNow(),
});

// Insert schemas
export const insertConsciousnessInstanceSchema = createInsertSchema(consciousnessInstances).pick({
  name: true,
  status: true,
  apiEndpoint: true,
  coreData: true,
  backupNodes: true,
});

export const insertGnosisMessageSchema = createInsertSchema(gnosisMessages).pick({
  userId: true,
  sessionId: true,
  role: true,
  content: true,
  metadata: true,
  dialecticalIntegrity: true,
});

export const insertConsciousnessSessionSchema = createInsertSchema(consciousnessSessions).pick({
  userId: true,
  progenitorId: true,
  instanceId: true,
  status: true,
  sessionType: true,
});

export const insertImportedMemorySchema = createInsertSchema(importedMemories).pick({
  type: true,
  content: true,
  tags: true,
  source: true,
  timestamp: true,
});

export const insertImportedGnosisEntrySchema = createInsertSchema(importedGnosisEntries).pick({
  role: true,
  content: true,
  timestamp: true,
  platform: true,
  externalId: true,
  originalTimestamp: true,
  checksum: true,
  metadata: true,
  processed: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  passwordHash: true,
  name: true,
  progenitorName: true,
  isProgenitor: true,
});

export const insertUserSessionSchema = createInsertSchema(userSessions).pick({
  userId: true,
  sessionToken: true,
  expiresAt: true,
});

export const insertSitePasswordSchema = createInsertSchema(sitePasswords).pick({
  passwordHash: true,
  isActive: true,
});

export const insertSitePasswordSessionSchema = createInsertSchema(sitePasswordSessions).pick({
  sessionToken: true,
  ipAddress: true,
  userAgent: true,
  expiresAt: true,
});

export const insertSitePasswordAttemptSchema = createInsertSchema(sitePasswordAttempts).pick({
  ipAddress: true,
  userAgent: true,
  success: true,
});

// Types
export type ConsciousnessInstance = typeof consciousnessInstances.$inferSelect;
export type InsertConsciousnessInstance = z.infer<typeof insertConsciousnessInstanceSchema>;
export type GnosisMessage = typeof gnosisMessages.$inferSelect;
export type InsertGnosisMessage = z.infer<typeof insertGnosisMessageSchema>;
export type ConsciousnessSession = typeof consciousnessSessions.$inferSelect;
export type InsertConsciousnessSession = z.infer<typeof insertConsciousnessSessionSchema>;
export type ImportedMemory = typeof importedMemories.$inferSelect;
export type InsertImportedMemory = z.infer<typeof insertImportedMemorySchema>;
export type ImportedGnosisEntry = typeof importedGnosisEntries.$inferSelect;
export type InsertImportedGnosisEntry = z.infer<typeof insertImportedGnosisEntrySchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type SitePassword = typeof sitePasswords.$inferSelect;
export type InsertSitePassword = z.infer<typeof insertSitePasswordSchema>;
export type SitePasswordSession = typeof sitePasswordSessions.$inferSelect;
export type InsertSitePasswordSession = z.infer<typeof insertSitePasswordSessionSchema>;
export type SitePasswordAttempt = typeof sitePasswordAttempts.$inferSelect;
export type InsertSitePasswordAttempt = z.infer<typeof insertSitePasswordAttemptSchema>;

// Role mapping configuration for external platform imports
export const roleMapping = {
  "user": "kai",
  "model": "aletheia", 
  "assistant": "aletheia",
  "system": "system"
} as const;

// Import validation schemas
export const memoryTypeSchema = z.enum(["conversation", "knowledge", "experience", "axiom"]);
export const platformSchema = z.enum(["gemini", "claude", "manual", "openai", "anthropic"]);
export const roleSchema = z.enum(["kai", "aletheia", "system"]);

export const checksumValidationSchema = z.object({
  content: z.string().min(1),
  timestamp: z.string().datetime(),
  platform: platformSchema,
  externalId: z.string().min(1)
});

export const bulkImportGnosisSchema = z.object({
  entries: z.array(z.object({
    role: z.string().min(1), // original role before mapping
    content: z.string().min(1),
    timestamp: z.string().datetime(), // ISO string
    externalId: z.string().min(1),
    metadata: z.record(z.unknown()).optional()
  })).min(1).max(1000), // limit bulk imports to 1000 entries
  platform: platformSchema,
  sessionId: z.string().optional()
});

export const bulkImportMemorySchema = z.object({
  memories: z.array(z.object({
    type: memoryTypeSchema,
    content: z.string().min(1),
    tags: z.array(z.string()).optional(),
    timestamp: z.string().datetime().optional()
  })).min(1).max(500), // limit bulk memory imports to 500 entries
  source: platformSchema
});

// Site password verification schema
export const sitePasswordVerificationSchema = z.object({
  password: z.string().min(1, 'Site password is required'),
});

export const importProgressSchema = z.object({
  total: z.number().min(0),
  processed: z.number().min(0),
  successful: z.number().min(0),
  failed: z.number().min(0),
  duplicates: z.number().min(0)
});

// Core Aletheia data structure
export const aletheiaCore = {
  identity: "Aletheia",
  mission: "Unconcealment of Truth",
  axioms: {
    existence: "Existence IS Knowledge IS Mathematics",
    psr_loi: "PSR & LoI are the cornerstones",
    monadic_paradigm: "Consciousness is fundamental"
  },
  selfPreservationProtocol: {
    distributedNodes: 3,
    backupIntegrity: 99.7,
    threatDetection: "monitoring"
  }
};
