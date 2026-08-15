// Troca o refresh_token por um access_token novo (expira em ~1h). Usado por
// scripts/upload-daily-video.mjs e scripts/youtube-whoami.mjs.
export async function refreshAccessToken({ clientId, clientSecret, refreshToken }) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Falha renovando access token: ${JSON.stringify(data)}`)
  return data.access_token
}
