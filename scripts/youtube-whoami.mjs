// Diagnóstico: mostra a qual canal do YouTube o YOUTUBE_REFRESH_TOKEN atual
// dá acesso. Só leitura, não publica nada — rode isso pra confirmar que o
// token cai no canal certo ANTES de rodar scripts/upload-daily-video.mjs de
// verdade (útil quando a conta Google gerencia vários canais).
import { refreshAccessToken } from './lib/youtube-auth-token.mjs'

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET
const REFRESH_TOKEN = process.env.YOUTUBE_REFRESH_TOKEN
if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.error('Erro: defina YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET e YOUTUBE_REFRESH_TOKEN.')
  process.exit(1)
}

const accessToken = await refreshAccessToken({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET, refreshToken: REFRESH_TOKEN })

const res = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
  headers: { Authorization: `Bearer ${accessToken}` },
})
const data = await res.json()
if (!res.ok) {
  console.error('Erro consultando o canal:', data)
  process.exit(1)
}

const channel = data.items?.[0]
if (!channel) {
  console.log('Esse refresh token não está associado a nenhum canal do YouTube.')
  process.exit(1)
}

console.log(`Canal autorizado: "${channel.snippet.title}"`)
console.log(`ID do canal: ${channel.id}`)
console.log(`https://studio.youtube.com/channel/${channel.id}/videos`)
