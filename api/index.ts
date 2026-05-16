import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json({ limit: "30mb" }));

// Helper to determine if we are on Vercel
const isVercel = !!(process.env.VERCEL || process.env.VERCEL_URL);

// API Route
app.post("/api/generate", async (req, res) => {
  console.log(`[${new Date().toISOString()}] Handling /api/generate`);
  
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

    // Try to parse as JSON if the prompt asked for it, otherwise return as payload
    try {
      const jsonResponse = JSON.parse(result);
      return res.json(jsonResponse);
    } catch (e) {
      // If it's not JSON, return it in a structured way anyway
      return res.json({ response: result });
    }

  } catch (error: any) {
    console.error("[GEMINI API ERROR]", error);
    const status = error.status || 500;
    const message = error.message || "Internal failure in intelligence engine";
    
    return res.status(status).json({
      error: message,
      code: status === 429 ? "QUOTA_EXCEEDED" : "SERVER_ERROR",
      details: isVercel ? "Check Vercel deployment logs for full stack trace." : error.stack
    });
  }
});

// Serve Static Files
const distPath = path.join(process.cwd(), "dist");

if (process.env.NODE_ENV === "development" && !isVercel) {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(distPath));
}

// For SPA routing
app.get("*", async (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  
  if (process.env.NODE_ENV === "development" && !isVercel) {
    // Vite handles this automatically via middleware
    return next();
  }

  res.sendFile(path.join(distPath, "index.html"), (err) => {
    if (err) {
      res.status(404).send("Application files not found. Ensure the project is built.");
    }
  });
});

// Environment-specific startup
if (!isVercel) {
  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Started in ${process.env.NODE_ENV} mode at http://localhost:${PORT}`);
    console.log(`[SERVER] Serving static files from: ${distPath}`);
  });
}

export default app;

