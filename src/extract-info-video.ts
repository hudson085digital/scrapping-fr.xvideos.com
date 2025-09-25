import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import * as cheerio from "cheerio";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function extractVideoData(url: string) {
  try {
    console.log(`🔍 Buscando página: ${url}`);

    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9",
        Cookie: "lang=pt; country=br;",
      },
    });

    const $ = cheerio.load(html);

    // Extrai o conteúdo dos scripts da página
    const scripts = $("script")
      .map((_, el) => $(el).html())
      .get()
      .filter(Boolean);

    const scriptContent = scripts.find((content) =>
      content.includes("setVideoHLS")
    );

    if (!scriptContent) {
      throw new Error("Script com setVideoHLS não encontrado.");
    }

    const hlsUrlMatch = scriptContent.match(
      /setVideoHLS\('(https:\/\/[^']+)'\)/
    );
    if (!hlsUrlMatch || !hlsUrlMatch[1]) {
      throw new Error("URL HLS não encontrada.");
    }

    const extractFromScript = (pattern: RegExp) =>
      pattern.exec(scriptContent)?.[1]?.trim() ?? null;

    const metadataJson = $('script[type="application/ld+json"]').first().text();
    const metadata = metadataJson ? JSON.parse(metadataJson) : {};

    const title = $("title").text().replace(" - XVIDEOS.COM", "").trim();
    const duration = metadata.duration || "";
    const thumbnail = Array.isArray(metadata.thumbnailUrl)
      ? metadata.thumbnailUrl[0]
      : metadata.thumbnailUrl || "";

    const videoId = extractFromScript(/setEncodedIdVideo\(['"]([^'"]+)['"]\)/);

    const models = $(
      ".video-tags-list li.model a, .video-tags-list li.main-uploader a"
    )
      .map((_, el) => {
        const raw = $(el).text().trim();
        return raw.replace(/\s*\d+[.,]?\d*\s*[a-zA-Z]*$/, "").trim();
      })
      .get()
      .filter(Boolean);

    const tags = $(".video-tags-list li:not(.model):not(.main-uploader) a")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter((text) => text && text !== "+" && text !== "Editar tags");

    return {
      hlsUrl: hlsUrlMatch[1],
      title,
      duration,
      thumbnail,
      videoId,
      models,
      tags,
      originalUrl: url,
    };
  } catch (err: any) {
    console.warn(`❌ Erro ao processar ${url}: ${err.message}`);
    return null;
  }
}

async function main() {
  const urlsFile = path.join(__dirname, "..", "videos-portugues.txt");
  const outputFile = path.join(__dirname, "..", "videos-portugues.json");

  try {
    const raw = await fs.readFile(urlsFile, "utf-8");
    const urls = raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));

    const results = [];

    for (const url of urls) {
      const data = await extractVideoData(url);
      if (data) results.push(data);
    }

    await fs.writeFile(outputFile, JSON.stringify(results, null, 2), "utf-8");
    console.log(`✅ Dados salvos em ${outputFile}`);
  } catch (err: any) {
    console.error("❌ Erro ao processar o arquivo:", err.message);
  }
}

main();
