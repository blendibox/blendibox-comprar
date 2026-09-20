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
// Queda mínima (%) pra a URL contar como "mudou" — abaixo disso é ruído de
// arredondamento/câmbio, não vale notificar
const MIN_DROP_RATIO = 0.05
const DAY_MS = 24 * 60 * 60 * 1000
// Produto NOVO (primeira vez que aparece no histórico): o protocolo pede aviso
// de "URL adicionada". Teto diário pra uma loja nova (milhares de produtos de
// uma vez) não virar lote gigante — o resto o Bing descobre pelo sitemap.
const MAX_NEW_URLS_PER_DAY = 1000

// Produtos cujo preço CAIU (>= 5%) na última rodada de preços gravada em
// data/price-history.json. Vem do histórico e NÃO de data/price-drops-today.json
// de propósito: aquele arquivo agora só traz as quedas VERIFICADAS (vídeo,
// Telegram e campanhas — ver src/lib/priceDrop.ts), umas poucas por dia, e
// alimentar o IndexNow só com elas derrubaria o volume de URLs avisadas ao Bing
// de centenas/milhares por dia pra quase zero. Avisar o buscador de que a página
// mudou é uma questão técnica, não uma alegação de desconto.
//
// O job roda com o checkout do commit que disparou o workflow, então enxerga o
// histórico da rodada ANTERIOR (defasagem de 1 dia, igual à de antes).
async function productKeysChangedInLastRun() {
  const history = await readFile(path.join(ROOT, 'data', 'price-history.json'), 'utf-8')
    .then(JSON.parse)
    .catch(() => null)
  if (!history) return null

  let latest = ''
  for (const series of Object.values(history)) {
    const date = series[series.length - 1]?.date
    if (date > latest) latest = date
  }
  // Histórico parado (sem rodada recente): nada novo pra avisar
  if (!latest || Date.now() - Date.parse(`${latest}T00:00:00Z`) > 3 * DAY_MS) return { drops: [], added: [], addedTotal: 0 }

  const drops = []
  const added = []
  for (const [key, series] of Object.entries(history)) {
    const last = series[series.length - 1]
    if (last.date !== latest) continue
    if (series.length === 1) {
      added.push(key) // primeiro preço gravado na última rodada = produto novo
      continue
    }
    const previous = series[series.length - 2]
    if (last.price <= previous.price * (1 - MIN_DROP_RATIO)) drops.push(key)
  }
  return { drops, added: spreadAcrossMerchants(added, MAX_NEW_URLS_PER_DAY), addedTotal: added.length }
}

// Escolhe até `max` chaves alternando entre as lojas (uma de cada, em rodadas) —
// senão, quando uma loja inteira entra de uma vez, só a primeira em ordem
// alfabética seria avisada.
function spreadAcrossMerchants(keys, max) {
  if (keys.length <= max) return keys
  const byMerchant = new Map()
  for (const key of keys.sort()) {
    const merchant = key.split('/')[0]
    if (!byMerchant.has(merchant)) byMerchant.set(merchant, [])
    byMerchant.get(merchant).push(key)
  }
  const queues = [...byMerchant.values()]
  const picked = []
  for (let round = 0; picked.length < max; round++) {
    let any = false
    for (const queue of queues) {
      if (round < queue.length && picked.length < max) {
        picked.push(queue[round])
        any = true
      }
    }
    if (!any) break
  }
  return picked
}

async function main() {
  // Fallback (histórico ausente): a lista de quedas do dia, como antes
  const changed = await productKeysChangedInLastRun()
  const drops =
    changed != null
      ? changed.drops.map((key) => ({ merchantSlug: key.split('/')[0], slug: key.split('/').slice(1).join('/') }))
      : await readFile(path.join(ROOT, 'data', 'price-drops-today.json'), 'utf-8')
          .then(JSON.parse)
          .catch(() => [])
  const addedKeys = changed?.added ?? []

  const couponChangesPath = path.join(ROOT, 'data', 'coupon-changes-today.json')
  const changedCouponSlugs = await readFile(couponChangesPath, 'utf-8')
    .then(JSON.parse)
    .catch(() => [])

  const urls = new Set()
  for (const item of drops) {
    urls.add(`${SITE_URL}/${item.merchantSlug}/${item.slug}/`)
  }
  for (const key of addedKeys) {
    urls.add(`${SITE_URL}/${key}/`)
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
  const addedNote =
    changed && changed.addedTotal > addedKeys.length ? ` de ${changed.addedTotal}, teto ${MAX_NEW_URLS_PER_DAY}` : ''
  console.log(
    `[indexnow] ${urlList.length} URLs mudaram hoje (${drops.length} produto(s) em queda de preço + ${addedKeys.length} produto(s) novo(s)${addedNote} + ${changedCouponSlugs.length} página(s) de cupom + home/blog).`
  )

  // DRY_RUN=1: só conta e mostra amostra (teste local), não chama o IndexNow
  if (process.env.DRY_RUN) {
    console.log('[indexnow] DRY_RUN — nada enviado. Amostra:', urlList.slice(0, 3).join(' | '))
    return
  }

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
