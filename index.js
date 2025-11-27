import express from "express";
import ytdl from "ytdl-core";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());

const TEMP_DIR = "./tmp";
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

// YouTube動画をダウンロードしてファイル名を返す
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
      res.json({ fileName, path: filePath });
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
