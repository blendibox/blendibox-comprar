// Baixa a foto de um produto e CONFERE que é foto de verdade antes de qualquer
// canal (Telegram, vídeo diário) usá-la. Existe porque a proxy de imagem da Awin
// (images2.productserve.com) responde HTTP 200 mesmo quando não consegue servir a
// imagem: redireciona pra /noimage.gif, e quem só repassa a URL (como o Telegram
// fazia no sendPhoto) publica o placeholder "No image available" — foi o que
// aconteceu na oferta do oBoticário de 2026-10-29. Só dá pra saber baixando.
//
// Tenta, em ordem: a URL do catálogo e, se ela for da proxy, a URL original do
// lojista embutida nela (productServeOriginUrl). Devolve { buffer, url } com a foto
// já em JPEG (fundo branco, até 1280px — aceito por qualquer canal, inclusive os
// que não leem GIF/WebP), ou null se nenhum candidato for uma foto real.
import sharp from 'sharp'
import { isRealImageUrl, productServeOriginUrl } from './images.mjs'

const USER_AGENT = 'Mozilla/5.0 (compatible; CompareOfertasBot/1.0; +https://comprar.blendibox.com.br)'
// Placeholder e miniatura têm lado bem menor que uma foto de produto.
const MIN_SIDE_PX = 200
const FETCH_TIMEOUT_MS = 20000

export function photoCandidates(item) {
  const urls = []
  for (const url of [item.awImageUrl, productServeOriginUrl(item.awImageUrl)]) {
    if (url && isRealImageUrl(url) && !urls.includes(url)) urls.push(url)
  }
  return urls
}

export async function loadProductPhoto(item, { maxSide = 1280 } = {}) {
  for (const url of photoCandidates(item)) {
    try {
      const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
      if (!res.ok) continue
      // O destino FINAL do redirect é que denuncia o placeholder, não a URL pedida.
      if (!isRealImageUrl(res.url)) continue
      const raw = Buffer.from(await res.arrayBuffer())
      const meta = await sharp(raw).metadata()
      if (!meta.width || !meta.height || Math.min(meta.width, meta.height) < MIN_SIDE_PX) continue
      const buffer = await sharp(raw)
        .flatten({ background: '#ffffff' })
        .resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 88 })
        .toBuffer()
      return { buffer, url }
    } catch {
      // arquivo ilegível, timeout, rede: segue pro próximo candidato
    }
  }
  return null
}
