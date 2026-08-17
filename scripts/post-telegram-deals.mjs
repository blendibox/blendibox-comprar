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
  const numberEmoji = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
  const lines = items.map((item, i) => {
    const emoji = VERTICAL_EMOJI[item.vertical] || '🛍️'
    return (
      `${numberEmoji[i] || `${i + 1}.`} ${emoji} <a href="${productLink(item)}">${escapeHtml(item.productName)}</a>\n` +
      `De: <s>${escapeHtml(formatPrice(item.previousPrice, item.currency))}</s> por <b>${escapeHtml(formatPrice(item.searchPrice, item.currency))}</b> (-${item.priceDropPercent}%)`
    )
  })

  const text =
    `🔥 <b>Ofertas do dia</b>\n\n` +
    lines.join('\n\n') +
    `\n\n👉 <a href="${SITE_URL}/">Ver todas as ofertas</a>\n` +
    `🔎 Monitorado pelo Compare Ofertas`

  await telegramCall('sendMessage', { text, parse_mode: 'HTML', disable_web_page_preview: true })
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
