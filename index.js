import express from "express";
import ytdl from "ytdl-core";
import fs from "fs";
import path from "path";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";

const app = express();
app.use(express.json());

const TEMP_DIR = "./tmp";
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

// 無料プロキシリスト（必要に応じて更新）
const proxies = [
  { host: "192.168.164.85", port: 46710, type: "HTTPS" },
  { host: "192.168.5.238", port: 23082, type: "HTTPS" },
  { host: "192.168.29.124", port: 25747, type: "SOCKS5" },
  { host: "192.168.214.165", port: 12229, type: "HTTPS" },
  { host: "192.168.107.94", port: 17237, type: "SOCKS5" },
  { host: "192.168.196.166", port: 4193, type: "HTTPS" },
  { host: "192.168.36.79", port: 18407, type: "SOCKS5" },
  { host: "192.168.107.84", port: 25172, type: "HTTPS" },
  { host: "192.168.157.83", port: 18680, type: "SOCKS5" },
];

// ランダムでプロキシ選択
function getRandomProxy() {
  const proxy = proxies[Math.floor(Math.random() * proxies.length)];
  if (proxy.type === "HTTPS")
    return new HttpsProxyAgent(`http://${proxy.host}:${proxy.port}`);
  else return new SocksProxyAgent(`socks5://${proxy.host}:${proxy.port}`);
}

app.post("/download", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "url required" });

  try {
    const fileName = `video_${Date.now()}.mp4`;
    const filePath = path.join(TEMP_DIR, fileName);

    const agent = getRandomProxy();

    const videoStream = ytdl(url, {
      quality: "highest",
      requestOptions: { agent },
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

    videoStream.on("error", (err) => {
      console.error("動画ストリームエラー:", err.message);
      res.status(500).json({ error: err.message });
    });

    writeStream.on("error", (err) => {
      console.error("書き込みエラー:", err.message);
      res.status(500).json({ error: err.message });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 3000, () =>
  console.log("Render server running")
);
