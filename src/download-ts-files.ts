import axios from 'axios';
import path from 'node:path';
import fs from 'node:fs';

export async function downloadTsFiles(tsUrls, outputDir) {
  const downloadPromises = tsUrls.map(async (tsUrl, index) => {
    const tsFileName = `segment${index}.ts`;
    const tsFilePath = path.join(outputDir, tsFileName);

    // Baixando o segmento .ts
    const { data } = await axios.get(tsUrl, { responseType: 'arraybuffer' });

    fs.writeFileSync(tsFilePath, Buffer.from(data));
    console.log(`Segmento ${index} baixado: ${tsFileName}`);
  });

  await Promise.all(downloadPromises);
  console.log('Todos os segmentos .ts foram baixados.');
}