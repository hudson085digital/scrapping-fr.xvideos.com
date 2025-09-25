import axios from "axios";

export async function getTsFiles(m3u8Url) {
  const { data } = await axios.get(m3u8Url);
  const lines = data.split('\n');
  const tsFiles = [];

  // Procurar por linhas que indicam os segmentos .ts
  lines.forEach((line: string) => {
    if (line.endsWith('.ts')) {
      tsFiles.push(line);
    }
  });

  return tsFiles;
}