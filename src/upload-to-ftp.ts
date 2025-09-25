import { Client } from 'basic-ftp';  // Aqui já não é mais a classe, é uma função
const FTP_HOST = '94.102.49.200';
const FTP_PORT = 201;
const FTP_USER = 'mediaau4';
const FTP_PASSWORD = 'e-lnfQo1YcOpfcEs';
const FTP_PATH = 'porno-carioca';
const REMOTE_DESTINATION = '/web/media.aurora5.com/public_html/public_html/xvideosporno.blog.br';


// Função para fazer o upload de toda a pasta para o FTP
export async function uploadDirectoryToFtp(localDir: string, remoteDir: string): Promise<void> {
  const client = new Client();

  try {
    // Acesso ao servidor FTP
    await client.access({
      host: FTP_HOST,
      port: FTP_PORT,
      user: FTP_USER,
      password: FTP_PASSWORD,
    });

    // Muda para o diretório remoto onde os arquivos serão enviados
    await client.ensureDir(remoteDir);  // Garante que o diretório remoto exista
    await client.clearWorkingDir();  // Limpa o diretório de trabalho remoto, se necessário

    console.log(`Fazendo upload da pasta ${localDir} para o FTP em ${remoteDir}...`);
    
    // Faz o upload de todos os arquivos e subdiretórios da pasta local para o FTP
    await client.uploadFromDir(localDir);

    console.log(`Upload da pasta ${localDir} para o FTP concluído.`);

  } catch (error) {
    console.error('Erro ao fazer upload da pasta para o FTP:', error.message);
  } finally {
    client.close();
  }
}
