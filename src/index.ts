import fs from "node:fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { getBestPlaylistUrl } from "./get-best-playlist-url";
import { getTsFiles } from "./get-ts-files";
import { downloadTsFiles } from "./download-ts-files";
import { mergeTsToMp4 } from "./merge-ts-to-mp4";
import { getHlsUrl } from "./get-video-data";
import slugify from "slugify";
import { Client } from "basic-ftp";
import axios from "axios";

const ffmpegPath = path.resolve(__dirname, "utils", "ffmpeg", "ffmpeg");

const FTP_HOST = "94.102.49.18";
const FTP_PORT = 201;
const FTP_USER = "apiaur50";
const FTP_PASSWORD = "Fm9?:*{iEW4p;&?M";
const REMOTE_DESTINATION =
  "/web/media.aurora5.com/public_html/public_html/fr.xvideos.com/";

function durationToSeconds(duration: string) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const [, h, m, s] = match.map((v) => parseInt(v || "0", 10));
  return h * 3600 + m * 60 + s;
}

function getFfmpegExecutable(): string {
  return process.platform === "darwin" ? "ffmpeg" : ffmpegPath;
}

function videoAlreadyDownloaded(pageUrl: string): boolean {
  const logPath = path.join(__dirname, "..", "logs", "success_log.json");

  if (!fs.existsSync(logPath)) return false;

  try {
    const logData = JSON.parse(fs.readFileSync(logPath, "utf-8"));
    if (!Array.isArray(logData)) return false;

    return logData.some((entry) => entry?.pageUrl === pageUrl);
  } catch (error) {
    console.error("❌ Erro ao ler o log de sucesso:", error);
    return false;
  }
}

export function optimizeMp4WithFfmpeg(
  inputPath: string,
  outputPath: string,
  options = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpegPath = getFfmpegExecutable();

    if (process.platform !== "darwin" && !fs.existsSync(ffmpegPath)) {
      return reject(new Error(`❌ FFmpeg não encontrado em: ${ffmpegPath}`));
    }

    const {
      crf = 22,
      maxrate = "3M",
      bufsize = "6M",
      threads = 3,
      scale,
    } = options;

    const args: string[] = [
      "-i",
      inputPath,

      // Vídeo
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      crf.toString(),
      "-profile:v",
      "high",
      "-level",
      scale && scale <= 720 ? "4.0" : "4.1",
      "-pix_fmt",
      "yuv420p",
      "-threads",
      threads.toString(),
      "-maxrate",
      maxrate,
      "-bufsize",
      bufsize,
      "-x264-params",
      "bframes=3:b-adapt=2:ref=4:scenecut=40:keyint=50:min-keyint=25:rc-lookahead=40:me=umh:subme=7:aq-mode=2:aq-strength=1.0:psy-rd=1.0:0.15:deblock=-1:-1:b-pyramid=normal:weightp=2:weightb=1",

      // Áudio
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-ac",
      "2",
      "-ar",
      "48000",

      // Container
      "-movflags",
      "+faststart",
      "-map_metadata",
      "-1",
      "-sn",
      "-f",
      "mp4",
      "-y",
    ];

    // Redimensionar se scale estiver definido
    if (scale) {
      args.push("-vf", `scale=-2:${scale}`);
    }

    args.push(outputPath);

    const ffmpeg = spawn(ffmpegPath, args);

    ffmpeg.stderr.on("data", (data) => {
      console.log(`📺 FFmpeg: ${data}`);
    });

    ffmpeg.on("error", (err) => {
      reject(new Error(`❌ Erro ao iniciar FFmpeg: ${err.message}`));
    });

    ffmpeg.on("close", (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        console.log(`✅ Otimização concluída: ${outputPath}`);
        resolve();
      } else {
        reject(new Error(`❌ FFmpeg terminou com código ${code}`));
      }
    });
  });
}

async function uploadDirectoryToFtp(
  localDir: string,
  remoteDir: string
): Promise<void> {
  const client = new Client();

  try {
    await client.access({
      host: FTP_HOST,
      port: FTP_PORT,
      user: FTP_USER,
      password: FTP_PASSWORD,
      secure: false,
    });

    client.trackProgress((info) => {
      console.log(
        `📤 Uploading: ${info.name} - ${info.bytes} bytes transferred (${info.bytesOverall} total)`
      );
    });

    await client.ensureDir(remoteDir);
    await client.uploadFromDir(localDir);

    console.log(`✅ Upload concluído: ${localDir}`);
  } catch (error: any) {
    console.error("❌ Erro no upload FTP:", error.message);
    throw error;
  } finally {
    client.close();
  }
}

function saveLog(logData: any[], logType: "success" | "error") {
  const logDir = path.join(__dirname, "..", "logs");
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

  const filePath = path.join(logDir, `${logType}_log.json`);

  let existingData: any[] = [];
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      existingData = JSON.parse(raw);
      if (!Array.isArray(existingData)) existingData = [];
    } catch {
      existingData = [];
    }
  }

  const combinedData = [...existingData, ...logData];
  fs.writeFileSync(filePath, JSON.stringify(combinedData, null, 2));
  console.log(`📁 Log de ${logType} atualizado em: ${filePath}`);
}

export async function fetchAndDownloadHLS(
  pageUrl: string,
  fallbackSlug: string,
  titleOriginal?: string
) {
  const successLog: any[] = [];
  const errorLog: any[] = [];

  try {
    // Substitua por sua lógica de verificação
    // Substitua por sua lógica de verificação
    if (videoAlreadyDownloaded(pageUrl)) {
      console.log(`⚠️ Vídeo já baixado anteriormente (pageUrl: ${pageUrl})`);
      return;
    }

    const { hlsUrl, title, duration, thumbnail, tags, videoId, models } =
      await getHlsUrl(pageUrl);

    const durationSeconds = durationToSeconds(duration);
    console.log(durationSeconds <= 60 * 60);

    const raw = title || fallbackSlug;
    const finalSlug = slugify(titleOriginal, {
      replacement: "-", // substitui espaços por hífen
      remove: /[^a-zA-Z\s]/g, // remove tudo que não for letra ou espaço
      lower: true, // converte para minúsculas
      strict: true, // remove caracteres especiais
      locale: "vi", // define a localidade (importante para acentos)
      trim: true, // remove hífens no início/fim
    });

    const folderPath = path.join(__dirname, "..", "videos", finalSlug);
    const tsListPath = path.join(folderPath, "ts_list_for_concat.txt");
    const finalOutputPath = path.join(
      folderPath,
      `${finalSlug}-not-optimized.mp4`
    );
    const optimizedPath = path.join(folderPath, `${finalSlug}.mp4`);
    const thumbnailPath = path.join(folderPath, `${finalSlug}.jpg`);
    const jsonPath = path.join(folderPath, `info.json`);

    fs.mkdirSync(folderPath, { recursive: true });

    const playlistUrl = await getBestPlaylistUrl(hlsUrl);
    const tsFiles = await getTsFiles(playlistUrl);
    const tsUrls = tsFiles.map((ts) => new URL(ts, playlistUrl).href);

    await downloadTsFiles(tsUrls, folderPath);
    await mergeTsToMp4(folderPath, finalOutputPath);
    await optimizeMp4WithFfmpeg(finalOutputPath, optimizedPath);

    if (thumbnail) {
      const response = await axios.get(thumbnail, {
        responseType: "arraybuffer",
      });
      fs.writeFileSync(thumbnailPath, response.data);
      console.log(`🖼 Thumbnail salva em: ${thumbnailPath}`);
    }

    const slug = slugify(titleOriginal ? titleOriginal : title, {
      replacement: "-",
      lower: true,
      remove: /[!'()*]/g,
    });

    const videoData = {
      title: titleOriginal ? titleOriginal : title,
      slug: finalSlug,
      tags,
      models,
      categories: tags,
      duration: durationSeconds,
      thumbnail: thumbnailPath,
      id: videoId,
      playlist: playlistUrl,
      status: "success",
      message: `Baixado e otimizado em ${optimizedPath}`,
      language: "FR - Francês",
    };

    if (fs.existsSync(finalOutputPath)) {
      try {
        fs.unlinkSync(finalOutputPath);
        console.log(`🗑️ Arquivo removido: ${finalOutputPath}`);
      } catch (err) {
        console.error(
          `❌ Erro ao remover o arquivo: ${(err as Error).message}`
        );
      }
    }

    fs.writeFileSync(jsonPath, JSON.stringify(videoData, null, 2));

    // Remove arquivos .ts
    fs.readdirSync(folderPath).forEach((file) => {
      if (file.endsWith(".ts")) {
        fs.unlinkSync(path.join(folderPath, file));
      }
    });

    const remotePath = path.join(REMOTE_DESTINATION, finalSlug);
    await uploadDirectoryToFtp(folderPath, remotePath);

    // Remove pasta local
    fs.rmSync(folderPath, { recursive: true, force: true });

    successLog.push({ pageUrl, ...videoData });
    console.log(`✅ Processo finalizado para: ${title}`);
  } catch (err: any) {
    console.error(`❌ Erro em ${pageUrl}:`, err.message);
    errorLog.push({
      pageUrl,
      status: "error",
      message: err.message,
    });
  }

  if (successLog.length > 0) saveLog(successLog, "success");
  if (errorLog.length > 0) saveLog(errorLog, "error");
}
