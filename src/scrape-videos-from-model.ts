import puppeteer from 'puppeteer';
import fs from 'fs';

async function scrapeXVideosModelVideos() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (compatible; ScraperBot/1.0)');

  // --- Passo 0: trocar país ---
  console.log('Acessando /change-country/es...');
  await page.goto('https://www.xvideos.com/change-country/fr', { waitUntil: 'networkidle2' });

  // --- Passo 1: trocar idioma ---
  console.log('Acessando /change-language/es...');
  await page.goto('https://www.xvideos.com/change-language/fr', { waitUntil: 'networkidle2' });

  const allVideos = [];
  const totalPages = 11; // total de páginas que você mencionou
  for (let i = 1; i <= totalPages; i++) {
    const url = `https://www.xvideos.com/dorcelclub#_tabVideos,page-${i}`;
    console.log(`Acessando página ${i}: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Espera os vídeos carregarem
    await page.waitForSelector('#tabVideos .thumb-block', { timeout: 15000 });

    // Extrai vídeos da página
    const videos = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('#tabVideos .thumb-block')).map(el => {
        const anchor = el.querySelector('.thumb a');
        if (!anchor) return null;
        const href = anchor.href;
        const title = el.querySelector('p.title a')?.innerText || '';
        const thumb = anchor.querySelector('img')?.dataset.src || anchor.querySelector('img')?.src || '';
        const duration = el.querySelector('.duration')?.innerText.trim() || '';
        const views = el.querySelector('.views')?.innerText.trim() || '';
        return { title, url: href, thumbnail: thumb, duration, views };
      }).filter(Boolean);
    });

    console.log(`Extraídos ${videos.length} vídeos nesta página.`);
    allVideos.push(...videos);
  }

  console.log(`Total de vídeos extraídos nesta execução: ${allVideos.length}`);

  // --- Incrementar no JSON existente ---
  let existingVideos = [];
  if (fs.existsSync('videos.json')) {
    try {
      existingVideos = JSON.parse(fs.readFileSync('videos.json', 'utf-8'));
    } catch (err) {
      console.error('Erro ao ler videos.json existente, criando novo.', err.message);
    }
  }

  // Junta e remove duplicados (baseado na URL)
  const mergedVideos = [
    ...existingVideos,
    ...allVideos.filter(v => !existingVideos.some(ev => ev.url === v.url)),
  ];

  fs.writeFileSync('videos.json', JSON.stringify(mergedVideos, null, 2), 'utf-8');
  console.log(`Agora o videos.json contém ${mergedVideos.length} vídeos únicos.`);

  await browser.close();
}

scrapeXVideosModelVideos().catch(console.error);
