import express from "express";
import path from "path";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, GenerateVideosOperation, Modality } from "@google/genai";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  const getAiClient = () => {
    return new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  };

  // Helper: Get AI client inside route directly to handle errors safely
  app.post("/api/enhance-prompt", async (req, res) => {
    try {
      const { prompt } = req.body;
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `Rewrite the following prompt to be more descriptive, creative, and detailed for an AI generator. Keep it under 50 words. Return ONLY the enhanced prompt text. Prompt: "${prompt}"`
      });
      res.json({ text: response.text?.trim() || prompt });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/video-prompt-variations", async (req, res) => {
    try {
      const { prompt } = req.body;
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `You are an expert video director. Generate 3 distinct, dramatic, and engaging variations of the following video generation prompt.\nThey should be descriptive and optimized for an AI video generator (Veo).\nReturn ONLY a raw JSON array of strings (e.g. ["prompt 1", "prompt 2", "prompt 3"]).\nOriginal Prompt: "${prompt}"`,
        config: {
            responseMimeType: 'application/json'
        }
      });
      res.json({ text: response.text || '[]' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/video-prompt-from-image", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Missing image" });
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: req.file.mimetype,
                data: req.file.buffer.toString('base64')
              }
            },
            { text: "You are an expert video director. Look at this image and write a single, precise, and descriptive prompt for an AI video generator (Veo) to animate this image. Focus on the natural movement, lighting changes, camera motion, and atmosphere that would bring this specific static image to life. Return ONLY the prompt text, no conversational filler. Keep it under 40 words." }
          ]
        }
      });
      res.json({ text: response.text?.trim() || "" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Video Generator (Veo)
  app.post("/api/generate-video", upload.fields([{ name: "image", maxCount: 1 }, { name: "endImage", maxCount: 1 }]), async (req, res) => {
    try {
      const { prompt, aspectRatio, resolution } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const imageFile = files?.['image']?.[0];
      const endImageFile = files?.['endImage']?.[0];

      const ai = getAiClient();
      
      const apiResolution: "720p" | "1080p" = resolution === '4K' ? '1080p' : (resolution || '1080p');
      const model = apiResolution === '1080p' ? 'veo-3.1-generate-preview' : 'veo-3.1-lite-generate-preview';

      const requestPayload: any = {
        model,
        prompt: prompt, 
        config: {
          numberOfVideos: 1,
          resolution: apiResolution,
          aspectRatio: aspectRatio || '16:9'
        }
      };

      if (imageFile) {
        requestPayload.image = {
          imageBytes: imageFile.buffer.toString('base64'),
          mimeType: imageFile.mimetype,
        };
      }

      if (endImageFile) {
        requestPayload.config.lastFrame = {
          imageBytes: endImageFile.buffer.toString('base64'),
          mimeType: endImageFile.mimetype,
        };
      }

      const operation = await ai.models.generateVideos(requestPayload);
      res.json({ operationName: operation.name });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/video-status", async (req, res) => {
    try {
      const { operationName } = req.body;
      const ai = getAiClient();
      const op = new GenerateVideosOperation();
      op.name = operationName;
      const updated = await ai.operations.getVideosOperation({ operation: op });
      res.json({ done: updated.done, error: updated.error });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/video-download", async (req, res) => {
    try {
      const { operationName } = req.body;
      const ai = getAiClient();
      const op = new GenerateVideosOperation();
      op.name = operationName;
      const updated = await ai.operations.getVideosOperation({ operation: op });
      const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
      
      if (!uri) {
        const errorDetails = updated.error ? JSON.stringify(updated.error) : JSON.stringify(updated.response) || "Unknown error";
        return res.status(400).json({ error: `Video generation failed upstream. Details: ${errorDetails}` });
      }

      const videoRes = await fetch(uri, {
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY! },
      });
      
      if (!videoRes.ok) throw new Error("Failed to fetch video blob from upstream.");
      
      res.setHeader('Content-Type', 'video/mp4');
      
      // Node.js web streams pipeline
      if (videoRes.body) {
        const reader = videoRes.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            res.end();
            break;
          }
          if (value) {
            res.write(Buffer.from(value));
          }
        }
      } else {
         res.end();
      }
    } catch (e: any) {
      // res.status(500).json({ error: e.message });
      if (!res.headersSent) res.status(500).json({ error: e.message });
    }
  });

  // Image Generation
  app.post("/api/generate-image", async (req, res) => {
    try {
      const { prompt, aspectRatio } = req.body;
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image', // updated from instructions
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio || "1:1",
            imageSize: "1K"
          }
        },
      });

      let imageData = null;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageData = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
      
      if (!imageData) throw new Error("No image data found in response.");
      res.json({ image: imageData });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Image Editor
  app.post("/api/edit-image", upload.single("image"), async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!req.file) return res.status(400).json({ error: "Missing image" });

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image', // upgrade
        contents: {
          parts: [
            {
              inlineData: {
                data: req.file.buffer.toString('base64'),
                mimeType: req.file.mimetype,
              },
            },
            { text: prompt },
          ],
        },
      });

      let imageData = null;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageData = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
      
      if (!imageData) throw new Error("No edited image data found.");
      res.json({ image: imageData });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // AI Writer Streaming
  app.post("/api/generate-text-stream", async (req, res) => {
    try {
      const { prompt } = req.body;
      const ai = getAiClient();
      const response = await ai.models.generateContentStream({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction: "You are a professional AI copywriter. Create high-converting, engaging content.",
        }
      });

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let finalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

      for await (const chunk of response) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
        if (chunk.usageMetadata) {
            finalUsage = {
                promptTokens: chunk.usageMetadata.promptTokenCount || 0,
                completionTokens: chunk.usageMetadata.candidatesTokenCount || 0,
                totalTokens: chunk.usageMetadata.totalTokenCount || 0
            };
        }
      }
      res.write(`data: ${JSON.stringify({ usage: finalUsage, done: true })}\n\n`);
      res.end();
    } catch (e: any) {
      if (!res.headersSent) res.status(500).json({ error: e.message });
    }
  });

  // Transcription
  app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Missing audio" });
      const ai = getAiClient();
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: req.file.mimetype,
                data: req.file.buffer.toString('base64')
              }
            },
            { text: "Transcribe this audio/video file accurately. Identify speakers if possible." }
          ]
        }
      });
      res.json({ text: response.text || "No transcription available." });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Text-To-Speech
  app.post("/api/generate-speech", async (req, res) => {
    try {
      const { text, voiceName } = req.body;
      const ai = getAiClient();
      
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("No audio generated.");

      res.json({ audio: base64Audio });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });


  // Catch-all for API routes to prevent Vite from sending index.html
  app.all(/^\/api\/.*/, (req, res) => {
    res.status(404).json({ error: `API Route Not Found: ${req.method} ${req.originalUrl}` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!err.status || err.status >= 500) {
      console.error("Global Error Handler:", err);
    }
    res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
