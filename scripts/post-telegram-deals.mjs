// Publica as maiores quedas de preço do dia num canal do Telegram. Reusa
// public/data/price-drops-today.json — mesma fonte real do vídeo diário
// (scripts/generate-daily-video.mjs), gerada por update-price-history.mjs.
// Cada post linka pra NOSSA página do produto, não direto pro lojista —
// mesmo critério do vídeo: leva tráfego pro site (histórico de preço,
// produtos relacionados, newsletter), não passa direto pro afiliado.
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA_DIR = path.join(ROOT, 'public', 'data')
const SITE_DOMAIN = 'comprar.blendibox.com.br'

// Quantas ofertas publicar por dia — canal vira spam se postar todas as
// quedas do dia de uma vez (podem ser dezenas).
const TOP_N = Number(process.env.TELEGRAM_TOP_N || 10)
// Educado com o rate limit da API do Telegram (~1 msg/seg por chat).
const POST_INTERVAL_MS = 1500

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const CHAT_ID = process.env.TELEGRAM_CHAT_ID
if (!BOT_TOKEN || !CHAT_ID) {
  console.error(
    'Erro: defina TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID.\n' + 'Veja o passo a passo em docs/telegram-channel-setup.md.'
  )
  process.exit(1)
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function formatPrice(value, currency) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency || 'BRL' }).format(value)
}

// Emoji por vertical, só cosmético (título do post) — não é dado que possa
// estar "errado", é só um enfeite visual.
const VERTICAL_EMOJI = {
  moda: '👗',
  esporte: '👟',
  eletronicos: '📱',
  casa: '🍳',
  joias: '💍',
  beleza: '💄',
  brinquedos: '🧸',
  livros: '📚',
  pet: '🐾',
  automotivo: '🚗',
  geral: '🛍️',
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function sendPhoto({ photoUrl, caption, link }) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      photo: photoUrl,
      caption,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [[{ text: 'Ver oferta', url: link }]] },
    }),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(JSON.stringify(data))
  return data
}

async function main() {
  // Não é erro: dias sem queda de preço não geram esse arquivo (ver
  // update-price-history.mjs) — não tem o que publicar, tudo certo.
  const dropsPath = path.join(DATA_DIR, 'price-drops-today.json')
  const drops = await readFile(dropsPath, 'utf-8')
    .then(JSON.parse)
    .catch(() => [])
  if (drops.length === 0) {
    console.log('Sem quedas de preço hoje — nada pra publicar no Telegram.')
    return
  }

  // Evita duas ofertas com o mesmo preço final seguidas no canal.
  const seenPrices = new Set()
  const selected = []
  for (const item of drops) {
    if (selected.length >= TOP_N) break
    if (seenPrices.has(item.searchPrice)) continue
    seenPrices.add(item.searchPrice)
    selected.push(item)
  }

  console.log(`Publicando ${selected.length} oferta(s) no Telegram...`)
  let posted = 0
  for (const item of selected) {
    const link = `https://${SITE_DOMAIN}/${item.merchantSlug}/${item.slug}/`
    const emoji = VERTICAL_EMOJI[item.vertical] || '🛍️'
    // "Menor preço já registrado" só entra quando é verdade de fato
    // (isAllTimeLow, calculado contra TODO o histórico rastreado em
    // update-price-history.mjs) — nunca uma frase de efeito genérica tipo
    // "menor preço da semana" sem checar o dado.
    const priceLine = item.isAllTimeLow
      ? 'Menor preço que já vimos pra esse produto.'
      : `Queda de ${item.priceDropPercent}% detectada hoje.`

    const caption =
      `📉 <b>Caiu de preço</b>\n\n` +
      `${emoji} <b>${escapeHtml(item.productName)}</b>\n` +
      `${escapeHtml(item.merchantDisplayName)}\n\n` +
      `De: <s>${escapeHtml(formatPrice(item.previousPrice, item.currency))}</s>\n` +
      `Por: <b>${escapeHtml(formatPrice(item.searchPrice, item.currency))}</b>\n\n` +
      `${priceLine}\n\n` +
      `🔎 Monitorado pelo Compare Ofertas`

    try {
      await sendPhoto({ photoUrl: item.awImageUrl, caption, link })
      posted++
    } catch (err) {
      console.warn(`  [aviso] falhou publicar "${item.productName}": ${err.message}`)
    }
    await sleep(POST_INTERVAL_MS)
  }

  console.log(`\n✅ ${posted}/${selected.length} oferta(s) publicada(s) no Telegram.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
