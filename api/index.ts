import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json({ limit: "20mb" }));

// Helper for Vercel context
const isVercel = process.env.VERCEL === "1" || !!process.env.VERCEL;

// Explicit route for Vercel
app.post("/api/generate", async (req, res) => {
  console.log("[API] Generate request received", { 
    sourceType: req.body.sourceType,
    model: req.body.modelName 
  });

  try {
    const { prompt, systemInstruction, modelName, sourceType, fileData, textSource, temperature } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[CRITICAL] Missing GEMINI_API_KEY environment variable");
      return res.status(500).json({ 
        error: "Intelligence Engine configuration missing. Please add GEMINI_API_KEY to your Vercel Environment Variables.",
        code: "CONFIG_ERROR"
      });
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: { headers: { 'User-Agent': 'exam-prep-ai-vercel' } }
    });

    const executeRequest = async () => {
      let parts = [];
      if (sourceType === 'file' && fileData) {
        parts = [
          { inlineData: { mimeType: fileData.mimeType, data: fileData.data } },
          { text: prompt }
        ];
      } else {
        parts = [
          { text: `Material to analyze: \n\n ${textSource}` },
          { text: prompt }
        ];
      }

      const response = await ai.models.generateContent({
        model: modelName || "gemini-1.5-flash",
        contents: { parts },
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          temperature: temperature || 0.2
        }
      });

      const text = response.text;
      if (!text) throw new Error("AI returned empty content");
      return JSON.parse(text);
    };

    const result = await executeRequest();
    return res.json(result);

  } catch (error: any) {
    console.error("[API Error]", error);
    const status = error.status || 500;
    
    // Explicitly handle Vercel Timeout
    if (error.message && error.message.includes("timeout")) {
      return res.status(504).json({ error: "Intelligence Engine Timeout. Try processing a smaller file." });
    }

    return res.status(status).json({ 
      error: error.message || "Internal Intelligence Failure", 
      code: error.status === 429 ? "QUOTA_EXCEEDED" : "API_ERROR",
      details: isVercel ? "Check Vercel logs for more details" : error.stack
    });
  }
});

// Serve static files and handle SPA routing
const distPath = path.join(process.cwd(), "dist");

// Serve static assets from dist
app.use(express.static(distPath));

// For SPA routing: all other routes serve index.html
app.get("*", (req, res, next) => {
  // Skip API routes here as they are handled above
  if (req.path.startsWith('/api')) return next();
  
  const indexPath = path.join(distPath, "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
      // If we are in local dev and not built yet, we might need to inform the user
      if (!isVercel) {
          res.status(404).send("Build output not found. Please run 'npm run build' or use local development mode.");
      } else {
          // On Vercel, this is a real problem
          res.status(404).send("Application static files not found.");
      }
    }
  });
});

// Local development server logic
if (!isVercel) {
  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[DEV] Server running on http://localhost:${PORT}`);
  });
}

export default app;

