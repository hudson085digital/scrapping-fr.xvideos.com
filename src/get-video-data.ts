import axios from "axios";
import * as cheerio from "cheerio";

const SCRAPER_API_KEY = "19ccc669c154496536ffcace7772606b";

export async function getHlsUrl(pageUrl: string) {
  try {
    console.log(`🔍 Buscando página: ${pageUrl}`);

    const scraperApiUrl = `https://api.scraperapi.com?&api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(
      pageUrl
    )}`;

    const { data: html } = await axios.get(scraperApiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
    });

    const $ = cheerio.load(html);

    const scriptContent =
      $("script")
        .map((_, el) => $(el).html())
        .get()
        .find((content) => content?.includes("setVideoHLS")) || "";

    if (!scriptContent)
      throw new Error("Script com setVideoHLS não encontrado.");

    const hlsUrlMatch = scriptContent.match(
      /setVideoHLS\('(https:\/\/[^']+)'\)/
    );
    if (!hlsUrlMatch || !hlsUrlMatch[1])
      throw new Error("URL HLS não encontrada.");

    const extract = (pattern: RegExp) =>
      pattern.exec(scriptContent)?.[1]?.trim() ?? null;

    const metadataJson = $('script[type="application/ld+json"]').first().text();
    const metadata = metadataJson ? JSON.parse(metadataJson) : {};

    const title = $("title").text().replace(" - XVIDEOS.COM", "");
    const duration = metadata.duration || "";
    const thumbnail = Array.isArray(metadata.thumbnailUrl)
      ? metadata.thumbnailUrl[0]
      : metadata.thumbnailUrl || "";

    const videoId = extract(/new HTML5Player\([^,]+,\s*['"]([^'"]+)['"]\)/);

    const models = $(
      ".video-tags-list li.model a, .video-tags-list li.main-uploader a"
    )
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean);

    const tags = $(".video-tags-list li:not(.model):not(.main-uploader) a")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter((text) => text && text !== "+" && text !== "Edit tags")
      .slice(0, -1); // remove o último item

    console.log({
      hlsUrl: hlsUrlMatch[1],
      title,
      duration,
      thumbnail,
      tags,
      videoId,
      models,
    });
    return {
      hlsUrl: hlsUrlMatch[1],
      title,
      duration,
      thumbnail,
      tags,
      categories: tags,
      videoId,
      models,
    };
  } catch (err: any) {
    console.warn(`❌ Erro ao processar ${pageUrl}: ${err.message}`);
    return null;
  }
}
