// Define a miniatura de um vídeo do YouTube. Usado tanto pelo upload
// automático (scripts/upload-daily-video.mjs, logo após publicar) quanto
// pelo ajuste manual (scripts/set-youtube-thumbnail.mjs).
export async function setThumbnail({ accessToken, videoId, imageBuffer }) {
  const res = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'image/png' },
    body: imageBuffer,
  })
  const data = await res.json()
  if (!res.ok) {
    const reason = data?.error?.errors?.[0]?.reason
    const hint =
      reason === 'youtubeSignupRequired'
        ? ' (o canal provavelmente precisa verificar o telefone pra usar miniaturas customizadas: https://www.youtube.com/verify)'
        : ''
    throw new Error(`Falha definindo miniatura: ${JSON.stringify(data)}${hint}`)
  }
  return data
}
