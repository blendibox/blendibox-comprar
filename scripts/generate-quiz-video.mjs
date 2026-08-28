// Gera um vídeo vertical (1080x1920, formato Shorts/Reels) no formato "quiz":
// pergunta → contagem regressiva (tempo pra pensar) → resposta revelada com
// a explicação e a base legal. Mesmo dado real que já alimenta a seção
// /quizzes do site (src/data/quizzes) — lido via esbuild (o arquivo é
// TypeScript, Node puro não importa .ts direto), nunca duplicado à mão aqui.
// Mesma técnica SVG→sharp→ffmpeg do scripts/generate-daily-video.mjs. Não
// publica em lugar nenhum — só gera o arquivo local pra revisão antes de
// postar manualmente.
//
// Uso: node scripts/generate-quiz-video.mjs [slug-do-quiz]
// Sem argumento, usa o primeiro quiz de src/data/quizzes (o mais recente).
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { build } from 'esbuild'
import sharp from 'sharp'

const execFileAsync = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, '.quiz-video-tmp')
const FINAL_PATH = path.join(ROOT, 'quiz-video.mp4')
const METADATA_PATH = path.join(ROOT, 'quiz-video.metadata.json')

const WIDTH = 1080
const HEIGHT = 1920
const SITE_DOMAIN = 'comprar.blendibox.com.br'

const OPENING_SECONDS = 4
const COUNTDOWN_FRAME_SECONDS = 1
const REVEAL_SECONDS = 5
const CLOSING_SECONDS = 5

// Mesma trilha já licenciada pro canal, reaproveitada aqui (mesmo canal,
// mesmo uso) — ver comentário equivalente em generate-daily-video.mjs.
const AUDIO_PATH = path.join(ROOT, 'scripts', 'assets', 'daily-video-audio.mp3')
const AUDIO_VOLUME = 0.7
const AUDIO_FADE_SECONDS = 1.5

// Mesma paleta do site (src/index.css), com a mesma variante mais clara de
// verde usada no vídeo diário — legibilidade em cima do fundo azul-marinho.
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

function wrapText(text, maxChars, maxLines) {
  const words = text.split(' ')
  const lines = []
  let current = ''
  for (const w of words) {
    const test = current ? `${current} ${w}` : w
    if (test.length > maxChars && current) {
      lines.push(current)
      current = w
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  // Corta só depois de montar TODAS as linhas — cortar durante o loop (como
  // numa versão anterior desse helper) descartava o resto da frase inteira
  // depois da última linha permitida, sem avisar (ficava "nº" sozinho numa
  // citação de lei, por exemplo, com o resto do artigo silenciosamente
  // sumindo). Aqui, se sobrou conteúdo, a última linha visível ganha "…".
  if (lines.length > maxLines) {
    lines.length = maxLines
    const last = maxLines - 1
    const cut = lines[last].length > maxChars - 1 ? lines[last].slice(0, maxChars - 1) : lines[last]
    lines[last] = `${cut.trimEnd()}…`
  }
  return lines
}

function backgroundDecor() {
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

// Ícones desenhados na mão (sem depender de fonte de emoji/ícone externo —
// mesmo espírito do bellIcon em generate-daily-video.mjs).
function checkIcon(cx, cy, size, color) {
  return `<path d="M ${cx - size * 0.5} ${cy} L ${cx - size * 0.12} ${cy + size * 0.4} L ${cx + size * 0.55} ${cy - size * 0.45}" stroke="${color}" stroke-width="${size * 0.16}" stroke-linecap="round" stroke-linejoin="round" fill="none" />`
}

function xIcon(cx, cy, size, color) {
  return `<g stroke="${color}" stroke-width="${size * 0.16}" stroke-linecap="round">
    <line x1="${cx - size * 0.4}" y1="${cy - size * 0.4}" x2="${cx + size * 0.4}" y2="${cy + size * 0.4}" />
    <line x1="${cx - size * 0.4}" y1="${cy + size * 0.4}" x2="${cx + size * 0.4}" y2="${cy - size * 0.4}" />
  </g>`
}

function openingSlideSvg(quiz) {
  const titleLines = wrapText(quiz.title, 18, 4)
  return `${svgHeader()}${backgroundDecor()}
    <circle cx="${WIDTH / 2}" cy="330" r="110" fill="${COLORS.navyLight}" stroke="${COLORS.teal}" stroke-width="10" />
    ${checkIcon(WIDTH / 2, 330, 130, COLORS.white)}
    <text x="${WIDTH / 2}" y="530" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="800" fill="${COLORS.teal}">QUIZ ELEITORAL</text>
    <text x="${WIDTH / 2}" y="650" text-anchor="middle" font-family="Arial, sans-serif" font-size="64" font-weight="900" fill="${COLORS.white}">
      ${titleLines.map((l, i) => `<tspan x="${WIDTH / 2}" dy="${i === 0 ? 0 : 76}">${escapeXml(l)}</tspan>`).join('')}
    </text>
    <text x="${WIDTH / 2}" y="${650 + titleLines.length * 76 + 60}" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" fill="${COLORS.gray}">5 perguntas rápidas · baseado na lei</text>
    <text x="${WIDTH / 2}" y="1650" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" fill="${COLORS.teal}">${escapeXml(SITE_DOMAIN)}/quizzes</text>
    ${wordmark(WIDTH / 2, HEIGHT - 100, 'middle')}
  </svg>`
}

function questionCountdownSvg({ index, total, question, count }) {
  const questionLines = wrapText(question, 24, 6)
  return `${svgHeader()}${backgroundDecor()}
    <text x="${WIDTH / 2}" y="170" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="800" fill="${COLORS.teal}">PERGUNTA ${index} DE ${total}</text>
    <text x="${WIDTH / 2}" y="255" text-anchor="middle" font-family="Arial, sans-serif" font-size="50" font-weight="800" fill="${COLORS.white}">
      ${questionLines.map((l, i) => `<tspan x="${WIDTH / 2}" dy="${i === 0 ? 0 : 64}">${escapeXml(l)}</tspan>`).join('')}
    </text>
    <rect x="${WIDTH / 2 - 230}" y="660" width="460" height="80" rx="40" fill="${COLORS.navyLight}" stroke="${COLORS.pink}" stroke-width="3" />
    <text x="${WIDTH / 2}" y="712" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" font-weight="800" fill="${COLORS.pink}">PODE OU NÃO PODE?</text>
    <circle cx="${WIDTH / 2}" cy="1200" r="220" fill="${COLORS.navyLight}" stroke="${COLORS.teal}" stroke-width="14" />
    <text x="${WIDTH / 2}" y="1315" text-anchor="middle" font-family="Arial, sans-serif" font-size="260" font-weight="900" fill="${COLORS.white}">${count}</text>
    <text x="${WIDTH / 2}" y="1480" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" fill="${COLORS.gray}">pensa rápido...</text>
    ${wordmark(WIDTH / 2, HEIGHT - 100, 'middle')}
  </svg>`
}

function revealSlideSvg({ index, total, correctAnswer, explanation, legalBasis }) {
  const label = correctAnswer ? 'PODE' : 'NÃO PODE'
  const color = correctAnswer ? COLORS.green : COLORS.pink
  const explanationLines = wrapText(explanation, 28, 8)
  const legalLines = wrapText(legalBasis, 40, 3)
  return `${svgHeader()}${backgroundDecor()}
    <text x="${WIDTH / 2}" y="170" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="800" fill="${COLORS.teal}">PERGUNTA ${index} DE ${total}</text>
    <circle cx="${WIDTH / 2}" cy="420" r="140" fill="${color}" />
    ${correctAnswer ? checkIcon(WIDTH / 2, 420, 150, COLORS.white) : xIcon(WIDTH / 2, 420, 150, COLORS.white)}
    <text x="${WIDTH / 2}" y="660" text-anchor="middle" font-family="Arial, sans-serif" font-size="88" font-weight="900" fill="${color}">${label}</text>
    <text x="${WIDTH / 2}" y="800" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" fill="${COLORS.white}">
      ${explanationLines.map((l, i) => `<tspan x="${WIDTH / 2}" dy="${i === 0 ? 0 : 48}">${escapeXml(l)}</tspan>`).join('')}
    </text>
    <rect x="${WIDTH / 2 - 400}" y="1330" width="800" height="${90 + legalLines.length * 34}" rx="20" fill="${COLORS.navyLight}" stroke="${COLORS.teal}" stroke-width="2" />
    <text x="${WIDTH / 2}" y="1380" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="800" fill="${COLORS.teal}">BASE LEGAL</text>
    <text x="${WIDTH / 2}" y="1418" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" fill="${COLORS.gray}">
      ${legalLines.map((l, i) => `<tspan x="${WIDTH / 2}" dy="${i === 0 ? 0 : 34}">${escapeXml(l)}</tspan>`).join('')}
    </text>
    ${wordmark(WIDTH / 2, HEIGHT - 100, 'middle')}
  </svg>`
}

function closingSlideSvg(quiz) {
  return `${svgHeader()}${backgroundDecor()}
    <text x="${WIDTH / 2}" y="640" text-anchor="middle" font-family="Arial, sans-serif" font-size="54" font-weight="900" fill="${COLORS.white}">Curtiu o quiz?</text>
    <text x="${WIDTH / 2}" y="720" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" fill="${COLORS.gray}">Faça o quiz completo e veja a</text>
    <text x="${WIDTH / 2}" y="762" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" fill="${COLORS.gray}">base legal de cada resposta:</text>
    <rect x="${WIDTH / 2 - 280}" y="860" width="560" height="110" rx="55" fill="${COLORS.pink}" />
    <text x="${WIDTH / 2}" y="932" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="800" fill="${COLORS.white}">${escapeXml(SITE_DOMAIN)}/quizzes</text>
    <text x="${WIDTH / 2}" y="1050" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="${COLORS.gray}">Grátis · sem cadastro</text>
    ${wordmark(WIDTH / 2, HEIGHT - 100, 'middle')}
  </svg>`
}

async function loadQuiz(slug) {
  // src/data/quizzes/index.ts é TypeScript — Node puro não importa .ts, então
  // bundlamos só esse arquivo (sem tocar em React/router) com esbuild, igual
  // buildEntryServer() faz em scripts/prerender.mjs pro blog.
  const result = await build({
    entryPoints: [path.join(ROOT, 'src', 'data', 'quizzes', 'index.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    absWorkingDir: ROOT,
  })
  const tmpFile = path.join(__dirname, '.quiz-data.video-tmp.mjs')
  await writeFile(tmpFile, result.outputFiles[0].text)
  try {
    const mod = await import(`${pathToFileURL(tmpFile).href}?t=${Date.now()}`)
    const quiz = slug ? mod.getQuiz(slug) : mod.quizzes[0]
    if (!quiz) throw new Error(`Quiz "${slug}" não encontrado em src/data/quizzes.`)
    return quiz
  } finally {
    await rm(tmpFile, { force: true })
  }
}

function buildVideoMetadata(quiz) {
  const total = quiz.questions.length
  const title = `🗳️ ${quiz.title} | Quiz Rápido`

  // q.explanation já começa com "Pode."/"Não pode." (é a fonte oficial) —
  // sem prefixo extra aqui, senão duplica ("PODE. Pode. A manifestação...").
  const recap = quiz.questions
    .map((q, i) => `${i + 1}. ${q.question}\n${q.explanation} (${q.legalBasis})`)
    .join('\n\n')

  const description = `🗳️ ${quiz.title}

${quiz.subtitle}

Todas as respostas são baseadas na Lei das Eleições (Lei nº 9.504/97) e nas resoluções do TSE — nunca opinião.

Perguntas deste vídeo:
${recap}

✅ Faça o quiz completo (com barra de progresso e revisão das respostas): https://${SITE_DOMAIN}/quizzes/${quiz.slug}/
📖 Artigo completo sobre o que vestir pra votar: https://${SITE_DOMAIN}/blog/o-que-vestir-para-votar-eleicoes-2026/

#eleicoes2026 #quiz #TSE #votacao #${total}perguntas`

  return { title, description, tags: ['#eleicoes2026', '#quiz', '#TSE', '#votacao'] }
}

async function main() {
  const slugArg = process.argv[2]
  const quiz = await loadQuiz(slugArg)
  const total = quiz.questions.length

  await rm(OUT_DIR, { recursive: true, force: true })
  await mkdir(OUT_DIR, { recursive: true })

  const slides = []

  const openingPath = path.join(OUT_DIR, 'slide-00-opening.png')
  await sharp(Buffer.from(openingSlideSvg(quiz))).png().toFile(openingPath)
  slides.push({ file: openingPath, seconds: OPENING_SECONDS })

  for (let i = 0; i < total; i++) {
    const q = quiz.questions[i]
    const index = i + 1
    console.log(`Gerando pergunta ${index}/${total}: "${q.question.slice(0, 50)}..."`)

    for (const count of [3, 2, 1]) {
      const countPath = path.join(OUT_DIR, `slide-${String(index).padStart(2, '0')}a-count${count}.png`)
      await sharp(Buffer.from(questionCountdownSvg({ index, total, question: q.question, count }))).png().toFile(countPath)
      slides.push({ file: countPath, seconds: COUNTDOWN_FRAME_SECONDS })
    }

    const revealPath = path.join(OUT_DIR, `slide-${String(index).padStart(2, '0')}b-reveal.png`)
    await sharp(
      Buffer.from(
        revealSlideSvg({ index, total, correctAnswer: q.correctAnswer, explanation: q.explanation, legalBasis: q.legalBasis })
      )
    )
      .png()
      .toFile(revealPath)
    slides.push({ file: revealPath, seconds: REVEAL_SECONDS })
  }

  const closingPath = path.join(OUT_DIR, 'slide-99-closing.png')
  await sharp(Buffer.from(closingSlideSvg(quiz))).png().toFile(closingPath)
  slides.push({ file: closingPath, seconds: CLOSING_SECONDS })

  // Lista pro demuxer "concat" do ffmpeg — mesma exigência de repetir a
  // última entrada sem duration (senão o último frame passa rápido demais).
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

  const metadata = buildVideoMetadata(quiz)
  await writeFile(METADATA_PATH, JSON.stringify(metadata, null, 2))

  console.log(`\nVídeo gerado: ${FINAL_PATH} (~${totalSeconds}s, ${slides.length} slides, ${hasAudio ? 'com' : 'sem'} áudio).`)
  console.log(`Metadados (título/descrição) gravados em: ${METADATA_PATH}`)
  console.log(`\nTítulo: ${metadata.title}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
