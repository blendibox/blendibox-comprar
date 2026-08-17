// Gera um vídeo vertical (1080x1920, formato Shorts/Reels) com as maiores
// quedas de preço do dia, em ranking (#5 → #1) — mesmo dado real que já
// alimenta a home ("Baixou de preço"), sem inventar produto nem número.
// Cada "slide" é montado como SVG (frame + texto) renderizado em PNG via
// sharp, a foto real do produto é baixada e composta por cima, e o ffmpeg
// junta tudo num MP4 silencioso. Não publica em lugar nenhum — só gera o
// arquivo local pra revisão antes de automatizar o upload.
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import sharp from 'sharp'

const execFileAsync = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA_DIR = path.join(ROOT, 'public', 'data')
const OUT_DIR = path.join(ROOT, '.video-tmp')
const FINAL_PATH = path.join(ROOT, 'daily-video.mp4')
const METADATA_PATH = path.join(ROOT, 'daily-video.metadata.json')

const WIDTH = 1080
const HEIGHT = 1920
const TOP_N = 5
// Posição/tamanho do card branco de foto do produto — compartilhado entre
// productFrameSvg (desenha o card) e renderProductSlide (compõe a foto e o
// selo de desconto por cima, nessa ordem, pra o selo não ficar atrás da foto).
const CARD_X = 150
const CARD_Y = 420
const CARD_SIZE = 780
// Mesmo domínio usado em todo o resto do projeto (ver src/config/site.ts,
// scripts/prerender.mjs) — sem "www", sem nome de marca inventado.
const SITE_DOMAIN = 'comprar.blendibox.com.br'
// Duração de cada slide, em segundos (abertura, 5x produto, fechamento).
const OPENING_SECONDS = 3
const PRODUCT_SECONDS = 4
const CLOSING_SECONDS = 5
// Slide de "X° lugar" rápido antes de revelar o produto — cria a pausa de
// suspense (contagem regressiva) que prende a pessoa até o #1. O do #1 fica
// um pouco mais longo, pra segurar a expectativa do "grand finale".
const ANNOUNCE_SECONDS = 1.1
const ANNOUNCE_SECONDS_FINAL = 1.8
// Duração das duas telas finais (CTA de newsletter + stats/link do site).
const NEWSLETTER_SECONDS = 4

// Trilha de fundo (royalty-free, licença confirmada pra esse uso) —
// versionada no repo pra funcionar tanto localmente quanto no GitHub Actions.
const AUDIO_PATH = path.join(ROOT, 'scripts', 'assets', 'daily-video-audio.mp3')
const AUDIO_VOLUME = 0.7
const AUDIO_FADE_SECONDS = 1.5

// Paleta REAL do site (src/index.css) — com uma exceção: o verde do site
// (#0a7d3f) é escuro demais contra o fundo azul-marinho escuro do vídeo
// (baixo contraste, difícil de ler no preço/estatísticas). Usamos uma
// variante mais clara SÓ no vídeo, pro texto ficar legível; o site em si
// não muda.
const COLORS = {
  navy: '#0f172a',
  navyLight: '#1b2947',
  green: '#22c55e',
  pink: '#db2777',
  teal: '#14b8a6',
  white: '#ffffff',
  gray: '#94a3b8',
}

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function formatPrice(value, currency) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency || 'BRL' }).format(value)
}

// Quebra o nome do produto em até `maxLines` linhas de ~`maxChars`
// caracteres, sem lib externa — o bastante pra não estourar o card.
function wrapText(text, maxChars, maxLines) {
  const words = text.split(' ')
  const lines = []
  let current = ''
  for (const w of words) {
    const test = current ? `${current} ${w}` : w
    if (test.length > maxChars && current) {
      lines.push(current)
      current = w
      if (lines.length === maxLines - 1) break
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  if (lines.length > maxLines) lines.length = maxLines
  const last = lines.length - 1
  if (last >= 0 && lines[last].length > maxChars) {
    lines[last] = `${lines[last].slice(0, maxChars - 1)}…`
  }
  return lines
}

function backgroundDecor() {
  // Riscos diagonais decorativos, bem sutis, nas cores da marca — mesmo
  // espírito do storyboard de referência, sem copiar as cores dele.
  return `
    <rect width="${WIDTH}" height="${HEIGHT}" fill="${COLORS.navy}" />
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bgGrad)" />
    <g opacity="0.12" stroke-linecap="round">
      <line x1="80" y1="40" x2="180" y2="140" stroke="${COLORS.teal}" stroke-width="10" />
      <line x1="920" y1="90" x2="1020" y2="190" stroke="${COLORS.pink}" stroke-width="10" />
      <line x1="60" y1="${HEIGHT - 160}" x2="160" y2="${HEIGHT - 60}" stroke="${COLORS.pink}" stroke-width="10" />
      <line x1="940" y1="${HEIGHT - 200}" x2="1040" y2="${HEIGHT - 100}" stroke="${COLORS.teal}" stroke-width="10" />
    </g>`
}

function svgHeader() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    <defs>
      <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${COLORS.navyLight}" stop-opacity="0.6" />
        <stop offset="100%" stop-color="${COLORS.navy}" stop-opacity="0" />
      </linearGradient>
    </defs>`
}

function wordmark(x, y, anchor = 'start') {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Arial, sans-serif" font-size="34" font-weight="700">
    <tspan fill="${COLORS.white}">Compare </tspan><tspan fill="${COLORS.green}">Ofertas</tspan><tspan fill="${COLORS.pink}"> ✱</tspan>
  </text>`
}

function openingSlideSvg(dateLabel) {
  return `${svgHeader()}${backgroundDecor()}
    <circle cx="${WIDTH / 2}" cy="340" r="100" fill="${COLORS.pink}" />
    <text x="${WIDTH / 2}" y="377" text-anchor="middle" font-family="Arial, sans-serif" font-size="96" font-weight="900" fill="${COLORS.white}">%</text>
    <text x="${WIDTH / 2}" y="660" text-anchor="middle" font-family="Arial, sans-serif" font-size="96" font-weight="900" fill="${COLORS.white}">MAIORES</text>
    <text x="${WIDTH / 2}" y="820" text-anchor="middle" font-family="Arial, sans-serif" font-size="96" font-weight="900" fill="${COLORS.pink}">QUEDAS</text>
    <text x="${WIDTH / 2}" y="980" text-anchor="middle" font-family="Arial, sans-serif" font-size="96" font-weight="900" fill="${COLORS.white}">DE PREÇO</text>
    <rect x="${WIDTH / 2 - 190}" y="1040" width="380" height="100" rx="50" fill="${COLORS.green}" />
    <text x="${WIDTH / 2}" y="1108" text-anchor="middle" font-family="Arial, sans-serif" font-size="50" font-weight="800" fill="${COLORS.white}">DO DIA</text>
    <text x="${WIDTH / 2}" y="1440" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" fill="${COLORS.white}">Ofertas <tspan fill="${COLORS.pink}" font-weight="700">reais</tspan>. Descontos de <tspan fill="${COLORS.green}" font-weight="700">verdade</tspan>.</text>
    <text x="${WIDTH / 2}" y="1492" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" fill="${COLORS.teal}">${escapeXml(SITE_DOMAIN)} · ${escapeXml(dateLabel)}</text>
    ${wordmark(WIDTH / 2, HEIGHT - 100, 'middle')}
  </svg>`
}

// Slide rápido de "X° lugar" — só o número, sem produto ainda. É a pausa de
// suspense entre uma revelação e outra (contagem regressiva #5 → #1).
function rankAnnounceSvg(rank) {
  const isFinal = rank === 1
  const teaser = isFinal ? 'E O MAIOR DESCONTO DE HOJE É...' : 'Qual foi o desconto?'
  return `${svgHeader()}${backgroundDecor()}
    <circle cx="${WIDTH / 2}" cy="820" r="220" fill="${COLORS.navyLight}" stroke="${isFinal ? COLORS.pink : COLORS.green}" stroke-width="14" />
    <text x="${WIDTH / 2}" y="870" text-anchor="middle" font-family="Arial, sans-serif" font-size="220" font-weight="900" fill="${COLORS.white}">${rank}º</text>
    <text x="${WIDTH / 2}" y="1140" text-anchor="middle" font-family="Arial, sans-serif" font-size="60" font-weight="900" fill="${isFinal ? COLORS.pink : COLORS.white}">LUGAR</text>
    <text x="${WIDTH / 2}" y="1220" text-anchor="middle" font-family="Arial, sans-serif" font-size="${isFinal ? 36 : 32}" font-weight="${isFinal ? 800 : 400}" fill="${COLORS.gray}">${escapeXml(teaser)}</text>
    ${wordmark(WIDTH / 2, HEIGHT - 100, 'middle')}
  </svg>`
}

function productFrameSvg({ rank, merchant, name, previousPrice, price, currency, dropPercent }) {
  const nameLines = wrapText(name, 24, 2)
  const cardX = CARD_X
  const cardY = CARD_Y
  const cardSize = CARD_SIZE
  return `${svgHeader()}${backgroundDecor()}
    ${wordmark(WIDTH - 50, 110, 'end')}
    <circle cx="150" cy="150" r="95" fill="${COLORS.navy}" stroke="${COLORS.green}" stroke-width="10" />
    <text x="150" y="180" text-anchor="middle" font-family="Arial, sans-serif" font-size="90" font-weight="900" fill="${COLORS.white}">#${rank}</text>
    <rect x="${cardX}" y="${cardY}" width="${cardSize}" height="${cardSize}" rx="36" fill="${COLORS.white}" />
    <rect x="${WIDTH / 2 - 190}" y="1250" width="380" height="64" rx="32" fill="${COLORS.navyLight}" stroke="${COLORS.teal}" stroke-width="2" />
    <text x="${WIDTH / 2}" y="1293" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="${COLORS.teal}">${escapeXml(merchant.toUpperCase())}</text>
    <text x="${WIDTH / 2}" y="1370" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="800" fill="${COLORS.white}">
      ${nameLines.map((l, i) => `<tspan x="${WIDTH / 2}" dy="${i === 0 ? 0 : 52}">${escapeXml(l)}</tspan>`).join('')}
    </text>
    <text x="${WIDTH / 2}" y="${nameLines.length > 1 ? 1490 : 1450}" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="${COLORS.gray}" text-decoration="line-through">DE: ${escapeXml(formatPrice(previousPrice, currency))}</text>
    <text x="${WIDTH / 2}" y="${nameLines.length > 1 ? 1535 : 1495}" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="${COLORS.teal}">POR</text>
    <text x="${WIDTH / 2}" y="${nameLines.length > 1 ? 1615 : 1575}" text-anchor="middle" font-family="Arial, sans-serif" font-size="72" font-weight="900" fill="${COLORS.green}">${escapeXml(formatPrice(price, currency))}</text>
    <rect x="${WIDTH / 2 - 170}" y="${nameLines.length > 1 ? 1650 : 1610}" width="340" height="86" rx="43" fill="${COLORS.pink}" />
    <text x="${WIDTH / 2}" y="${nameLines.length > 1 ? 1705 : 1665}" text-anchor="middle" font-family="Arial, sans-serif" font-size="38" font-weight="800" fill="${COLORS.white}">↓ ${dropPercent}% de desconto</text>
  </svg>`
}

// Sino estilizado (silhueta simples, sem depender de fonte de emoji/ícone
// externo — sharp/resvg não garante emoji colorido).
function bellIcon(cx, cy, color) {
  return `<g transform="translate(${cx},${cy})">
    <rect x="-7" y="-78" width="14" height="20" rx="7" fill="${color}" />
    <path d="M0,-62 C-38,-62 -55,-30 -55,8 L-68,46 L68,46 L55,8 C55,-30 38,-62 0,-62 Z" fill="${color}" />
    <circle cx="0" cy="62" r="15" fill="${color}" />
  </g>`
}

// Tela "encerramento": CTA pra newsletter, reaproveitando a copy real já
// usada no site (TopBar.tsx) e os benefícios reais do Footer.tsx — nada de
// "cupons exclusivos" (cupons vêm do feed público da Awin, não são
// exclusivos nossos).
function newsletterCtaSlideSvg() {
  const benefit = (y, title, text, color) => `
    <circle cx="180" cy="${y}" r="14" fill="${color}" />
    <text x="230" y="${y + 8}" font-family="Arial, sans-serif" font-size="34" font-weight="800" fill="${COLORS.white}">${escapeXml(title)}</text>
    <text x="230" y="${y + 42}" font-family="Arial, sans-serif" font-size="24" fill="${COLORS.gray}">${escapeXml(text)}</text>`
  return `${svgHeader()}${backgroundDecor()}
    <circle cx="${WIDTH / 2}" cy="440" r="140" fill="${COLORS.navyLight}" stroke="${COLORS.pink}" stroke-width="10" />
    ${bellIcon(WIDTH / 2, 440, COLORS.white)}
    <text x="${WIDTH / 2}" y="700" text-anchor="middle" font-family="Arial, sans-serif" font-size="56" font-weight="900" fill="${COLORS.white}">Não perca as</text>
    <text x="${WIDTH / 2}" y="770" text-anchor="middle" font-family="Arial, sans-serif" font-size="56" font-weight="900" fill="${COLORS.pink}">próximas ofertas!</text>
    <text x="${WIDTH / 2}" y="870" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" fill="${COLORS.gray}">Cupons e as maiores quedas de</text>
    <text x="${WIDTH / 2}" y="912" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" fill="${COLORS.gray}">preço da semana no seu e-mail.</text>
    ${benefit(1040, 'Atualizado diariamente', 'Preços monitorados todo dia', COLORS.teal)}
    ${benefit(1150, 'Cupons oficiais', 'Direto das lojas parceiras', COLORS.green)}
    ${benefit(1260, 'Histórico de preço', 'Veja se a oferta é boa de verdade', COLORS.pink)}
    <text x="${WIDTH / 2}" y="1440" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" fill="${COLORS.gray}">Sem spam · cancele quando quiser</text>
    ${wordmark(WIDTH / 2, HEIGHT - 100, 'middle')}
  </svg>`
}

// Tela "fechamento": números reais do dia + link do site.
function statsCtaSlideSvg({ totalProducts, merchantsCount, priceDropsCount }) {
  const stat = (y, value, label) => `
    <text x="${WIDTH / 2}" y="${y}" text-anchor="middle" font-family="Arial, sans-serif" font-size="64" font-weight="900" fill="${COLORS.green}">${escapeXml(value)}</text>
    <text x="${WIDTH / 2}" y="${y + 46}" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" fill="${COLORS.gray}">${escapeXml(label)}</text>`
  return `${svgHeader()}${backgroundDecor()}
    <text x="${WIDTH / 2}" y="600" text-anchor="middle" font-family="Arial, sans-serif" font-size="52" font-weight="800" fill="${COLORS.white}">Quer receber esses</text>
    <text x="${WIDTH / 2}" y="670" text-anchor="middle" font-family="Arial, sans-serif" font-size="52" font-weight="800" fill="${COLORS.white}">alertas todo dia?</text>
    ${stat(870, totalProducts.toLocaleString('pt-BR'), 'produtos monitorados')}
    ${stat(1030, String(merchantsCount), 'lojas parceiras')}
    ${stat(1190, priceDropsCount.toLocaleString('pt-BR'), 'preços em queda hoje')}
    <rect x="${WIDTH / 2 - 320}" y="1340" width="640" height="110" rx="55" fill="${COLORS.pink}" />
    <text x="${WIDTH / 2}" y="1410" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" font-weight="800" fill="${COLORS.white}">${SITE_DOMAIN}</text>
    <text x="${WIDTH / 2}" y="1500" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="${COLORS.gray}">Contém links de afiliado</text>
    ${wordmark(WIDTH / 2, HEIGHT - 100, 'middle')}
  </svg>`
}

// Selo de desconto rosa, renderizado à parte pra ser composto POR CIMA da
// foto do produto (se ficasse dentro do frame base, a foto — composta depois
// — cobriria o pedaço do selo que invade a área da imagem).
function discountBadgeSvg(dropPercent) {
  const label = `-${dropPercent}%`
  const fontSize = label.length > 6 ? 32 : 40
  return `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220">
    <circle cx="110" cy="110" r="100" fill="${COLORS.pink}" stroke="${COLORS.navy}" stroke-width="8" />
    <text x="110" y="90" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="900" fill="${COLORS.white}">↓</text>
    <text x="110" y="152" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="900" fill="${COLORS.white}">${label}</text>
  </svg>`
}

async function fetchImageBuffer(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

async function renderProductSlide(item, rank, outPath) {
  const frameSvg = productFrameSvg({
    rank,
    merchant: item.merchantDisplayName,
    name: item.productName,
    previousPrice: item.previousPrice,
    price: item.searchPrice,
    currency: item.currency,
    dropPercent: item.priceDropPercent,
  })
  const framePng = await sharp(Buffer.from(frameSvg)).png().toBuffer()

  let photoBuffer = null
  try {
    const raw = await fetchImageBuffer(item.awImageUrl)
    photoBuffer = await sharp(raw)
      .resize(700, 700, { fit: 'contain', background: '#ffffff' })
      .png()
      .toBuffer()
  } catch (err) {
    console.warn(`  [aviso] falhou baixar imagem de "${item.productName}": ${err.message} — segue sem foto`)
  }

  const badgeBuffer = await sharp(Buffer.from(discountBadgeSvg(item.priceDropPercent))).png().toBuffer()
  const badgeCx = CARD_X + CARD_SIZE
  const badgeCy = CARD_Y + 130

  // Ordem importa: a foto vai primeiro, o selo por cima — senão a foto
  // (composta depois) cobriria o pedaço do selo que invade o card.
  const composite = [
    ...(photoBuffer ? [{ input: photoBuffer, left: 190, top: 460 }] : []),
    { input: badgeBuffer, left: badgeCx - 110, top: badgeCy - 110 },
  ]
  await sharp(framePng).composite(composite).png().toFile(outPath)
}

// Título/descrição pro upload no YouTube — só com números e marcas reais do
// dia. Nunca cita uma marca que não apareceu no vídeo, nem um total de
// produtos desatualizado (armadilhas fáceis de cair copiando um texto
// genérico pronto).
function buildVideoMetadata({ drops, shortDate, dateLabel, totalProducts, merchantsCount }) {
  const uniqueMerchants = [...new Map(drops.map((d) => [d.merchantSlug, d.merchantDisplayName])).values()]
  const soleMerchant = uniqueMerchants.length === 1 ? uniqueMerchants[0] : null

  const title = soleMerchant
    ? `🔥 ${soleMerchant}: as ${drops.length} Maiores Quedas de Preço de Hoje | ${shortDate}`
    : `🔥 As ${drops.length} Maiores Quedas de Preço de Hoje | ${shortDate}`

  const merchantTags = [...new Set(drops.map((d) => `#${d.merchantSlug}`))]
  const tags = ['#ofertas', '#promocao', '#desconto', '#precobaixo', ...merchantTags]

  const description = `🔥 Confira as maiores quedas de preço encontradas hoje pelo Compare Ofertas.

Monitoramos mais de ${Math.floor(totalProducts / 1000)} mil produtos em ${merchantsCount} lojas parceiras pra encontrar ofertas reais — o preço que baixou de verdade, com base no nosso histórico de monitoramento (não uma etiqueta "promoção" qualquer).

Neste vídeo você vê:
✓ Os produtos com maior desconto do dia (${dateLabel})
✓ Preço anterior e preço atual
✓ Percentual de queda real

🔎 Compare preços: https://${SITE_DOMAIN}
🎁 Lista de presentes: https://${SITE_DOMAIN}/lista-de-presentes
🎟️ Cupons oficiais: https://${SITE_DOMAIN}/cupons

⚠️ Contém links de afiliado.

${tags.join(' ')}`

  return { title, description, tags }
}

async function main() {
  // price-drops-today.json (não home-highlights.json) — só produtos que
  // caíram de preço HOJE de verdade (comparado ao último preço conhecido),
  // não a janela de 7 dias usada pelo selo do site. Evita repetir o mesmo
  // produto em dias seguidos, já que algo que caiu há 3 dias e ficou parado
  // desde então não entra aqui, mesmo ainda "em queda" pra janela semanal.
  const priceDropsToday = JSON.parse(await readFile(path.join(DATA_DIR, 'price-drops-today.json'), 'utf-8'))
  const meta = JSON.parse(await readFile(path.join(DATA_DIR, 'meta.json'), 'utf-8'))
  const merchants = JSON.parse(await readFile(path.join(DATA_DIR, 'merchants.json'), 'utf-8'))

  // Evita mostrar dois produtos com o mesmo preço final lado a lado no vídeo
  // (fica estranho no ranking) — pula duplicatas de preço, mantendo a ordem
  // original (já vem ordenado por priceDropPercent desc).
  const seenPrices = new Set()
  const drops = []
  for (const item of priceDropsToday) {
    if (drops.length >= TOP_N) break
    if (seenPrices.has(item.searchPrice)) continue
    seenPrices.add(item.searchPrice)
    drops.push(item)
  }
  if (drops.length === 0) {
    console.log('Sem quedas de preço hoje — nada pra gerar.')
    return
  }

  await rm(OUT_DIR, { recursive: true, force: true })
  await mkdir(OUT_DIR, { recursive: true })

  const dateLabel = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const shortDate = new Date().toLocaleDateString('pt-BR')

  const slides = []

  const openingPath = path.join(OUT_DIR, 'slide-00-opening.png')
  await sharp(Buffer.from(openingSlideSvg(dateLabel))).png().toFile(openingPath)
  slides.push({ file: openingPath, seconds: OPENING_SECONDS })

  // Ranking em contagem regressiva: o maior desconto por último (#1), pra
  // gerar expectativa — mesma lógica que o storyboard de referência sugeriu.
  // Cada posição ganha um slide de "X° lugar" (só o número, suspense) antes
  // da revelação do produto em si.
  const ranked = [...drops].reverse()
  for (let i = 0; i < ranked.length; i++) {
    const rank = ranked.length - i
    const item = ranked[i]
    const isFinal = rank === 1

    const announcePath = path.join(OUT_DIR, `slide-${String(i + 1).padStart(2, '0')}a-announce${rank}.png`)
    await sharp(Buffer.from(rankAnnounceSvg(rank))).png().toFile(announcePath)
    slides.push({ file: announcePath, seconds: isFinal ? ANNOUNCE_SECONDS_FINAL : ANNOUNCE_SECONDS })

    const file = path.join(OUT_DIR, `slide-${String(i + 1).padStart(2, '0')}b-rank${rank}.png`)
    console.log(`Gerando slide #${rank}: ${item.productName} (${item.merchantDisplayName}, -${item.priceDropPercent}%)...`)
    await renderProductSlide(item, rank, file)
    slides.push({ file, seconds: PRODUCT_SECONDS })
  }

  const newsletterPath = path.join(OUT_DIR, 'slide-98-newsletter.png')
  await sharp(Buffer.from(newsletterCtaSlideSvg())).png().toFile(newsletterPath)
  slides.push({ file: newsletterPath, seconds: NEWSLETTER_SECONDS })

  const closingPath = path.join(OUT_DIR, 'slide-99-closing.png')
  await sharp(
    Buffer.from(
      statsCtaSlideSvg({
        totalProducts: meta.totalProducts,
        merchantsCount: merchants.length,
        priceDropsCount: priceDropsToday.length,
      })
    )
  )
    .png()
    .toFile(closingPath)
  slides.push({ file: closingPath, seconds: CLOSING_SECONDS })

  // Lista pro demuxer "concat" do ffmpeg. Repete a última entrada sem
  // duration — exigência conhecida do ffmpeg pra o último frame realmente
  // durar o tempo pedido (senão ele aparece só por um instante).
  const listPath = path.join(OUT_DIR, 'list.txt')
  const listLines = slides.flatMap((s) => [`file '${s.file.replace(/'/g, "'\\''")}'`, `duration ${s.seconds}`])
  listLines.push(`file '${slides[slides.length - 1].file.replace(/'/g, "'\\''")}'`)
  await writeFile(listPath, listLines.join('\n'))

  const totalSeconds = slides.reduce((sum, s) => sum + s.seconds, 0)

  let hasAudio = false
  try {
    await readFile(AUDIO_PATH)
    hasAudio = true
  } catch {
    console.log('  [aviso] trilha de áudio não encontrada — gerando vídeo silencioso.')
  }

  console.log('Montando o vídeo com ffmpeg...')
  const fadeStart = Math.max(0, totalSeconds - AUDIO_FADE_SECONDS)
  await execFileAsync('ffmpeg', [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', listPath,
    ...(hasAudio ? ['-i', AUDIO_PATH] : []),
    '-fps_mode', 'cfr',
    '-pix_fmt', 'yuv420p',
    '-r', '30',
    ...(hasAudio
      ? [
          '-filter_complex',
          `[1:a]volume=${AUDIO_VOLUME},afade=t=out:st=${fadeStart.toFixed(2)}:d=${AUDIO_FADE_SECONDS}[aout]`,
          '-map', '0:v',
          '-map', '[aout]',
          '-shortest',
          '-c:a', 'aac',
          '-b:a', '192k',
        ]
      : []),
    '-c:v', 'libx264',
    FINAL_PATH,
  ])

  const metadata = buildVideoMetadata({
    drops,
    shortDate,
    dateLabel,
    totalProducts: meta.totalProducts,
    merchantsCount: merchants.length,
  })
  await writeFile(METADATA_PATH, JSON.stringify(metadata, null, 2))

  console.log(`\nVídeo gerado: ${FINAL_PATH} (~${totalSeconds}s, ${slides.length} slides, ${hasAudio ? 'com' : 'sem'} áudio).`)
  console.log(`Metadados (título/descrição) gravados em: ${METADATA_PATH}`)
  console.log(`\nTítulo: ${metadata.title}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
