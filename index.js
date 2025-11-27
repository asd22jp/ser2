import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const MODEL_NAME = "gemini-2.5-flash-image";
const API_KEYS = process.env.GEMINI_API_KEY;
let processing = false;
const queue = [];

// Gemini API 呼び出し + 429時リトライ
async function fetchGemini(prompt, retries = 3) {
  const apiKey = API_KEYS[Math.floor(Math.random() * API_KEYS.length)];
  const jsonData = {
    contents: [
      { parts: [{ text: `Generate a high-quality image of: ${prompt}` }] },
    ],
    generationConfig: { response_modalities: ["IMAGE"] },
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jsonData),
      }
    );

    if (response.status === 429) {
      if (retries <= 0)
        throw new Error("429 Too Many Requests: リトライ回数オーバー");
      // Retry-After ヘッダ取得（秒単位）
      const retryAfter = parseInt(response.headers.get("Retry-After")) || 2;
      console.log(`429 受信、${retryAfter}秒待ってリトライします...`);
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      return fetchGemini(prompt, retries - 1);
    }

    return await response.json();
  } catch (err) {
    if (retries > 0) {
      console.log("エラー発生、2秒待ってリトライ:", err.message);
      await new Promise((r) => setTimeout(r, 2000));
      return fetchGemini(prompt, retries - 1);
    }
    throw err;
  }
}

// キュー処理
async function processQueue() {
  if (processing || queue.length === 0) return;
  processing = true;
  const { prompt, res } = queue.shift();

  try {
    const data = await fetchGemini(prompt);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    processing = false;
    setTimeout(processQueue, 500); // 次のリクエストまで 0.5 秒待つ
  }
}

// エンドポイント
app.post("/generate", (req, res) => {
  const prompt = req.body.prompt;
  if (!prompt) return res.status(400).json({ error: "prompt required" });
  queue.push({ prompt, res });
  processQueue();
});

// 起動確認用
app.get("/", (req, res) => res.send("Server is running"));

app.listen(process.env.PORT || 3000, () =>
  console.log("Render server running")
);
