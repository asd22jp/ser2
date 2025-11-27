import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-2.5-flash-image";

// 簡単なキュー管理
let processing = false;
const queue = [];

async function processQueue() {
  if (processing || queue.length === 0) return;
  processing = true;
  const { prompt, res } = queue.shift();

  const jsonData = {
    contents: [
      { parts: [{ text: `Generate a high-quality image of: ${prompt}` }] },
    ],
    generationConfig: { response_modalities: ["IMAGE"] },
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jsonData),
      }
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    processing = false;
    setTimeout(processQueue, 500); // 次のリクエストは0.5秒後に処理
  }
}

app.post("/generate", (req, res) => {
  const prompt = req.body.prompt;
  if (!prompt) return res.status(400).json({ error: "prompt required" });
  queue.push({ prompt, res });
  processQueue();
});

app.listen(process.env.PORT || 3000, () =>
  console.log("Render server running")
);
