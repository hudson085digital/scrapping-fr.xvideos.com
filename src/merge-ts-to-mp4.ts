import fs from "node:fs";
import path from "node:path";
import { exec } from 'child_process';

// Função para criar o arquivo de lista de arquivos .ts para o concat demuxer
async function createTsListForConcat(outputDir, tsFiles) {
  const tsListPath = path.join(outputDir, 'ts_list_for_concat.txt');
  const tsListContent = tsFiles
    .map((file) => `file '${path.join(outputDir, file)}'`)
    .join('\n');
  
  fs.writeFileSync(tsListPath, tsListContent);
  console.log('Arquivo de lista criado para concat demuxer:', tsListPath);
  return tsListPath;
} 

// Função para unir os arquivos .ts e gerar o arquivo .mp4 (Agora assíncrona)
export async function mergeTsToMp4(outputDir, finalOutputPath) {
  const tsFiles = fs.readdirSync(outputDir).filter(file => file.endsWith('.ts'));

  // Criar o arquivo de lista para o ffmpeg
  const listFilePath = await createTsListForConcat(outputDir, tsFiles);

  // Comando ffmpeg para concatenar os arquivos .ts e gerar o .mp4
  const ffmpegCommand = `ffmpeg -f concat -safe 0 -i ${listFilePath} -c copy -y ${finalOutputPath}`;

  // Função para executar o comando ffmpeg e retornar uma Promise
  const execPromise = new Promise((resolve, reject) => {
    exec(ffmpegCommand, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`Erro durante o processamento do ffmpeg: ${err.message}`));
        return;
      }
      resolve(stdout);
    });
  });

  try {
    const result = await execPromise; // Aguarda a conclusão do processo
    console.log('Processo concluído! Vídeo gerado com sucesso.');
    console.log('stdout:', result);
  } catch (error) {
    console.error(error.message);
  }
}
