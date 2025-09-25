import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'node:fs';

const BASE_CATEGORY = 'new'; // Pode ser: best, new, gay, femdom etc
const BASE_URL = `https://www.xvideos.com/lang/portugues`;
const MAX_LINKS = 1000; // Novo limite
const MAX_PAGES = 1000; // Segurança extra
const DELAY_MS = 1000; // 1 segundo entre as requisições

// Função para adicionar um delay
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function scrapeXvideosCategory() {
  const videoLinks = new Set();

  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const pageUrl = `${BASE_URL}/${page}`;
      console.log(`🔍 Acessando ${pageUrl}`);

      try {
        const { data } = await axios.get(pageUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Accept-Language': 'pt',
          },
        });

        const $ = cheerio.load(data);

        $('a').each((i, el) => {
          const href = $(el).attr('href');
          if (
            href &&
            href.startsWith('/video') &&
            !href.includes('/embedframe/') &&
            !href.includes('popup')
          ) {
            const fullUrl = `https://www.xvideos.com${href}`;
            videoLinks.add(fullUrl);
          }
        });

        console.log(`📦 Total até agora: ${videoLinks.size} links`);

        // Salvamento incremental de tempos em tempos (a cada 1000 links novos)
        if (videoLinks.size % 1000 === 0) {
          fs.writeFileSync('links.txt', Array.from(videoLinks).join('\n'));
          console.log(`💾 Progresso salvo (${videoLinks.size} links)`);
        }

        if (videoLinks.size >= MAX_LINKS) {
          console.log('✅ Limite de links atingido.');
          break;
        }

        // Delay para não sobrecarregar o servidor
        await sleep(DELAY_MS);
      } catch (innerError) {
        console.error(`⚠️ Erro ao acessar a página ${pageUrl}:`, innerError.message);
      }
    }

    // Salvar o resultado final
    fs.writeFileSync('videos-portugues.txt', Array.from(videoLinks).join('\n'));
    console.log(`✅ ${videoLinks.size} links salvos em links.txt`);
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

scrapeXvideosCategory();
