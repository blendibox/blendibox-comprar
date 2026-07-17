// Baixa o(s) feed(s) de produtos da Awin (CSV comprimido em gzip), descompacta,
// converte pra JSON e grava em public/data. Roda tanto localmente (npm run fetch-feed)
// quanto no GitHub Actions, onde a API key vem de um secret (nunca fica no repo).
//
// Saída (ver plano em .claude/plans, seção "Arquitetura da solução"):
//   public/data/index.json                          — array leve pra listagem/busca no SPA
//   public/data/products/{vertical}/{merchant}/{slug}.json — detalhe completo por produto
//   public/data/merchants.json, public/data/meta.json
import { gunzipSync } from 'node:zlib'
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'csv-parse/sync'
import { slugify } from './lib/slugify.mjs'
import { fetchGrupoBoticarioRows } from './lib/grupoboticario.mjs'
import { fetchAmazonRows } from './lib/amazon.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUTPUT_DIR = path.join(ROOT, 'public', 'data')
const PRODUCTS_DIR = path.join(OUTPUT_DIR, 'products')

const API_KEY = process.env.AWIN_API_KEY
if (!API_KEY) {
  console.error(
    'Erro: variável de ambiente AWIN_API_KEY não definida.\n' +
      'Defina-a localmente (ex: PowerShell: $env:AWIN_API_KEY = "sua-chave") ' +
      'ou configure o secret AWIN_API_KEY no GitHub Actions.'
  )
  process.exit(1)
}

// Quantos produtos "similares" (mesma categoria) guardar por produto, e o
// limiar mínimo pra considerar a página do produto elegível a virar HTML
// estático indexável (evita gerar página fina/duplicada pra produto isolado).
const MAX_SIMILAR = 6
const MIN_SIMILAR_FOR_STATIC_PAGE = 3

// Pares de merchantSlug que são a mesma marca em canais diferentes (feed de
// afiliado da Awin x revenda direta via Grupo Boticário) — usado pra
// cross-referenciar o mesmo produto vendido nos dois canais. Casamento por
// nome normalizado (sem acento/maiúscula/espaço extra) — não é garantia
// perfeita, mas testado manualmente com boa precisão (~360 pares corretos
// pra Eudora, sem falso positivo na amostra revisada).
const CROSS_CHANNEL_PAIRS = [
  ['eudora', 'eudora-revenda'],
  ['oboticario', 'boticario-revenda'],
]

const NUMERIC_FIELDS = new Set([
  'searchPrice',
  'storePrice',
  'deliveryCost',
  'displayPrice',
  'reviews',
  'rating',
  'averageRating',
  'numberAvailable',
])

const FIELD_MAP = {
  aw_deep_link: 'awDeepLink',
  product_name: 'productName',
  aw_product_id: 'awProductId',
  merchant_product_id: 'merchantProductId',
  merchant_image_url: 'merchantImageUrl',
  description: 'description',
  merchant_category: 'merchantCategory',
  search_price: 'searchPrice',
  merchant_name: 'merchantName',
  merchant_id: 'merchantId',
  category_name: 'categoryName',
  category_id: 'categoryId',
  aw_image_url: 'awImageUrl',
  currency: 'currency',
  store_price: 'storePrice',
  delivery_cost: 'deliveryCost',
  merchant_deep_link: 'merchantDeepLink',
  language: 'language',
  last_updated: 'lastUpdated',
  display_price: 'displayPrice',
  data_feed_id: 'dataFeedId',
  alternate_image_two: 'alternateImageTwo',
  reviews: 'reviews',
  rating: 'rating',
  average_rating: 'averageRating',
  number_available: 'numberAvailable',
  product_GTIN: 'productGtin',
}

function mapRow(row) {
  const mapped = {}
  for (const [csvKey, value] of Object.entries(row)) {
    const key = FIELD_MAP[csvKey] ?? csvKey
    if (NUMERIC_FIELDS.has(key)) {
      const num = parseFloat(String(value).replace(',', '.'))
      mapped[key] = Number.isNaN(num) ? null : num
    } else {
      mapped[key] = value
    }
  }
  return mapped
}

function resolveMerchant(merchantsConfig, merchantId, merchantName) {
  const known = merchantsConfig.merchants[merchantId]
  if (known) return { ...known, merchantId }
  // Merchant não mapeado em merchants.config.json: fallback pra manter o
  // pipeline funcionando (ex: novo fid adicionado sem atualizar o config ainda).
  return {
    slug: slugify(merchantName) || `loja-${merchantId}`,
    displayName: merchantName,
    vertical: 'geral',
    active: true,
    merchantId,
  }
}

function buildCategorySlug(product) {
  const raw = product.merchantCategory || product.categoryName
  if (!raw) return 'geral'
  const segments = raw.split('>').map((s) => s.trim()).filter(Boolean)
  const deepest = segments[segments.length - 1] || raw
  return slugify(deepest) || 'geral'
}

async function downloadFeed(feed) {
  const url = feed.url.replaceAll('{{AWIN_API_KEY}}', API_KEY)
  console.log(`[${feed.id}] baixando feed...`)

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`[${feed.id}] falha ao baixar feed: HTTP ${response.status}`)
  }

  const compressed = Buffer.from(await response.arrayBuffer())
  console.log(`[${feed.id}] baixado (${(compressed.length / 1024 / 1024).toFixed(2)} MB comprimido), descompactando...`)

  const csvBuffer = gunzipSync(compressed)
  const records = parse(csvBuffer, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  })

  console.log(`[${feed.id}] ${records.length} linhas encontradas`)
  return records
}

// Escreve muitos arquivos pequenos em paralelo, mas em lotes, pra não estourar
// o limite de file handles abertos simultaneamente.
async function writeInBatches(items, batchSize, writeFn) {
  for (let i = 0; i < items.length; i += batchSize) {
    await Promise.all(items.slice(i, i + batchSize).map(writeFn))
  }
}

async function main() {
  const [feedsConfig, merchantsConfig] = await Promise.all([
    readFile(path.join(__dirname, 'feeds.config.json'), 'utf-8').then(JSON.parse),
    readFile(path.join(__dirname, 'merchants.config.json'), 'utf-8').then(JSON.parse),
  ])

  if (!feedsConfig.feeds?.length) {
    throw new Error('Nenhum feed configurado em scripts/feeds.config.json')
  }

  const rawRows = (await Promise.all(feedsConfig.feeds.map(downloadFeed))).flat()
  rawRows.push(...(await fetchGrupoBoticarioRows()))
  rawRows.push(...(await fetchAmazonRows()))

  // Monta cada produto com slug/vertical/merchant resolvidos, e um índice por
  // "vertical/categoria" pra depois calcular os produtos similares.
  const byCategoryKey = new Map()
  const products = []
  const merchantsUsed = new Map()

  for (const row of rawRows) {
    const mapped = mapRow(row)
    const merchant = resolveMerchant(merchantsConfig, mapped.merchantId, mapped.merchantName)
    const categorySlug = buildCategorySlug(mapped)
    const slugBase = slugify(mapped.productName) || 'produto'
    // Usa o merchant_product_id (SKU da loja) como sufixo quando existe — é o
    // mesmo padrão que o site antigo usava nas URLs já indexadas no Google,
    // então produtos que já existiam lá tendem a cair no mesmo slug agora.
    const slugId = slugify(mapped.merchantProductId) || mapped.awProductId
    const slug = `${slugBase}-${slugId}`

    const product = {
      ...mapped,
      slug,
      merchantSlug: merchant.slug,
      merchantDisplayName: merchant.displayName,
      vertical: merchant.vertical,
      categorySlug,
    }

    products.push(product)
    merchantsUsed.set(merchant.slug, {
      slug: merchant.slug,
      displayName: merchant.displayName,
      vertical: merchant.vertical,
      priority: Boolean(merchant.priority),
    })

    const categoryKey = `${merchant.vertical}/${categorySlug}`
    if (!byCategoryKey.has(categoryKey)) byCategoryKey.set(categoryKey, [])
    byCategoryKey.get(categoryKey).push(product)
  }

  // Produtos similares: mesma categoria dentro do mesmo vertical, ordenados
  // por proximidade de preço (fallback pros primeiros da categoria se não
  // houver preço em algum dos dois lados).
  for (const product of products) {
    const categoryKey = `${product.vertical}/${product.categorySlug}`
    const siblings = byCategoryKey.get(categoryKey).filter((p) => p.awProductId !== product.awProductId)
    const price = product.searchPrice ?? product.displayPrice
    const sorted =
      price == null
        ? siblings
        : [...siblings].sort((a, b) => {
            const priceA = a.searchPrice ?? a.displayPrice
            const priceB = b.searchPrice ?? b.displayPrice
            const diffA = priceA == null ? Infinity : Math.abs(priceA - price)
            const diffB = priceB == null ? Infinity : Math.abs(priceB - price)
            return diffA - diffB
          })

    product.similar = sorted.slice(0, MAX_SIMILAR).map((p) => ({
      slug: p.slug,
      vertical: p.vertical,
      merchantSlug: p.merchantSlug,
      merchantDisplayName: p.merchantDisplayName,
      productName: p.productName,
      awImageUrl: p.awImageUrl || p.merchantImageUrl,
      searchPrice: p.searchPrice,
      currency: p.currency,
    }))

    const merchantMeta = merchantsUsed.get(product.merchantSlug)
    product.eligibleForStaticPage = Boolean(merchantMeta?.priority) || product.similar.length >= MIN_SIMILAR_FOR_STATIC_PAGE
  }

  // Cross-referencia o mesmo produto entre canais (ex: Eudora via Awin x
  // Eudora via revenda) — precisa rodar depois do slug já estar definido.
  const relevantMerchants = new Set(CROSS_CHANNEL_PAIRS.flat())
  const byMerchantNameSlug = new Map()
  for (const product of products) {
    if (!relevantMerchants.has(product.merchantSlug)) continue
    byMerchantNameSlug.set(`${product.merchantSlug}::${slugify(product.productName)}`, product)
  }
  for (const [merchantA, merchantB] of CROSS_CHANNEL_PAIRS) {
    for (const product of products) {
      if (product.merchantSlug !== merchantA && product.merchantSlug !== merchantB) continue
      const otherMerchant = product.merchantSlug === merchantA ? merchantB : merchantA
      const match = byMerchantNameSlug.get(`${otherMerchant}::${slugify(product.productName)}`)
      if (!match) continue
      product.crossChannel = {
        slug: match.slug,
        vertical: match.vertical,
        merchantSlug: match.merchantSlug,
        merchantDisplayName: match.merchantDisplayName,
        productName: match.productName,
        awImageUrl: match.awImageUrl || match.merchantImageUrl,
        searchPrice: match.searchPrice,
        currency: match.currency,
      }
    }
  }

  // Limpa a saída anterior (evita arquivo órfão de produto removido do feed).
  await rm(PRODUCTS_DIR, { recursive: true, force: true })
  await mkdir(PRODUCTS_DIR, { recursive: true })

  await writeInBatches(products, 500, async (product) => {
    // URL/arquivo fica plano em /{merchant}/{slug} (sem o vertical no path) pra
    // bater com o esquema de URL que já está indexado no Google no site antigo.
    // O vertical continua no JSON como metadado, só não faz parte da rota.
    const dir = path.join(PRODUCTS_DIR, product.merchantSlug)
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, `${product.slug}.json`), JSON.stringify(product))
  })

  const index = products.map((p) => ({
    slug: p.slug,
    vertical: p.vertical,
    merchantSlug: p.merchantSlug,
    merchantDisplayName: p.merchantDisplayName,
    categorySlug: p.categorySlug,
    productName: p.productName,
    searchPrice: p.searchPrice,
    currency: p.currency,
    awImageUrl: p.awImageUrl || p.merchantImageUrl,
    eligibleForStaticPage: p.eligibleForStaticPage,
  }))

  await writeFile(path.join(OUTPUT_DIR, 'index.json'), JSON.stringify(index))
  await writeFile(path.join(OUTPUT_DIR, 'merchants.json'), JSON.stringify([...merchantsUsed.values()]))
  await writeFile(
    path.join(OUTPUT_DIR, 'meta.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalProducts: products.length,
        eligibleForStaticPage: products.filter((p) => p.eligibleForStaticPage).length,
        feeds: feedsConfig.feeds.map((f) => f.id),
        merchants: [...merchantsUsed.values()].map((m) => m.slug),
      },
      null,
      2
    )
  )

  console.log(
    `Pronto: ${products.length} produtos (${index.filter((p) => p.eligibleForStaticPage).length} elegíveis a página estática) gravados em public/data/`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
