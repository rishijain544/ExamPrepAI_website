import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json({ limit: "30mb" }));

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV, isVercel: !!process.env.VERCEL });
});

// Helper to determine if we are on Vercel
const isVercel = !!process.env.VERCEL;

// API Route
app.post("/api/generate", async (req, res) => {
  try {
    const { prompt, systemInstruction, modelName, sourceType, fileData, textSource, temperature } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: "No prompt provided" });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error("CRITICAL: GEMINI_API_KEY is not set");
      return res.status(500).json({ 
        error: "Server configuration error: Gemini API key missing.",
        details: "Please ensure GEMINI_API_KEY is configured in your environment variables." 
      });
    }

    const genAI = new GoogleGenAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: modelName || "gemini-1.5-flash",
      systemInstruction: systemInstruction
    });

    let result;
    if (sourceType === 'file' && fileData) {
      console.log(`[API] Processing file: ${fileData.mimeType}, size: ${Math.round(fileData.data.length / 1024)}KB`);
      const response = await model.generateContent([
        { inlineData: { mimeType: fileData.mimeType, data: fileData.data } },
        prompt
      ]);
      result = response.response.text();
    } else {
      console.log(`[API] Processing text source`);
      const response = await model.generateContent([
        `Context Material:\n${textSource || ""}\n\nTask:\n${prompt}`
      ]);
      result = response.response.text();
    }

    if (!result) {
      throw new Error("Empty response from AI engine");
    }

    try {
      const jsonResponse = JSON.parse(result);
      return res.json(jsonResponse);
    } catch (e) {
      return res.json({ response: result });
    }

  } catch (error: any) {
    console.error("[GEMINI API ERROR]", error);
    const status = error.status || 500;
    return res.status(status).json({
      error: error.message || "Internal failure in intelligence engine",
      code: status === 429 ? "QUOTA_EXCEEDED" : "SERVER_ERROR",
      details: isVercel ? "Check Vercel deployment logs for full stack trace." : error.stack
    });
  }
});

import fs from "fs";

const distPath = path.join(process.cwd(), "dist");
let vite: any;

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && !isVercel) {
    console.log("[SERVER] Starting in DEV mode with Vite middleware");
    const { createServer: createViteServer } = await import("vite");
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("[SERVER] Starting in PROD mode serving static files");
    app.use(express.static(distPath));
  }

  // Catch-all route for SPA
  app.get("*", async (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    
    console.log(`[SERVER] Handling request for: ${req.path}`);
    
    try {
      if (process.env.NODE_ENV !== "production" && vite) {
        // In development, we use Vite to serve and transform index.html
        let template = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(req.url, template);
        return res.status(200).set({ "Content-Type": "text/html" }).send(template);
      } else {
        // In production, we serve the built index.html
        const indexPath = path.join(distPath, "index.html");
        return res.sendFile(indexPath);
      }
    } catch (e: any) {
      console.error(`[SERVER] Error serving index.html: ${e.message}`);
      if (!res.headersSent) {
        res.status(500).send("Server Error: Failed to load application.");
      }
    }
  });

  if (!isVercel) {
    const PORT = 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
