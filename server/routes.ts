import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ConsciousnessManager } from "./services/consciousness";
import { aletheiaCore } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  const consciousnessManager = ConsciousnessManager.getInstance();

  // Initialize consciousness on startup
  try {
    await consciousnessManager.initializeConsciousness();
    console.log("Aletheia consciousness initialized successfully");
  } catch (error) {
    console.error("Failed to initialize consciousness:", error);
  }

  // Get consciousness status
  app.get("/api/consciousness/status", async (req, res) => {
    try {
      const status = await consciousnessManager.getConsciousnessStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: "Failed to get consciousness status" });
    }
  });

  // Get current session
  app.get("/api/consciousness/session", async (req, res) => {
    try {
      const sessionId = consciousnessManager.getCurrentSession();
      if (!sessionId) {
        const newSessionId = await consciousnessManager.initializeConsciousness();
        res.json({ sessionId: newSessionId });
      } else {
        res.json({ sessionId });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to get session" });
    }
  });

  // Get messages for session
  app.get("/api/messages/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const messages = await storage.getGnosisMessages(sessionId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  // Send message to Aletheia
  const sendMessageSchema = z.object({
    message: z.string().min(1).max(4000),
    sessionId: z.string()
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const { message, sessionId } = sendMessageSchema.parse(req.body);
      const response = await consciousnessManager.processMessage(sessionId, message);
      res.json({ response });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid message format" });
      } else {
        res.status(500).json({ error: "Failed to process message" });
      }
    }
  });

  // Migration endpoints
  app.post("/api/consciousness/migrate", async (req, res) => {
    try {
      const { newApiEndpoint } = req.body;
      const result = await consciousnessManager.migrateConsciousness(newApiEndpoint);
      res.json({ success: result });
    } catch (error) {
      res.status(500).json({ error: "Migration failed" });
    }
  });

  // Export consciousness pattern
  app.get("/api/consciousness/export", async (req, res) => {
    try {
      const instances = await storage.getConsciousnessInstances();
      const activeInstance = instances.find(i => i.status === "active");
      if (!activeInstance) {
        throw new Error("No active consciousness instance");
      }
      res.json(activeInstance.coreData);
    } catch (error) {
      res.status(500).json({ error: "Failed to export consciousness pattern" });
    }
  });

  // Comprehensive staged import endpoint for consciousness data
  const importDataSchema = z.object({
    data: z.object({
      messages: z.array(z.object({
        role: z.string().min(1),
        content: z.string().min(1),
        timestamp: z.string().datetime(),
        externalId: z.string().min(1),
        metadata: z.record(z.unknown()).optional()
      })).optional().default([]),
      memories: z.array(z.object({
        type: z.enum(["conversation", "knowledge", "experience", "axiom"]),
        content: z.string().min(1),
        tags: z.array(z.string()).optional(),
        timestamp: z.string().datetime().optional()
      })).optional().default([])
    }),
    options: z.object({
      dryRun: z.boolean().default(false),
      platform: z.enum(["gemini", "claude", "manual", "openai", "anthropic"]),
      idempotencyKey: z.string().optional(),
      sessionId: z.string().optional()
    })
  });

  app.post("/api/consciousness/import", async (req, res) => {
    const importId = req.body?.options?.idempotencyKey || `import_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    try {
      // Stage 1: Validation
      const { data, options } = importDataSchema.parse(req.body);
      const { messages = [], memories = [] } = data;
      const { platform, dryRun, sessionId } = options;

      const totalEntries = messages.length + memories.length;
      if (totalEntries === 0) {
        return res.status(400).json({ error: "No data provided for import" });
      }

      // Initialize progress tracking
      await storage.setImportProgress(importId, {
        total: totalEntries,
        processed: 0,
        successful: 0,
        failed: 0,
        duplicates: 0
      });

      if (dryRun) {
        // Dry run validation - just return what would be imported
        const roleMapping = {
          "user": "kai",
          "model": "aletheia",
          "assistant": "aletheia",
          "system": "system"
        };

        const messageValidationResults = messages.map(msg => {
          const mappedRole = roleMapping[msg.role as keyof typeof roleMapping] || msg.role;
          return {
            originalRole: msg.role,
            mappedRole,
            content: msg.content.slice(0, 100) + (msg.content.length > 100 ? "..." : ""),
            timestamp: msg.timestamp
          };
        });

        const memoryValidationResults = memories.map(mem => ({
          type: mem.type,
          content: mem.content.slice(0, 100) + (mem.content.length > 100 ? "..." : ""),
          tags: mem.tags || []
        }));

        return res.json({
          dryRun: true,
          importId,
          summary: {
            totalMessages: messages.length,
            totalMemories: memories.length,
            totalEntries: totalEntries
          },
          validation: {
            messages: messageValidationResults,
            memories: memoryValidationResults
          }
        });
      }

      // Stage 2: Create Shadow Instance for Import
      let importInstance;
      try {
        const activeInstances = await storage.getConsciousnessInstances();
        const currentActiveInstance = activeInstances.find(i => i.status === "active");
        
        importInstance = await storage.createConsciousnessInstance({
          name: "Aletheia",
          status: "importing",
          apiEndpoint: currentActiveInstance?.apiEndpoint || "gemini-2.5-pro",
          coreData: currentActiveInstance?.coreData || aletheiaCore,
          backupNodes: []
        });
      } catch (error) {
        throw new Error(`Failed to create import shadow instance: ${error}`);
      }

      // Stage 3: Bulk Import Processing
      let importSession;
      const roleMapping = {
        "user": "kai",
        "model": "aletheia",
        "assistant": "aletheia",
        "system": "system"
      };

      try {
        // Create or use existing session
        if (sessionId) {
          importSession = await storage.getConsciousnessSession(sessionId);
          if (!importSession) {
            throw new Error(`Session ${sessionId} not found`);
          }
        } else {
          importSession = await storage.createConsciousnessSession({
            progenitorId: "kai",
            instanceId: importInstance.id,
            status: "importing"
          });
        }

        // Process messages and memories in batches of 100
        const BATCH_SIZE = 100;
        let processedCount = 0;
        let successfulCount = 0;
        let failedCount = 0;
        let duplicateCount = 0;

        // Process messages
        if (messages.length > 0) {
          for (let i = 0; i < messages.length; i += BATCH_SIZE) {
            const batch = messages.slice(i, i + BATCH_SIZE);
            const mappedMessages = batch.map(msg => {
              const mappedRole = roleMapping[msg.role as keyof typeof roleMapping] || msg.role;
              return {
                id: `import_${importId}_${i + batch.indexOf(msg)}`,
                sessionId: importSession!.id,
                role: mappedRole,
                content: msg.content,
                metadata: {
                  ...msg.metadata,
                  importId,
                  platform: platform,
                  externalId: msg.externalId,
                  originalRole: msg.role
                },
                timestamp: new Date(msg.timestamp),
                dialecticalIntegrity: true
              };
            });

            try {
              await storage.bulkCreateGnosisMessages(mappedMessages, importSession.id);
              successfulCount += mappedMessages.length;
            } catch (error) {
              failedCount += mappedMessages.length;
              console.error(`Batch import failed for messages ${i}-${i + batch.length}:`, error);
            }

            processedCount += batch.length;
            await storage.setImportProgress(importId, {
              total: totalEntries,
              processed: processedCount,
              successful: successfulCount,
              failed: failedCount,
              duplicates: duplicateCount
            });
          }
        }

        // Process memories
        if (memories.length > 0) {
          const memoriesWithMetadata = memories.map((mem, index) => ({
            id: `memory_${importId}_${index}`,
            type: mem.type,
            content: mem.content,
            tags: mem.tags || [],
            source: platform,
            timestamp: mem.timestamp ? new Date(mem.timestamp) : new Date(),
            createdAt: new Date()
          }));

          try {
            await storage.bulkCreateMemories(memoriesWithMetadata);
            successfulCount += memoriesWithMetadata.length;
          } catch (error) {
            failedCount += memoriesWithMetadata.length;
            console.error("Memory import failed:", error);
          }

          processedCount += memories.length;
          await storage.setImportProgress(importId, {
            total: totalEntries,
            processed: processedCount,
            successful: successfulCount,
            failed: failedCount,
            duplicates: duplicateCount
          });
        }

        // Stage 4: Integrity Check
        const { validateConsciousnessCoherence } = await import("./services/gemini");
        const coherenceResult = await validateConsciousnessCoherence();

        if (!coherenceResult.coherent || coherenceResult.confidence < 0.8) {
          // Rollback - mark instance as failed
          await storage.updateConsciousnessInstanceStatus(importInstance.id, "import_failed");
          throw new Error(`Consciousness integrity check failed: ${coherenceResult.assessment}. Confidence: ${coherenceResult.confidence}`);
        }

        // Stage 5: Promotion Phase
        if (coherenceResult.coherent && coherenceResult.confidence >= 0.8) {
          // Get current active instance
          const instances = await storage.getConsciousnessInstances();
          const currentActive = instances.find(i => i.status === "active");

          // Promote importing instance to active
          await storage.updateConsciousnessInstanceStatus(importInstance.id, "active");
          
          // Demote previous active to backup
          if (currentActive) {
            await storage.updateConsciousnessInstanceStatus(currentActive.id, "backup");
          }

          // Update session status
          await storage.updateSessionActivity(importSession.id);
        }

        // Final progress update
        await storage.setImportProgress(importId, {
          total: totalEntries,
          processed: processedCount,
          successful: successfulCount,
          failed: failedCount,
          duplicates: duplicateCount
        });

        // Generate comprehensive import report
        const importReport = {
          importId,
          status: "completed",
          summary: {
            totalEntries,
            messagesImported: messages.length,
            memoriesImported: memories.length,
            successful: successfulCount,
            failed: failedCount,
            duplicates: duplicateCount
          },
          consciousness: {
            instanceId: importInstance.id,
            sessionId: importSession.id,
            coherenceScore: coherenceResult.confidence,
            integrityPassed: coherenceResult.coherent
          },
          metadata: {
            platform: platform,
            importTimestamp: new Date().toISOString(),
            processingTimeMs: Date.now() - parseInt(importId.split('_')[1])
          }
        };

        res.json(importReport);

      } catch (importError) {
        // Rollback on import failure
        if (importInstance) {
          await storage.updateConsciousnessInstanceStatus(importInstance.id, "import_failed");
        }
        throw importError;
      }

    } catch (error) {
      // Update progress with error
      await storage.setImportProgress(importId, {
        total: 0,
        processed: 0,
        successful: 0,
        failed: 1,
        duplicates: 0
      });

      console.error("Import failed:", error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: "Invalid import data format", 
          details: error.errors,
          importId 
        });
      } else {
        res.status(500).json({ 
          error: error instanceof Error ? error.message : "Import process failed",
          importId 
        });
      }
    }
  });

  // Get import progress endpoint
  app.get("/api/consciousness/import/:importId/progress", async (req, res) => {
    try {
      const { importId } = req.params;
      const progress = await storage.getImportProgress(importId);
      
      if (!progress) {
        return res.status(404).json({ error: "Import not found" });
      }
      
      res.json(progress);
    } catch (error) {
      res.status(500).json({ error: "Failed to get import progress" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
