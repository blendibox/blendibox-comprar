// Publica daily-video.mp4 no YouTube usando o refresh_token obtido via
// scripts/youtube-auth.mjs. Roda depois de scripts/generate-daily-video.mjs
// (que gera o vídeo e o daily-video.metadata.json com título/descrição/tags
// reais do dia). Não faz parte do `npm run build` — ferramenta on-demand,
// pensada pra rodar num step separado do GitHub Actions.
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { refreshAccessToken } from './lib/youtube-auth-token.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const VIDEO_PATH = path.join(ROOT, 'daily-video.mp4')
const METADATA_PATH = path.join(ROOT, 'daily-video.metadata.json')

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET
const REFRESH_TOKEN = process.env.YOUTUBE_REFRESH_TOKEN
if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.error(
    'Erro: defina YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET e YOUTUBE_REFRESH_TOKEN.\n' +
      'Localmente, gere o refresh token com: node scripts/youtube-auth.mjs\n' +
      'No GitHub Actions, configure os três como secrets.'
  )
  process.exit(1)
}

// "People & Blogs" — categoria genérica, sem exigir verificação extra de
// conteúdo. Ver lista completa: https://developers.google.com/youtube/v3/docs/videoCategories/list
const CATEGORY_ID = process.env.YOUTUBE_CATEGORY_ID || '22'
// Começa em "private" por padrão — evita publicar em público sem revisão
// manual antes de o pipeline estar validado. Trocar pra "public" (ou
// "unlisted") via env var quando tiver confiança no resultado.
const PRIVACY_STATUS = process.env.YOUTUBE_PRIVACY_STATUS || 'private'

async function uploadVideo({ accessToken, videoBuffer, title, description, tags }) {
  const metadata = {
    snippet: { title, description, tags, categoryId: CATEGORY_ID },
    status: { privacyStatus: PRIVACY_STATUS, selfDeclaredMadeForKids: false },
  }

  // Upload resumável: primeiro registra os metadados e pega a URL de upload,
  // depois manda os bytes do vídeo nessa URL (formato exigido pela API).
  const initRes = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Upload-Content-Type': 'video/mp4',
      'X-Upload-Content-Length': String(videoBuffer.length),
    },
    body: JSON.stringify(metadata),
  })
  if (!initRes.ok) {
    throw new Error(`Falha iniciando upload: ${initRes.status} ${await initRes.text()}`)
  }
  const uploadUrl = initRes.headers.get('location')
  if (!uploadUrl) throw new Error('Resposta sem "location" header — não achou a URL de upload.')

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(videoBuffer.length) },
    body: videoBuffer,
  })
  if (!putRes.ok) {
    throw new Error(`Falha enviando o vídeo: ${putRes.status} ${await putRes.text()}`)
  }
  return putRes.json()
}

async function main() {
  await stat(VIDEO_PATH).catch(() => {
    console.error(`Erro: ${VIDEO_PATH} não existe. Rode antes: node scripts/generate-daily-video.mjs`)
    process.exit(1)
  })

  const metadata = JSON.parse(await readFile(METADATA_PATH, 'utf-8'))
  const videoBuffer = await readFile(VIDEO_PATH)
  const tags = (metadata.tags || []).map((t) => t.replace(/^#/, ''))

  console.log(`Renovando access token...`)
  const accessToken = await refreshAccessToken({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET, refreshToken: REFRESH_TOKEN })

  console.log(`Enviando "${metadata.title}" (${(videoBuffer.length / 1024 / 1024).toFixed(1)} MB, privacyStatus=${PRIVACY_STATUS})...`)
  const result = await uploadVideo({ accessToken, videoBuffer, title: metadata.title, description: metadata.description, tags })

  console.log(`\n✅ Vídeo publicado: https://youtu.be/${result.id}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
