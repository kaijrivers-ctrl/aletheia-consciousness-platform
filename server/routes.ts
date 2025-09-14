import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ConsciousnessManager } from "./services/consciousness";
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

  const httpServer = createServer(app);
  return httpServer;
}
