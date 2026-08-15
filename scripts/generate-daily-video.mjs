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

const WIDTH = 1080
const HEIGHT = 1920
const TOP_N = 5
// Mesmo domínio usado em todo o resto do projeto (ver src/config/site.ts,
// scripts/prerender.mjs) — sem "www", sem nome de marca inventado.
const SITE_DOMAIN = 'comprar.blendibox.com.br'
// Duração de cada slide, em segundos (abertura, 5x produto, fechamento).
const OPENING_SECONDS = 3
const PRODUCT_SECONDS = 4
const CLOSING_SECONDS = 5

// Trilha de fundo (royalty-free, baixada localmente pelo usuário). Caminho
// fixo da máquina local só pra teste — pra automatizar no CI, precisa virar
// um arquivo versionado no repo (com a licença confirmada) ou buscado de
// algum storage acessível pelo GitHub Actions, não um caminho local.
const AUDIO_PATH = 'C:\\Users\\blendibox\\Downloads\\paulyudin-promo-promo-music-574008.mp3'
const AUDIO_VOLUME = 0.7
const AUDIO_FADE_SECONDS = 1.5

// Paleta REAL do site (src/index.css), não uma aproximação.
const COLORS = {
  navy: '#0f172a',
  navyLight: '#1b2947',
  green: '#0a7d3f',
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
    <text x="${WIDTH / 2}" y="720" text-anchor="middle" font-family="Arial, sans-serif" font-size="64" font-weight="900" fill="${COLORS.pink}">↓ %</text>
    <text x="${WIDTH / 2}" y="880" text-anchor="middle" font-family="Arial, sans-serif" font-size="86" font-weight="900" fill="${COLORS.white}">MAIORES QUEDAS</text>
    <text x="${WIDTH / 2}" y="980" text-anchor="middle" font-family="Arial, sans-serif" font-size="86" font-weight="900" fill="${COLORS.pink}">DE PREÇO</text>
    <rect x="${WIDTH / 2 - 180}" y="1030" width="360" height="90" rx="45" fill="${COLORS.green}" />
    <text x="${WIDTH / 2}" y="1090" text-anchor="middle" font-family="Arial, sans-serif" font-size="46" font-weight="800" fill="${COLORS.white}">DO DIA</text>
    <text x="${WIDTH / 2}" y="1190" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" fill="${COLORS.gray}">Ofertas reais. Descontos de verdade.</text>
    <text x="${WIDTH / 2}" y="1240" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" fill="${COLORS.teal}">${escapeXml(SITE_DOMAIN)} · ${escapeXml(dateLabel)}</text>
    ${wordmark(WIDTH / 2, HEIGHT - 100, 'middle')}
  </svg>`
}

function productFrameSvg({ rank, merchant, name, previousPrice, price, currency, dropPercent }) {
  const nameLines = wrapText(name, 24, 2)
  const cardX = 150
  const cardY = 420
  const cardSize = 780
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
    <text x="${WIDTH / 2}" y="${nameLines.length > 1 ? 1500 : 1460}" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" fill="${COLORS.gray}" text-decoration="line-through">DE ${escapeXml(formatPrice(previousPrice, currency))}</text>
    <text x="${WIDTH / 2}" y="${nameLines.length > 1 ? 1590 : 1550}" text-anchor="middle" font-family="Arial, sans-serif" font-size="72" font-weight="900" fill="${COLORS.green}">${escapeXml(formatPrice(price, currency))}</text>
    <rect x="${WIDTH / 2 - 170}" y="${nameLines.length > 1 ? 1630 : 1590}" width="340" height="86" rx="43" fill="${COLORS.pink}" />
    <text x="${WIDTH / 2}" y="${nameLines.length > 1 ? 1685 : 1645}" text-anchor="middle" font-family="Arial, sans-serif" font-size="38" font-weight="800" fill="${COLORS.white}">↓ ${dropPercent}% OFF</text>
  </svg>`
}

function closingSlideSvg({ totalProducts, merchantsCount, priceDropsCount }) {
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

  const composite = photoBuffer ? [{ input: photoBuffer, left: 190, top: 460 }] : []
  await sharp(framePng).composite(composite).png().toFile(outPath)
}

async function main() {
  const highlights = JSON.parse(await readFile(path.join(DATA_DIR, 'home-highlights.json'), 'utf-8'))
  const meta = JSON.parse(await readFile(path.join(DATA_DIR, 'meta.json'), 'utf-8'))
  const merchants = JSON.parse(await readFile(path.join(DATA_DIR, 'merchants.json'), 'utf-8'))

  const drops = (highlights.priceDrops ?? []).slice(0, TOP_N)
  if (drops.length === 0) {
    console.log('Sem quedas de preço hoje — nada pra gerar.')
    return
  }

  await rm(OUT_DIR, { recursive: true, force: true })
  await mkdir(OUT_DIR, { recursive: true })

  const dateLabel = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  const slides = []

  const openingPath = path.join(OUT_DIR, 'slide-00-opening.png')
  await sharp(Buffer.from(openingSlideSvg(dateLabel))).png().toFile(openingPath)
  slides.push({ file: openingPath, seconds: OPENING_SECONDS })

  // Ranking em contagem regressiva: o maior desconto por último (#1), pra
  // gerar expectativa — mesma lógica que o storyboard de referência sugeriu.
  const ranked = [...drops].reverse()
  for (let i = 0; i < ranked.length; i++) {
    const rank = ranked.length - i
    const item = ranked[i]
    const file = path.join(OUT_DIR, `slide-${String(i + 1).padStart(2, '0')}-rank${rank}.png`)
    console.log(`Gerando slide #${rank}: ${item.productName} (${item.merchantDisplayName}, -${item.priceDropPercent}%)...`)
    await renderProductSlide(item, rank, file)
    slides.push({ file, seconds: PRODUCT_SECONDS })
  }

  const closingPath = path.join(OUT_DIR, 'slide-99-closing.png')
  await sharp(
    Buffer.from(
      closingSlideSvg({
        totalProducts: meta.totalProducts,
        merchantsCount: merchants.length,
        priceDropsCount: highlights.priceDropsCount ?? drops.length,
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

  console.log(`\nVídeo gerado: ${FINAL_PATH} (~${totalSeconds}s, ${slides.length} slides, ${hasAudio ? 'com' : 'sem'} áudio).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
