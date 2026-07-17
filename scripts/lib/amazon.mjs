// Busca livros na Amazon BR via Product Advertising API (PA-API 5.0) e
// devolve linhas no mesmo formato das outras fontes (ver grupoboticario.mjs),
// pra entrar no mesmo pipeline de slug/vertical/similares sem código extra.
//
// Diferente do feed da Awin (CSV baixado uma vez), a PA-API não tem um
// "feed de mais vendidos" pra baixar — a aproximação é rodar buscas por
// palavra-chave fixas dentro de SearchIndex=Books. Assinatura das
// requisições é AWS Signature V4, feita à mão com node:crypto (sem SDK)
// pra não adicionar dependência só pra isso.
//
// Credenciais (AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY, AMAZON_PARTNER_TAG) só
// existem como secret — nunca hardcoded no repo.
import crypto from 'node:crypto'

const HOST = 'webservices.amazon.com.br'
const REGION = 'us-east-1'
const SERVICE = 'ProductAdvertisingAPI'
const MARKETPLACE = 'www.amazon.com.br'
const TARGET = 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems'
const PATH = '/paapi5/searchitems'

const RESOURCES = [
  'Images.Primary.Large',
  'ItemInfo.Title',
  'ItemInfo.ByLineInfo',
  'ItemInfo.ExternalIds',
  'Offers.Listings.Price',
  'Offers.Listings.Availability.Message',
]

// Buscas fixas representando "mais vendidos" em livros — a PA-API não expõe
// um endpoint de bestsellers direto, então aproximamos com palavras-chave
// dentro de SearchIndex=Books. Ajustável sem tocar no resto do pipeline.
const SEARCHES = [
  { slug: 'ficcao-mais-vendidos', keywords: 'romance mais vendido' },
  { slug: 'nao-ficcao-mais-vendidos', keywords: 'autoajuda mais vendido' },
  { slug: 'lancamentos', keywords: 'lançamentos livros' },
  { slug: 'infantil-mais-vendidos', keywords: 'livro infantil mais vendido' },
  { slug: 'hqs-mangas', keywords: 'mangá mais vendido' },
]

// Limite de 1 requisição/segundo é o padrão da PA-API pra contas com pouco
// histórico de vendas via API — respeitado aqui com uma pausa entre buscas.
const REQUEST_INTERVAL_MS = 1100

function hmac(key, data) {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest()
}

function sha256Hex(data) {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex')
}

function signingKey(secretKey, dateStamp) {
  const kDate = hmac(`AWS4${secretKey}`, dateStamp)
  const kRegion = hmac(kDate, REGION)
  const kService = hmac(kRegion, SERVICE)
  return hmac(kService, 'aws4_request')
}

async function searchItems(keywords, credentials) {
  const { accessKey, secretKey, partnerTag } = credentials

  const body = JSON.stringify({
    Keywords: keywords,
    Resources: RESOURCES,
    SearchIndex: 'Books',
    Marketplace: MARKETPLACE,
    PartnerTag: partnerTag,
    PartnerType: 'Associates',
    ItemCount: 10,
  })

  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '') // ex: 20260717T123456Z
  const dateStamp = amzDate.slice(0, 8)

  const canonicalHeaders =
    `content-encoding:amz-1.0\n` +
    `content-type:application/json; charset=utf-8\n` +
    `host:${HOST}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:${TARGET}\n`
  const signedHeaders = 'content-encoding;content-type;host;x-amz-date;x-amz-target'

  const canonicalRequest = `POST\n${PATH}\n\n${canonicalHeaders}\n${signedHeaders}\n${sha256Hex(body)}`
  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${sha256Hex(canonicalRequest)}`
  const signature = crypto.createHmac('sha256', signingKey(secretKey, dateStamp)).update(stringToSign, 'utf8').digest('hex')
  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  const res = await fetch(`https://${HOST}${PATH}`, {
    method: 'POST',
    headers: {
      'content-encoding': 'amz-1.0',
      'content-type': 'application/json; charset=utf-8',
      'x-amz-date': amzDate,
      'x-amz-target': TARGET,
      Authorization: authorization,
    },
    body,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`)
  }
  return res.json()
}

function mapItem(item) {
  const listing = item.Offers?.Listings?.[0]
  const price = listing?.Price?.Amount
  const isbn = item.ItemInfo?.ExternalIds?.ISBNs?.DisplayValues?.[0]
  const authors = item.ItemInfo?.ByLineInfo?.Contributors?.map((c) => c.Name).filter(Boolean).join(', ')

  return {
    aw_deep_link: item.DetailPageURL,
    product_name: item.ItemInfo?.Title?.DisplayValue ?? '',
    aw_product_id: item.ASIN,
    merchant_product_id: item.ASIN,
    merchant_image_url: item.Images?.Primary?.Large?.URL ?? '',
    description: authors ? `De ${authors}.` : '',
    merchant_category: 'Livros',
    search_price: price ?? '',
    merchant_name: 'Amazon BR',
    merchant_id: 'amazon',
    category_name: 'Livros',
    category_id: 'livros',
    aw_image_url: item.Images?.Primary?.Large?.URL ?? '',
    currency: 'BRL',
    store_price: price ?? '',
    delivery_cost: '',
    merchant_deep_link: item.DetailPageURL,
    language: 'pt',
    last_updated: new Date().toISOString(),
    display_price: price ?? '',
    data_feed_id: 'amazon-books',
    alternate_image_two: '',
    reviews: '',
    rating: '',
    average_rating: '',
    number_available: listing?.Availability?.Message ?? '',
    product_GTIN: isbn ?? '',
  }
}

export async function fetchAmazonRows() {
  const accessKey = process.env.AMAZON_ACCESS_KEY
  const secretKey = process.env.AMAZON_SECRET_KEY
  const partnerTag = process.env.AMAZON_PARTNER_TAG

  if (!accessKey || !secretKey || !partnerTag) {
    console.log('[amazon] credenciais não definidas — build segue sem o catálogo da Amazon.')
    return []
  }

  const seenAsins = new Set()
  const rows = []

  for (const search of SEARCHES) {
    try {
      const data = await searchItems(search.keywords, { accessKey, secretKey, partnerTag })
      const items = data.SearchResult?.Items ?? []
      let added = 0
      for (const item of items) {
        if (!item.ASIN || seenAsins.has(item.ASIN)) continue
        seenAsins.add(item.ASIN)
        rows.push(mapItem(item))
        added++
      }
      console.log(`[amazon] "${search.keywords}": ${added} livros novos (${items.length} retornados)`)
    } catch (err) {
      console.error(`[amazon] erro na busca "${search.keywords}", seguindo sem ela: ${err.message}`)
    }
    await new Promise((resolve) => setTimeout(resolve, REQUEST_INTERVAL_MS))
  }

  return rows
}
