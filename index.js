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
    const videoId = ytdl.getURLVideoID(url);
    const fileName = `video_${videoId}_${Date.now()}.mp4`;
    const filePath = path.join(TEMP_DIR, fileName);

    const writeStream = fs.createWriteStream(filePath);
    ytdl(url, { quality: "highest" }).pipe(writeStream);

    writeStream.on("finish", () => {
      const videoBuffer = fs.readFileSync(filePath);
      const base64Data = videoBuffer.toString("base64");
      res.json({ base64: base64Data });
      fs.unlinkSync(filePath); // 一時ファイル削除
    });

    writeStream.on("error", (err) => {
      res.status(500).json({ error: err.message });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 3000, () =>
  console.log("Render server running")
);
