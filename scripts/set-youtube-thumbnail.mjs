// Define a miniatura de um vídeo já publicado no YouTube. Por padrão usa o
// primeiro slide (abertura) do último vídeo gerado por
// scripts/generate-daily-video.mjs — é o frame com o título "MAIORES
// QUEDAS DE PREÇO DO DIA", pensado pra funcionar como thumbnail.
//
// Uso: PowerShell:
//   $env:YOUTUBE_CLIENT_ID = "..."
//   $env:YOUTUBE_CLIENT_SECRET = "..."
//   $env:YOUTUBE_REFRESH_TOKEN = "..."
//   node scripts/set-youtube-thumbnail.mjs <videoId> [caminho-da-imagem]
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { refreshAccessToken } from './lib/youtube-auth-token.mjs'
import { setThumbnail } from './lib/youtube-thumbnail.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DEFAULT_THUMBNAIL = path.join(ROOT, '.video-tmp', 'slide-00-opening.png')

const [videoId, thumbnailPathArg] = process.argv.slice(2)
if (!videoId) {
  console.error('Uso: node scripts/set-youtube-thumbnail.mjs <videoId> [caminho-da-imagem]')
  process.exit(1)
}
const thumbnailPath = thumbnailPathArg || DEFAULT_THUMBNAIL

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET
const REFRESH_TOKEN = process.env.YOUTUBE_REFRESH_TOKEN
if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.error('Erro: defina YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET e YOUTUBE_REFRESH_TOKEN.')
  process.exit(1)
}

async function main() {
  await stat(thumbnailPath).catch(() => {
    console.error(`Erro: ${thumbnailPath} não existe. Gere o vídeo antes com: node scripts/generate-daily-video.mjs`)
    process.exit(1)
  })

  const imageBuffer = await readFile(thumbnailPath)
  const accessToken = await refreshAccessToken({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET, refreshToken: REFRESH_TOKEN })

  console.log(`Definindo miniatura do vídeo ${videoId} a partir de ${thumbnailPath}...`)
  await setThumbnail({ accessToken, videoId, imageBuffer })

  console.log(`\n✅ Miniatura definida: https://studio.youtube.com/video/${videoId}/edit`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
