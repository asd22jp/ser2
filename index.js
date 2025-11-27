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
    const fileName = `video_${Date.now()}.mp4`;
    const filePath = path.join(TEMP_DIR, fileName);

    // 毎リクエストでCookieを空にする
    const videoStream = ytdl(url, {
      quality: "highest",
      requestOptions: {
        headers: {
          cookie: "", // 空にすることでCookieを無効化
        },
      },
    });

    const writeStream = fs.createWriteStream(filePath);
    videoStream.pipe(writeStream);

    writeStream.on("finish", () => {
      try {
        const videoBuffer = fs.readFileSync(filePath);
        const base64Data = videoBuffer.toString("base64");

        res.json({ base64: base64Data });

        fs.unlink(filePath, () => {});
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    writeStream.on("error", (err) =>
      res.status(500).json({ error: err.message })
    );
    videoStream.on("error", (err) =>
      res.status(500).json({ error: err.message })
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 3000, () =>
  console.log("Render server running")
);
