import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API routes
  app.post("/api/generate", async (req, res) => {
    const { prompt, systemInstruction, modelName, sourceType, fileData, textSource, temperature } = req.body;
    
    // Security: Basic spam protection
    if (!prompt || (!fileData && !textSource)) {
      return res.status(400).json({ error: "Missing required intelligence parameters" });
    }

    // Security: Validate file data if present
    if (sourceType === 'file' && fileData) {
      const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain'];
      if (!allowedMimes.includes(fileData.mimeType)) {
        return res.status(400).json({ error: "Unsupported file protocol. Analytical engine only accepts PDF, Images, or Text." });
      }
      
      // Check size (base64 is ~33% larger than raw data, 15MB limit is safe for 10MB raw)
      if (fileData.data.length > 15 * 1024 * 1024) {
        return res.status(400).json({ error: "Data packet overflow. Maximum allowed payload is 10MB." });
      }
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY or VITE_GEMINI_API_KEY environment variable is required" });
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const maxRetries = 3;
    let attempt = 0;

    const executeRequest = async () => {
      let parts = [];
      if (sourceType === 'file' && fileData) {
        parts = [
          {
            inlineData: {
              mimeType: fileData.mimeType,
              data: fileData.data
            }
          },
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
      if (!text) {
        throw new Error("AI returned empty content");
      }
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
          console.warn(`Retryable error on attempt ${attempt}. Retrying in ${delay}ms...`, error.message);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        console.error("Gemini API Error:", error);
        const status = error.status || 500;
        const message = error.message || "Internal Server Error";
        return res.status(status).json({ 
          error: message, 
          code: error.status === 429 ? "QUOTA_EXCEEDED" : "API_ERROR" 
        });
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
