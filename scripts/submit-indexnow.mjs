// Avisa Bing/Yandex/Seznam/Naver (protocolo IndexNow — o Google não
// participa) sobre as URLs que mudaram de verdade hoje, em vez de esperar
// o crawler descobrir sozinho. Roda só depois que o site já está no ar de
// verdade (job "deploy" concluído) — o próprio protocolo exige que a chave
// em SITE_URL/{key}.txt esteja acessível na hora em que o buscador confere.
//
// "Mudou hoje" aqui é definido de forma honesta e verificável: a home
// (sempre relevante), a listagem do blog, e os produtos que tiveram queda
// de preço real hoje (data/price-drops-today.json — a mesma fonte usada
// pelo vídeo diário e pelos posts do Telegram). Não republica o catálogo
// inteiro todo dia só porque tecnicamente "pode" ter mudado — isso seria
// spam pro endpoint e não reflete o que de fato mudou.
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

  const urls = new Set([`${SITE_URL}/`, `${SITE_URL}/blog/`])
  for (const item of drops) {
    urls.add(`${SITE_URL}/${item.merchantSlug}/${item.slug}/`)
  }

  const urlList = [...urls]
  console.log(`[indexnow] ${urlList.length} URLs mudaram hoje (1 home + 1 blog + ${drops.length} produto(s) em queda de preço).`)

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
