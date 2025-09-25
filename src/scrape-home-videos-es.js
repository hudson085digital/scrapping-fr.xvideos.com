import axios from 'axios'
import fs from 'fs/promises'
import { wrapper } from 'axios-cookiejar-support'
import { CookieJar } from 'tough-cookie'
import * as cheerio from 'cheerio'

function convertDurationToSeconds(duration) {
  if (!duration) return 0

  const normalized = duration.includes('min')
    ? `${parseInt(duration)}:00`
    : duration

  const parts = normalized.split(':').map(Number)

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts
    return hours * 3600 + minutes * 60 + seconds
  }

  if (parts.length === 2) {
    const [minutes, seconds] = parts
    return minutes * 60 + seconds
  }

  return parseInt(parts[0]) || 0
}

const jar = new CookieJar()
const client = wrapper(axios.create({ jar, withCredentials: true }))

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
}

async function setCountryAndLanguageToSpanish() {
  try {
    await client.get('https://www.xvideos.com/change-country/es', { headers })
    await client.get('https://www.xvideos.com/change-language/es', { headers })
  } catch (err) {
    console.error('Erro ao alterar país/idioma:', err.message)
    throw err
  }
}

async function scrapeAllVideos(limit = 1000) {
  const videos = []
  let page = 1

  while (videos.length < limit) {
    const url = page === 1
      ? 'https://www.xvideos.com/'
      : `https://www.xvideos.com/new/${page}`

    console.log(`🔄 Buscando página ${page}: ${url}`)

    const { data: html } = await client.get(url, { headers })
    const $ = cheerio.load(html)

    const blocks = $('.thumb-block')

    if (blocks.length === 0) {
      console.warn('⚠️ Nenhum vídeo encontrado nesta página. Encerrando.')
      break
    }

    blocks.each((_, el) => {
      if (videos.length >= limit) return

      const block = $(el)
      const anchor = block.find('p.title a')
      const title = anchor.attr('title')?.trim()
      const href = anchor.attr('href')
      const thumb = block.find('img').attr('data-src') || block.find('img').attr('src')
      const durationText = block.find('.duration').first().text().trim()
      const views = block.find('.metadata').text().replace(/\s+/g, ' ').trim()
      const model = block.find('.metadata .name').text().trim()

      const durationSeconds = convertDurationToSeconds(durationText)

      if (href && title && thumb) {
        videos.push({
          title,
          url: `https://www.xvideos.com${href}`,
          thumbnail: thumb,
          duration: durationText,
          durationSeconds,
          views,
          model,
        })
      }
    })

    page++
  }

  return videos
}

async function main() {
  try {
    console.log('🌍 Definindo país e idioma para ES...')
    await setCountryAndLanguageToSpanish()

    console.log('📥 Iniciando scraping de vídeos...')
    const videos = await scrapeAllVideos(1000)

    console.log(`✅ ${videos.length} vídeos extraídos. Salvando em videos.json...`)
    await fs.writeFile('videos.json', JSON.stringify(videos, null, 2), 'utf-8')
    console.log('📁 Arquivo videos.json salvo com sucesso.')
  } catch (err) {
    console.error('❌ Erro geral:', err.message)
  }
}

main()
