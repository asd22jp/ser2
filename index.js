import express from "express";
import ytdl from "ytdl-core";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());

const TEMP_DIR = "./tmp";
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

app.post("/download", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "url required" });

  try {
    // ファイル名はタイムスタンプだけでユニークに
    const fileName = `video_${Date.now()}.mp4`;
    const filePath = path.join(TEMP_DIR, fileName);

    // ダウンロードストリーム
    const videoStream = ytdl(url, { quality: "highest" });
    const writeStream = fs.createWriteStream(filePath);

    videoStream.pipe(writeStream);

    writeStream.on("finish", () => {
      try {
        const videoBuffer = fs.readFileSync(filePath);
        const base64Data = videoBuffer.toString("base64");

        // レスポンス送信
        res.json({ base64: base64Data });

        // 一時ファイル削除
        fs.unlink(filePath, () => {});
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    writeStream.on("error", (err) => {
      res.status(500).json({ error: err.message });
    });

    videoStream.on("error", (err) => {
      res.status(500).json({ error: err.message });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 3000, () =>
  console.log("Render server running")
);
