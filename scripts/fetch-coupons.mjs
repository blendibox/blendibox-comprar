// Substitui a exportação manual do CSV (parse-coupons.mjs) pela API oficial
// de promoções da Awin (https://help.awin.com/apidocs/promotions). Precisa
// de AWIN_PROMOTIONS_TOKEN — token separado do AWIN_API_KEY (aquele é só do
// datafeed de produtos), gerado na seção de credenciais de API da conta Awin.
//
// O corpo da requisição precisa aninhar os filtros em "filters" e a paginação
// em "pagination" (achado só depois de olhar o schema renderizado da doc —
// campos soltos como {advertiserIds:[...], page:1} são ignorados
// silenciosamente pela API, sem erro, só devolve o catálogo inteiro sempre
// na página 1). Com "filters.advertiserIds" filtrando pelos merchant IDs que
// já usamos no feed de produtos, a resposta já vem só com os nossos lojistas
// — não precisa varrer as ~31 mil promoções do marketplace inteiro.
//
// FALHA DA API NÃO DERRUBA O BUILD. Em 2026-11-03 o token venceu/foi invalidado
// (HTTP 401) e este script, que saía com erro, derrubou o deploy INTEIRO — o
// catálogo, os preços e a loja Blendibox do dia ficaram sem publicar por causa de
// um detalhe (cupons). Agora, se a API falhar mesmo depois de tentar de novo, o
// script republica os cupons que já estão no ar (menos os vencidos), não declara
// "mudança" nenhuma pro IndexNow e deixa um arquivo-sinal (.coupons-stale.json) que
// o workflow transforma num e-mail de alerta — o problema fica visível, mas o site
// segue atualizando.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUTPUT_DIR = path.join(ROOT, 'public', 'data')
// Pequeno e versionado em data/ (não gitignored como public/data/) — precisa
// sobreviver entre runs do GitHub Actions pra saber o que já existia ontem.
// Mesmo padrão de data/price-history.json (ver update-price-history.mjs).
const SNAPSHOT_PATH = path.join(ROOT, 'data', 'coupon-snapshot.json')
const CHANGES_TODAY_PATH = path.join(ROOT, 'data', 'coupon-changes-today.json')
// Sinal pro workflow (não versionado): existe só quando os cupons de hoje NÃO
// vieram da API. Ver o passo "Avisar por e-mail se os cupons ... desatualizados".
const STALE_FLAG_PATH = path.join(ROOT, '.coupons-stale.json')

const PUBLISHER_ID = process.env.AWIN_PUBLISHER_ID || '2104315'
const TOKEN = process.env.AWIN_PROMOTIONS_TOKEN
const SITE_URL = (process.env.SITE_URL || 'https://comprar.blendibox.com.br').replace(/\/$/, '')
const PAGE_SIZE = 200
// Limite documentado da Awin é 20 chamadas/minuto por usuário — 3,2s entre
// chamadas fica com folga (18,75/min) sem chutar o limite por variação de
// latência de rede.
const REQUEST_INTERVAL_MS = 3200
const MAX_ATTEMPTS = 3
const RETRY_BACKOFF_MS = 5000

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Datas vêm como ISO com offset ("2026-08-06T10:46:00+00:00") — reformata
// só a string, sem passar por Date()/fuso horário, pra bater exatamente com
// o formato "DD/MM/YYYY HH:mm:ss" que parseBrDate (src/lib/date.ts e o
// antigo parse-coupons.mjs) já espera, sem introduzir nenhum deslocamento
// de fuso novo nessa migração.
function isoToBrDateTime(iso) {
  const m = String(iso ?? '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/)
  if (!m) return ''
  const [, year, month, day, hour, minute, second] = m
  return `${day}/${month}/${year} ${hour}:${minute}:${second}`
}

// Erro de cliente (token inválido, sem permissão, requisição errada) NÃO melhora
// tentando de novo; 429 (limite), 5xx e falha de rede sim.
function isRetryable(err) {
  return !err.status || err.status === 429 || err.status >= 500
}

async function fetchPage(page, advertiserIds) {
  let lastError
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`https://api.awin.com/publisher/${PUBLISHER_ID}/promotions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filters: { advertiserIds },
          pagination: { page, pageSize: PAGE_SIZE },
        }),
      })
      if (res.ok) return await res.json()
      const err = new Error(`Awin promotions API: HTTP ${res.status} na página ${page}`)
      err.status = res.status
      throw err
    } catch (err) {
      lastError = err
      if (!isRetryable(err) || attempt === MAX_ATTEMPTS) break
      console.warn(`[cupons] ${err.message} — tentativa ${attempt}/${MAX_ATTEMPTS}, tentando de novo em ${(attempt * RETRY_BACKOFF_MS) / 1000}s`)
      await sleep(attempt * RETRY_BACKOFF_MS)
    }
  }
  throw lastError
}

async function fetchAllCoupons(merchantsById, advertiserIds) {
  const coupons = []
  let page = 1
  let totalPages = 1

  do {
    const body = await fetchPage(page, advertiserIds)
    const items = body.data ?? []
    totalPages = Math.max(1, Math.ceil((body.pagination?.total ?? items.length) / PAGE_SIZE))

    for (const promo of items) {
      const merchant = merchantsById[String(promo.advertiser?.id)]
      if (!merchant) continue

      const code = promo.voucher?.code?.trim() || null
      coupons.push({
        id: String(promo.promotionId),
        advertiser: promo.advertiser?.name ?? '',
        merchantSlug: merchant.slug ?? null,
        merchantId: String(promo.advertiser?.id),
        vertical: merchant.vertical ?? null,
        type: promo.type,
        isVoucher: Boolean(code),
        code,
        title: promo.title || promo.description,
        description: promo.description,
        starts: isoToBrDateTime(promo.startDate),
        ends: isoToBrDateTime(promo.endDate),
        deeplink: promo.urlTracking || promo.url,
      })
    }

    console.log(`[cupons] página ${page}/${totalPages} — ${coupons.length} cupons dos nossos lojistas até agora`)
    page++
    if (page <= totalPages) await sleep(REQUEST_INTERVAL_MS)
  } while (page <= totalPages)

  return coupons
}

// "DD/MM/YYYY HH:mm:ss" (o formato gravado acima, já em UTC) → ms; null se vazio/ilegível.
function brDateTimeToMs(value) {
  const m = String(value ?? '').match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/)
  if (!m) return null
  const [, day, month, year, hour, minute, second] = m
  return Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second))
}

// Os cupons que o site publicou no último build bom (mesmo arquivo que o navegador
// baixa). Sem os vencidos: cupom velho vira informação errada. null = indisponível.
async function loadLastPublishedCoupons() {
  try {
    const res = await fetch(`${SITE_URL}/data/coupons.json`, { signal: AbortSignal.timeout(30000) })
    if (!res.ok) return null
    const data = await res.json()
    if (!Array.isArray(data)) return null
    const now = Date.now()
    return data.filter((c) => {
      const endsMs = brDateTimeToMs(c?.ends)
      return endsMs == null || endsMs >= now
    })
  } catch {
    return null
  }
}

async function handleCouponsFailure(err) {
  const tokenProblem = err.status === 401 || err.status === 403
  console.error(`[cupons] não consegui os cupons da API da Awin: ${err.message}`)

  const lastPublished = await loadLastPublishedCoupons()
  await mkdir(OUTPUT_DIR, { recursive: true })
  await writeFile(path.join(OUTPUT_DIR, 'coupons.json'), JSON.stringify(lastPublished ?? []))
  // Nada foi comparado com a API de hoje: não declara "mudança" (IndexNow) e NÃO
  // regrava o snapshot (senão o próximo dia bom compararia contra um estado falso).
  await mkdir(path.dirname(CHANGES_TODAY_PATH), { recursive: true })
  await writeFile(CHANGES_TODAY_PATH, '[]')

  await writeFile(
    STALE_FLAG_PATH,
    JSON.stringify({
      reason: err.message,
      status: err.status ?? null,
      tokenProblem,
      usedLastPublished: lastPublished != null,
      coupons: lastPublished?.length ?? 0,
      at: new Date().toISOString(),
    })
  )

  const what = lastPublished
    ? `republicando os ${lastPublished.length} cupons do último build bom (sem os vencidos)`
    : 'sem os cupons do último build (o site anterior também não respondeu)'
  const fix = tokenProblem
    ? 'O token AWIN_PROMOTIONS_TOKEN foi recusado: gere um novo em ui.awin.com/awin-api e atualize o secret no GitHub.'
    : 'Erro temporário ou de outro tipo na API da Awin.'
  // ::error:: vira anotação vermelha no resumo do run, sem fazer o job falhar
  console.log(`::error title=Cupons da Awin desatualizados::${err.message}. ${what}. ${fix}`)
}

async function main() {
  if (!TOKEN) {
    console.log('AWIN_PROMOTIONS_TOKEN não definida — build segue sem cupons.')
    await mkdir(OUTPUT_DIR, { recursive: true })
    await writeFile(path.join(OUTPUT_DIR, 'coupons.json'), '[]')
    await mkdir(path.dirname(CHANGES_TODAY_PATH), { recursive: true })
    await writeFile(CHANGES_TODAY_PATH, '[]')
    return
  }

  const merchantsConfig = JSON.parse(await readFile(path.join(__dirname, 'merchants.config.json'), 'utf-8'))
  const merchantsById = merchantsConfig.merchants
  const advertiserIds = Object.keys(merchantsById).map(Number)

  let coupons
  try {
    coupons = await fetchAllCoupons(merchantsById, advertiserIds)
  } catch (err) {
    await handleCouponsFailure(err)
    return
  }

  await mkdir(OUTPUT_DIR, { recursive: true })
  await writeFile(path.join(OUTPUT_DIR, 'coupons.json'), JSON.stringify(coupons))

  // Detecta lojas cujo conjunto de cupons mudou desde o último fetch (novo
  // cupom, ou algum expirou/sumiu) — usado por submit-indexnow.mjs pra
  // avisar Bing/Yandex só das páginas /cupons/{loja} que de fato mudaram
  // hoje, em vez de reenviar as ~40 todo dia (mesmo princípio do
  // price-drops-today.json em update-price-history.mjs).
  const idsByMerchant = new Map()
  for (const c of coupons) {
    if (!c.merchantSlug) continue
    if (!idsByMerchant.has(c.merchantSlug)) idsByMerchant.set(c.merchantSlug, [])
    idsByMerchant.get(c.merchantSlug).push(c.id)
  }
  const newSnapshot = Object.fromEntries(
    [...idsByMerchant.entries()].map(([slug, ids]) => [slug, [...ids].sort()])
  )
  const oldSnapshot = await readFile(SNAPSHOT_PATH, 'utf-8').then(JSON.parse).catch(() => ({}))
  const changedSlugs = Object.keys(newSnapshot).filter(
    (slug) => JSON.stringify(newSnapshot[slug]) !== JSON.stringify(oldSnapshot[slug] ?? [])
  )

  await mkdir(path.dirname(SNAPSHOT_PATH), { recursive: true })
  await writeFile(SNAPSHOT_PATH, JSON.stringify(newSnapshot))
  await writeFile(CHANGES_TODAY_PATH, JSON.stringify(changedSlugs))

  console.log(`Cupons: ${coupons.length} promoções dos nossos lojistas gravadas.`)
  console.log(`[cupons] ${changedSlugs.length} loja(s) com cupom novo/alterado hoje: ${changedSlugs.join(', ') || '(nenhuma)'}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
