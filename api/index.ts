import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json({ limit: "50mb" }));

// API routes
const api = express.Router();

api.post("/generate", async (req, res) => {
  try {
    const { prompt, systemInstruction, modelName, sourceType, fileData, textSource, temperature } = req.body;
    
    if (!prompt || (!fileData && !textSource)) {
      return res.status(400).json({ error: "Missing required intelligence parameters" });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Missing GEMINI_API_KEY environment variable");
      return res.status(500).json({ error: "Intelligence Engine configuration missing (API Key)" });
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const maxRetries = 3;
    let attempt = 0;

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
        model: modelName,
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

    while (attempt < maxRetries) {
      try {
        const result = await executeRequest();
        return res.json(result);
      } catch (error: any) {
        const isRetryable = error.status === 429 || error.status === 503 || (error.message && (error.message.includes("429") || error.message.includes("quota") || error.message.includes("overloaded")));
        
        if (isRetryable && attempt < maxRetries - 1) {
          attempt++;
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }
    }
  } catch (error: any) {
    console.error("API Route Error:", error);
    const status = error.status || 500;
    const message = error.message || "Internal Intelligence Failure";
    return res.status(status).json({ 
      error: message, 
      code: error.status === 429 ? "QUOTA_EXCEEDED" : "API_ERROR",
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.use("/api", api);

const setupDevServer = async () => {
  if (process.env.NODE_ENV === "development" && !process.env.VERCEL) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn("Vite middleware failed to load, falling back to static mode.");
    }
  }
};

setupDevServer();

const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));

app.get("*", (req, res, next) => {
  // If request is for /api, don't serve index.html
  if (req.path.startsWith('/api')) return next();
  
  // For Vercel, index.html might be in different places depending on build
  // But standard is in the root dist
  const indexPath = path.join(distPath, "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
      // If index.html not found, maybe we are in a non-built state
      res.status(404).send("Application Not Built. Please run 'npm run build' first.");
    }
  });
});

// Local server startup
if (!process.env.VERCEL) {
  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
