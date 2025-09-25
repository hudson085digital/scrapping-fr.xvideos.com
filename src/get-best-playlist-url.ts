import axios from "axios";

export async function getBestPlaylistUrl(playlistUrl: string): Promise<string> {
  const HEADERS = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };

  try {
    const response = await axios.get(playlistUrl, { headers: HEADERS });
    const lines = response.data.split("\n");
    const baseUrl = playlistUrl.substring(0, playlistUrl.lastIndexOf("/") + 1);

    let bestPlaylistPath: string | null = null;
    let bestResolution = 0;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("RESOLUTION=")) {
        const resolution = lines[i].split("RESOLUTION=")[1].split(",")[0];
        const nextLine = lines[i + 1]?.trim();

        if (nextLine && nextLine.endsWith(".m3u8")) {
          const [width, height] = resolution.split("x").map(Number);
          const resolutionHeight = height || 0;

          // Considera apenas resoluções abaixo de 720p
          if (resolutionHeight <= 720 && resolutionHeight > bestResolution) {
            bestResolution = resolutionHeight;
            bestPlaylistPath = nextLine;
          }
        }
      }
    }

    if (!bestPlaylistPath) {
      console.error("Nenhuma playlist abaixo de HD encontrada.");
      throw new Error("Nenhuma playlist abaixo de HD encontrada.");
    }

    return baseUrl + bestPlaylistPath;
  } catch (error: any) {
    console.error("Erro ao extrair playlist HLS:", error);
    throw new Error("Erro ao extrair playlist HLS: " + error.message);
  }
}
