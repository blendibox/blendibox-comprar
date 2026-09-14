// Avisa Bing/Yandex/Seznam/Naver (protocolo IndexNow — o Google não
// participa) sobre as URLs que mudaram de verdade hoje, em vez de esperar
// o crawler descobrir sozinho. Roda só depois que o site já está no ar de
// verdade (job "deploy" concluído) — o próprio protocolo exige que a chave
// em SITE_URL/{key}.txt esteja acessível na hora em que o buscador confere.
//
// "Mudou hoje" aqui é definido de forma honesta e verificável: os produtos
// que tiveram queda de preço real hoje (data/price-drops-today.json — a
// mesma fonte usada pelo vídeo diário e pelos posts do Telegram), e as
// páginas /cupons/{loja} cujo conjunto de cupons realmente mudou hoje
// (data/coupon-changes-today.json — ver fetch-coupons.mjs). Não republica
// o catálogo inteiro nem as ~40 páginas de cupom todo dia só porque
// tecnicamente "pode" ter mudado — isso seria spam pro endpoint e não
// reflete o que de fato mudou.
//
// Home e blog só entram nos dias em que há algo novo (Bing sinalizou nossas
// submissões como "modo batch" — reenviar as mesmas URLs todo santo dia,
// mudando algo real ou não, é exatamente o padrão que o IndexNow pede pra
// evitar; a recomendação deles é notificar só o que de fato mudou).
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SITE_URL = (process.env.SITE_URL || 'https://comprar.blendibox.com.br').replace(/\/$/, '')
const HOST = new URL(SITE_URL).host

// Não é segredo (fica exposta publicamente no arquivo {key}.txt, é assim
// que o protocolo confirma a posse do domínio) — não precisa de secret.
const INDEXNOW_KEY = '99b0d62f28ddd1aeb5a4b368bbb6e12d'
const KEY_LOCATION = `${SITE_URL}/${INDEXNOW_KEY}.txt`
const ENDPOINT = 'https://api.indexnow.org/indexnow'
const MAX_URLS_PER_BATCH = 10000

async function main() {
  const dropsPath = path.join(ROOT, 'data', 'price-drops-today.json')
  const drops = await readFile(dropsPath, 'utf-8')
    .then(JSON.parse)
    .catch(() => [])

  const couponChangesPath = path.join(ROOT, 'data', 'coupon-changes-today.json')
  const changedCouponSlugs = await readFile(couponChangesPath, 'utf-8')
    .then(JSON.parse)
    .catch(() => [])

  const urls = new Set()
  for (const item of drops) {
    urls.add(`${SITE_URL}/${item.merchantSlug}/${item.slug}/`)
  }
  for (const slug of changedCouponSlugs) {
    urls.add(`${SITE_URL}/cupons/${slug}/`)
  }
  // Home e blog só valem a pena reavisar em dia com novidade de verdade
  // (senão são as mesmas duas URLs de sempre, todo dia — o padrão que o
  // Bing classificou como "batch").
  if (urls.size > 0) {
    urls.add(`${SITE_URL}/`)
    urls.add(`${SITE_URL}/blog/`)
  }

  const urlList = [...urls]
  if (!urlList.length) {
    console.log('[indexnow] nada mudou hoje (sem queda de preço nem cupom novo) — nenhuma URL enviada.')
    return
  }
  console.log(
    `[indexnow] ${urlList.length} URLs mudaram hoje (${drops.length} produto(s) em queda de preço + ${changedCouponSlugs.length} página(s) de cupom + home/blog).`
  )

  for (let i = 0; i < urlList.length; i += MAX_URLS_PER_BATCH) {
    const batch = urlList.slice(i, i + MAX_URLS_PER_BATCH)
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: HOST, key: INDEXNOW_KEY, keyLocation: KEY_LOCATION, urlList: batch }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`IndexNow respondeu HTTP ${res.status}: ${text.slice(0, 300)}`)
    }
    console.log(`[indexnow] lote ${i / MAX_URLS_PER_BATCH + 1}: ${batch.length} URLs enviadas (HTTP ${res.status}).`)
  }

  console.log('\n✅ IndexNow notificado.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
