// Publica ofertas do dia num canal do Telegram. Reusa data/price-drops-today.json
// (cópia pequena e versionada de public/data/price-drops-today.json, gerada
// por update-price-history.mjs — mesma fonte real do vídeo diário) pra essa
// run poder ser um simples checkout + post, sem rebuscar o feed inteiro.
//
// Dois modos (ver .github/workflows/telegram-deals.yml):
//   single (padrão) — 1 oferta avulsa, publicada com foto. Pensado pro
//     horário de almoço (12h15 BRT).
//   digest — resumo em texto com as próximas N ofertas (pula a #1, que já
//     foi publicada no post "single" mais cedo no mesmo dia — evita repetir
//     o mesmo produto duas vezes). Pensado pro fim de tarde (19h30 BRT).
//
// Cada link aponta pra NOSSA página do produto, não direto pro lojista —
// mesmo critério do vídeo: leva tráfego pro site, não passa direto pro
// afiliado.
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SITE_DOMAIN = 'comprar.blendibox.com.br'
const SITE_URL = `https://${SITE_DOMAIN}`

const MODE = process.env.TELEGRAM_MODE === 'digest' ? 'digest' : 'single'
const DIGEST_SIZE = Number(process.env.TELEGRAM_DIGEST_SIZE || 5)
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

// Emoji por vertical, só cosmético — não é dado que possa estar "errado", é
// só um enfeite visual no título do post.
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

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function truncate(text, max) {
  const s = String(text ?? '')
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

async function fetchImageBuffer(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

// Mesmas cores do vídeo diário (scripts/generate-daily-video.mjs) — verde
// mais vivo que o real do site, só pra contrastar em fundo escuro.
const IMG_COLORS = { navy: '#0f172a', green: '#22c55e', pink: '#db2777', teal: '#14b8a6', white: '#ffffff', gray: '#94a3b8' }
const IMG_WIDTH = 1080
const ROW_H = 210
const HEADER_H = 150
const FOOTER_H = 100
const THUMB = 170
const PAD = 40
const RANK_W = 90

// Imagem única listando as ofertas do resumo — sem isso o post "digest"
// (sendMessage) saía só com texto e link, nenhuma imagem (o motivo do
// usuário ter reportado "ofertas do dia sem imagem"). Compõe as fotos reais
// de cada produto numa única imagem, mesma técnica SVG+sharp do vídeo.
async function buildDigestImage(items) {
  const height = HEADER_H + ROW_H * items.length + FOOTER_H

  const rowsSvg = items
    .map((item, i) => {
      const y = HEADER_H + ROW_H * i
      const rowMid = y + ROW_H / 2
      const thumbTop = y + (ROW_H - THUMB) / 2
      const thumbLeft = PAD + RANK_W
      const textX = thumbLeft + THUMB + 30
      return `
        <circle cx="${PAD + RANK_W / 2}" cy="${rowMid}" r="30" fill="${IMG_COLORS.pink}" />
        <text x="${PAD + RANK_W / 2}" y="${rowMid + 11}" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" font-weight="900" fill="${IMG_COLORS.white}">${i + 1}</text>
        <rect x="${thumbLeft}" y="${thumbTop}" width="${THUMB}" height="${THUMB}" rx="14" fill="${IMG_COLORS.white}" />
        <text x="${textX}" y="${rowMid - 32}" font-family="Arial, sans-serif" font-size="32" font-weight="800" fill="${IMG_COLORS.white}">${escapeXml(truncate(item.productName, 34))}</text>
        <text x="${textX}" y="${rowMid + 4}" font-family="Arial, sans-serif" font-size="24" fill="${IMG_COLORS.teal}">${escapeXml(item.merchantDisplayName)}</text>
        <text x="${textX}" y="${rowMid + 42}" font-family="Arial, sans-serif" font-size="26" fill="${IMG_COLORS.gray}" text-decoration="line-through">${escapeXml(formatPrice(item.previousPrice, item.currency))}</text>
        <text x="${textX + 150}" y="${rowMid + 44}" font-family="Arial, sans-serif" font-size="32" font-weight="900" fill="${IMG_COLORS.green}">${escapeXml(formatPrice(item.searchPrice, item.currency))}</text>
        <text x="${IMG_WIDTH - PAD}" y="${rowMid + 10}" text-anchor="end" font-family="Arial, sans-serif" font-size="30" font-weight="800" fill="${IMG_COLORS.pink}">-${item.priceDropPercent}%</text>
        ${i < items.length - 1 ? `<line x1="${PAD}" y1="${y + ROW_H}" x2="${IMG_WIDTH - PAD}" y2="${y + ROW_H}" stroke="${IMG_COLORS.gray}" stroke-width="1" opacity="0.2" />` : ''}
      `
    })
    .join('')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${IMG_WIDTH}" height="${height}" viewBox="0 0 ${IMG_WIDTH} ${height}">
    <rect width="${IMG_WIDTH}" height="${height}" fill="${IMG_COLORS.navy}" />
    <text x="${IMG_WIDTH / 2}" y="95" text-anchor="middle" font-family="Arial, sans-serif" font-size="56" font-weight="900" fill="${IMG_COLORS.white}">🔥 Ofertas do dia</text>
    ${rowsSvg}
    <text x="${IMG_WIDTH / 2}" y="${height - 35}" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="700">
      <tspan fill="${IMG_COLORS.white}">Compare </tspan><tspan fill="${IMG_COLORS.green}">Ofertas</tspan><tspan fill="${IMG_COLORS.pink}"> ✱</tspan>
    </text>
  </svg>`

  const framePng = await sharp(Buffer.from(svg)).png().toBuffer()

  const composites = []
  for (let i = 0; i < items.length; i++) {
    const y = HEADER_H + ROW_H * i
    const thumbTop = y + (ROW_H - THUMB) / 2
    try {
      const raw = await fetchImageBuffer(items[i].awImageUrl)
      const thumb = await sharp(raw)
        .resize(THUMB - 16, THUMB - 16, { fit: 'contain', background: '#ffffff' })
        .png()
        .toBuffer()
      composites.push({ input: thumb, left: PAD + RANK_W + 8, top: thumbTop + 8 })
    } catch (err) {
      console.warn(`  [aviso] falhou baixar imagem de "${items[i].productName}": ${err.message} — segue sem foto nessa linha`)
    }
  }

  return sharp(framePng).composite(composites).png().toBuffer()
}

// sendPhoto com um Buffer local precisa de multipart/form-data (a versão
// JSON de telegramCall só aceita URL). FormData/Blob globais do Node 18+
// cobrem isso sem dependência extra.
async function sendPhotoBuffer({ buffer, caption, replyMarkup }) {
  const form = new FormData()
  form.append('chat_id', CHAT_ID)
  form.append('caption', caption)
  form.append('parse_mode', 'HTML')
  if (replyMarkup) form.append('reply_markup', JSON.stringify(replyMarkup))
  form.append('photo', new Blob([buffer], { type: 'image/png' }), 'ofertas-do-dia.png')

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, { method: 'POST', body: form })
  const data = await res.json()
  if (!data.ok) throw new Error(JSON.stringify(data))
  return data
}

async function telegramCall(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, ...body }),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(JSON.stringify(data))
  return data
}

function productLink(item) {
  return `${SITE_URL}/${item.merchantSlug}/${item.slug}/`
}

async function postSingle(item) {
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

  await telegramCall('sendPhoto', {
    photo: item.awImageUrl,
    caption,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: [[{ text: 'Ver oferta', url: productLink(item) }]] },
  })
}

async function postDigest(items) {
  // Nome/preço/desconto de cada item já aparecem na imagem (buildDigestImage)
  // — a legenda fica curta de propósito (limite de 1024 caracteres em foto,
  // bem menor que o de mensagem de texto). O clique em cada oferta vem do
  // teclado inline, um botão por produto, não de link dentro do texto.
  const caption =
    `🔥 <b>Ofertas do dia</b>\n\n` +
    `As maiores quedas de preço que encontramos hoje.\n\n` +
    `🔎 Monitorado pelo Compare Ofertas`

  const buttons = items.map((item, i) => [{ text: `${i + 1}. ${truncate(item.productName, 40)}`, url: productLink(item) }])
  buttons.push([{ text: 'Ver todas as ofertas', url: `${SITE_URL}/` }])

  const image = await buildDigestImage(items)
  await sendPhotoBuffer({ buffer: image, caption, replyMarkup: { inline_keyboard: buttons } })
}

async function main() {
  // Não é erro: dias sem queda de preço não geram esse arquivo (ver
  // update-price-history.mjs) — não tem o que publicar, tudo certo.
  const dropsPath = path.join(ROOT, 'data', 'price-drops-today.json')
  const drops = await readFile(dropsPath, 'utf-8')
    .then(JSON.parse)
    .catch(() => [])
  if (drops.length === 0) {
    console.log('Sem quedas de preço hoje — nada pra publicar no Telegram.')
    return
  }

  // Evita duas ofertas com o mesmo preço final na mesma seleção.
  const seenPrices = new Set()
  const ranked = []
  for (const item of drops) {
    if (seenPrices.has(item.searchPrice)) continue
    seenPrices.add(item.searchPrice)
    ranked.push(item)
  }

  if (MODE === 'single') {
    const item = ranked[0]
    if (!item) {
      console.log('Sem oferta pra publicar.')
      return
    }
    console.log(`Publicando 1 oferta avulsa: "${item.productName}"...`)
    await postSingle(item)
    console.log('\n✅ Oferta publicada no Telegram.')
    return
  }

  // digest: pula a #1 (já publicada no post "single" mais cedo no mesmo dia)
  // e resume as próximas DIGEST_SIZE num post só.
  const items = ranked.slice(1, 1 + DIGEST_SIZE)
  if (items.length === 0) {
    console.log('Sem ofertas suficientes pro resumo do dia (só a #1, já publicada antes).')
    return
  }
  console.log(`Publicando resumo com ${items.length} oferta(s)...`)
  await postDigest(items)
  console.log('\n✅ Resumo publicado no Telegram.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
