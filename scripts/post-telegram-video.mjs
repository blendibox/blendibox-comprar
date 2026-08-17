// Publica o vídeo diário (scripts/generate-daily-video.mjs) também no canal
// do Telegram, no mesmo momento em que é gerado — mesmo job do cron
// principal que já publica no YouTube (ver deploy.yml), não nos horários
// de 12h15/19h30 do canal (esses são só pras ofertas avulsas/resumo).
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const VIDEO_PATH = path.join(ROOT, 'daily-video.mp4')
const METADATA_PATH = path.join(ROOT, 'daily-video.metadata.json')

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

async function main() {
  // Não é erro: dias sem queda de preço não geram vídeo (ver
  // generate-daily-video.mjs) — não tem o que publicar, tudo certo.
  const exists = await stat(VIDEO_PATH).then(
    () => true,
    () => false
  )
  if (!exists) {
    console.log(`Nada pra publicar — ${VIDEO_PATH} não existe (sem quedas de preço hoje, ou generate-daily-video.mjs não rodou).`)
    return
  }

  const metadata = JSON.parse(await readFile(METADATA_PATH, 'utf-8'))
  const videoBuffer = await readFile(VIDEO_PATH)

  // Legenda curta de propósito — a descrição completa usada no YouTube é
  // longa demais pro limite de legenda de vídeo do Telegram (1024 chars).
  const caption =
    `🎬 <b>${escapeHtml(metadata.title)}</b>\n\n` + `👉 Compare preços: https://comprar.blendibox.com.br`

  console.log(`Publicando vídeo no Telegram (${(videoBuffer.length / 1024 / 1024).toFixed(1)} MB)...`)

  const form = new FormData()
  form.append('chat_id', CHAT_ID)
  form.append('caption', caption)
  form.append('parse_mode', 'HTML')
  form.append('video', new Blob([videoBuffer], { type: 'video/mp4' }), 'daily-video.mp4')

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`, { method: 'POST', body: form })
  const data = await res.json()
  if (!data.ok) throw new Error(JSON.stringify(data))

  console.log('\n✅ Vídeo publicado no Telegram.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
