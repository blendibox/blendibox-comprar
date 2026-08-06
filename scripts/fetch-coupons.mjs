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
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUTPUT_DIR = path.join(ROOT, 'public', 'data')

const PUBLISHER_ID = process.env.AWIN_PUBLISHER_ID || '2104315'
const TOKEN = process.env.AWIN_PROMOTIONS_TOKEN
const PAGE_SIZE = 200
// Limite documentado da Awin é 20 chamadas/minuto por usuário — 3,2s entre
// chamadas fica com folga (18,75/min) sem chutar o limite por variação de
// latência de rede.
const REQUEST_INTERVAL_MS = 3200

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

async function fetchPage(page, advertiserIds) {
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
  if (!res.ok) {
    throw new Error(`Awin promotions API: HTTP ${res.status} na página ${page}`)
  }
  return res.json()
}

async function main() {
  if (!TOKEN) {
    console.log('AWIN_PROMOTIONS_TOKEN não definida — build segue sem cupons.')
    await mkdir(OUTPUT_DIR, { recursive: true })
    await writeFile(path.join(OUTPUT_DIR, 'coupons.json'), '[]')
    return
  }

  const merchantsConfig = JSON.parse(await readFile(path.join(__dirname, 'merchants.config.json'), 'utf-8'))
  const merchantsById = merchantsConfig.merchants
  const advertiserIds = Object.keys(merchantsById).map(Number)

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

  await mkdir(OUTPUT_DIR, { recursive: true })
  await writeFile(path.join(OUTPUT_DIR, 'coupons.json'), JSON.stringify(coupons))

  console.log(`Cupons: ${coupons.length} promoções dos nossos lojistas gravadas.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
