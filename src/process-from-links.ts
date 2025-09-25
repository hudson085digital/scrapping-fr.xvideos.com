import fs from "fs/promises";
import path from "path";
import slugify from "slugify";
import { fetchAndDownloadHLS } from "."; // ajuste o caminho se necessário

function parseDuration(duration: string): number {
  if (!duration) return 0;

  duration = duration.trim();

  // Formato PT01H51M06S
  const isoMatch = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (isoMatch) {
    const hours = parseInt(isoMatch[1] || "0", 10);
    const minutes = parseInt(isoMatch[2] || "0", 10);
    const seconds = parseInt(isoMatch[3] || "0", 10);
    return hours * 3600 + minutes * 60 + seconds;
  }

  // Formato "X h Y min" ou "X h" ou "Y min"
  const humanMatch = duration.match(/(?:(\d+)\s*h)?\s*(?:(\d+)\s*min)?/i);
  if (humanMatch) {
    const hours = parseInt(humanMatch[1] || "0", 10);
    const minutes = parseInt(humanMatch[2] || "0", 10);
    return hours * 3600 + minutes * 60;
  }

  return 0;
}


async function main() {
  const filePath = path.join(__dirname, "..", "videos.json"); // JSON recém-criado

  try {
    const rawData = await fs.readFile(filePath, "utf-8");
    let videos = JSON.parse(rawData);

    // Ordena os vídeos pela duração (crescente)
    videos.sort((a: any, b: any) => parseDuration(a.duration) - parseDuration(b.duration));

    console.log(`🔹 Total de vídeos no JSON: ${videos.length}`);

    for (const video of videos.slice(1000,)) {
      const url = video.url; // pega a URL do vídeo do JSON
      const slug = slugify(video.title || url, {
        replacement: "-",
        lower: true,
        remove: /[!'()*]/g,
      });

      console.log(video.title);

      try {
        console.log(`📥 Processando: ${video.title}`);
        await fetchAndDownloadHLS(url, "fallback", video.title);
        console.log(`✅ Finalizado: ${slug}`);
      } catch (error) {
        console.error(`❌ Erro ao processar ${video.title}:`, error);
      }
    }

    console.log("✅ Todos os vídeos foram processados.");
  } catch (err) {
    console.error("❌ Erro ao ler o arquivo JSON:", err);
  }
}

main();
