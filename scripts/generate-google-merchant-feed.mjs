// Gera o feed de produtos pro Google Merchant Center (formato RSS 2.0 +
// namespace g:, https://support.google.com/merchants/answer/7052112),
// particionado em arquivos de até 10.000 produtos — dist/googleMerchant_1.xml,
// googleMerchant_2.xml etc. Roda depois do vite build (grava em dist/).
//
// Lê todo o catálogo em public/data/products/**, não só os produtos que
// viraram página estática (o objetivo aqui é o feed mais completo possível,
// não só o que é elegível pra SEO).
import { readFile, writeFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isRealImageUrl } from './lib/images.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DIST_DIR = path.join(ROOT, 'dist')
const DATA_DIR = path.join(ROOT, 'public', 'data')
const SITE_URL = (process.env.SITE_URL || 'https://comprar.blendibox.com.br').replace(/\/$/, '')

const ITEMS_PER_FILE = 10000

// Promoções (https://support.google.com/merchants/answer/2906014) — gera
// dist/promotions.txt junto com o feed de produtos. Método "sem código"
// (offer_type=no_code): o desconto já está no preço mostrado (queda de
// preço VERIFICADA, ver src/lib/priceDrop.ts), não é cupom nosso. Faixas em
// vez de 1 promoção por produto — mantém o total de promoções ativas na
// conta baixo (Google limita isso) e sempre honesto: o produto sempre tem
// PELO MENOS o percentual da faixa (às vezes mais, nunca menos). O mesmo
// teto de 80% do carrossel de quedas (generate-home-highlights.mjs) evita
// anunciar queda implausível (erro de preço no feed).
const PROMO_BUCKETS = [70, 60, 50, 40, 30, 20, 10]
const PROMO_MAX_PLAUSIBLE_PERCENT = 80
// Quantos dias a promoção fica "válida" antes do próximo build renovar —
// folga de alguns dias além de "hoje" pra sobreviver um build perdido sem a
// promoção parecer expirada pro Google.
const PROMO_VALID_DAYS = 3

function getPromotionBucket(product) {
  if (!product.priceDropVerified) return null
  const pct = product.priceDropPercent
  if (pct == null || pct > PROMO_MAX_PLAUSIBLE_PERCENT) return null
  return PROMO_BUCKETS.find((tier) => pct >= tier) ?? null
}

function promotionIdFor(bucket) {
  return `queda-verificada-${bucket}`
}

// Disponibilidade real do feed Awin (in_stock/stock_quantity), com fallback
// pro legado number_available; só assume "disponível" sem nenhum sinal. Mesma
// regra usada no JSON-LD do site (prerender.mjs) pra manter consistência.
function isInStock(product) {
  const raw = product.inStock
  if (raw != null && String(raw).trim() !== '') {
    const s = String(raw).trim().toLowerCase()
    if (['0', 'false', 'no', 'n', 'out of stock', 'outofstock', 'unavailable'].includes(s)) return false
    if (['1', 'true', 'yes', 'y', 'in stock', 'instock', 'available'].includes(s)) return true
  }
  if (typeof product.stockQuantity === 'number') return product.stockQuantity > 0
  if (product.numberAvailable === 0) return false
  return true
}

async function walkProductFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await walkProductFiles(full)))
    else if (entry.name.endsWith('.json')) files.push(full)
  }
  return files
}

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function cdata(value) {
  return `<![CDATA[${String(value ?? '').replace(/]]>/g, ']]]]><![CDATA[>')}]]>`
}

function formatPrice(value, currency) {
  const num = Number(value)
  if (!Number.isFinite(num)) return null
  return `${num.toFixed(2)} ${currency || 'BRL'}`
}

// O feed da Awin não tem coluna própria de cor pra joias, mas o material/cor
// quase sempre aparece no nome ou na descrição ("Anel Daily em Ouro Amarelo
// 18k") — extrai isso em vez de cair direto no default genérico.
const JEWELRY_COLOR_PATTERNS = [
  { re: /ouro\s+amarelo/i, label: 'Ouro Amarelo' },
  { re: /ouro\s+branco/i, label: 'Ouro Branco' },
  { re: /ouro\s+ros[eé]/i, label: 'Ouro Rosé' },
  { re: /liga\s+ros[eé]/i, label: 'Rosé' },
  { re: /r[oó]dio\s+negro/i, label: 'Ródio Negro' },
  { re: /r[oó]dio/i, label: 'Ródio' },
  { re: /prata/i, label: 'Prata' },
]

function extractJewelryColor(product) {
  const text = `${product.productName || ''} ${product.description || ''}`
  const match = JEWELRY_COLOR_PATTERNS.find(({ re }) => re.test(text))
  return match?.label ?? null
}

function buildItemXml(product, promotionBucket) {
  const price = formatPrice(product.searchPrice, product.currency)
  // fetch-feeds.mjs já upsiza toda imagem servida pela proxy
  // images2.productserve.com (ver scripts/lib/images.mjs) e já garante que
  // awImageUrl não é placeholder (pickRealImage) — mas large_image é uma
  // coluna separada, então valida ela aqui antes de preferi-la.
  const mainImage = isRealImageUrl(product.largeImage) ? product.largeImage : product.awImageUrl
  if (!price || !product.productName || !mainImage) return null

  const id = `${product.merchantSlug}-${product.merchantProductId || product.slug}`
  const link = `${SITE_URL}/${product.merchantSlug}/${product.slug}/`
  const available = isInStock(product) ? 'in stock' : 'out of stock'
  const hasGtin = Boolean(product.productGtin)
  // Cor real: coluna própria da Awin (colour) quando o merchant preenche;
  // extractJewelryColor como fallback só pra joias (a Awin não tem coluna de
  // cor específica pra esse vertical, mas o nome quase sempre menciona o
  // metal/acabamento). realSize só existe quando a coluna "size" vem
  // preenchida — não tenta extrair do nome (arriscado, número no nome pode
  // ser modelo, não tamanho).
  const realColor = product.color || extractJewelryColor(product)
  const realSize = product.size
  const color = realColor || 'Branco'
  const size = realSize || 'Único'

  // O Merchant Center sinaliza "adicione detalhes que os clientes procuram"
  // quando cor/tamanho/material não aparecem como TEXTO na descrição — os
  // campos estruturados abaixo (g:color/g:size) não contam pra essa
  // recomendação específica, então repete em texto legível. Só quando o dado
  // é real (nunca o "Branco"/"Único" genérico usado como fallback pro
  // atributo estruturado) — achado real: 11 mil produtos (só na categoria de
  // calçados esportivos) reprovados nessa recomendação por falta das colunas
  // colour/size/material, que a Awin oferece e a gente não pedia.
  const baseDescription = product.description || product.productName
  const descriptionDetails = []
  if (realColor) descriptionDetails.push(`Cor: ${realColor}.`)
  if (realSize) descriptionDetails.push(`Tamanho: ${realSize}.`)
  if (product.material) descriptionDetails.push(`Material: ${product.material}.`)
  const description = descriptionDetails.length
    ? `${baseDescription} ${descriptionDetails.join(' ')}`
    : baseDescription

  const fields = [
    `<g:id>${escapeXml(id)}</g:id>`,
    `<title>${cdata(product.productName)}</title>`,
    `<description>${cdata(description)}</description>`,
    `<link>${escapeXml(link)}</link>`,
    `<g:image_link>${escapeXml(mainImage)}</g:image_link>`,
  ]

  // Imagens adicionais: a original (se diferente da principal, ex: quando
  // large_image virou a principal) e as alternativas do feed — só as que
  // forem reais (não placeholder) e diferentes da principal.
  const additionalImages = [
    product.awImageUrl,
    product.alternateImage,
    product.alternateImageTwo,
    product.alternateImageThree,
    product.alternateImageFour,
  ].filter((img, i, arr) => isRealImageUrl(img) && img !== mainImage && arr.indexOf(img) === i)
  for (const img of additionalImages) {
    fields.push(`<g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`)
  }

  fields.push(
    `<g:availability>${available}</g:availability>`,
    `<g:price>${price}</g:price>`,
    // brand_name é a marca real do produto (ex: "Nike") — merchantDisplayName
    // é a LOJA (ex: "Centauro BR"), errado pro g:brand em qualquer merchant
    // que revenda várias marcas. Cai pro nome da loja só quando o merchant
    // não preenche brand_name na Awin.
    `<g:brand>${cdata(product.brandName || product.merchantDisplayName)}</g:brand>`,
    `<g:condition>new</g:condition>`
  )

  if (hasGtin) {
    fields.push(`<g:gtin>${escapeXml(product.productGtin)}</g:gtin>`)
  } else {
    if (product.merchantProductId) fields.push(`<g:mpn>${escapeXml(product.merchantProductId)}</g:mpn>`)
    fields.push(`<g:identifier_exists>no</g:identifier_exists>`)
  }

  // product_type é a taxonomia do próprio Awin/Google quando o merchant
  // preenche — mais específica que a categoria bruta do feed; cai pra
  // merchant_category/category_name quando ausente (comportamento anterior).
  const productType = product.productType || product.merchantCategory || product.categoryName
  if (productType) fields.push(`<g:product_type>${cdata(productType)}</g:product_type>`)

  // Nem todo merchant preenche colour/size na Awin (gênero/faixa etária a
  // Awin não tem coluna nenhuma) — pra produtos que o Google classifica como
  // "Roupas e acessórios", esses atributos são obrigatórios e a ausência
  // reprova o item. Quando falta dado real, usamos um valor default neutro
  // em vez de deixar o campo de fora (nunca reprova por falta do atributo;
  // só não é tão específico quanto um dado real seria).
  // gender/age_group usam os valores em inglês exigidos pelo Google
  // (https://support.google.com/merchants/answer/6324479 e 6324463) — um
  // valor em português aqui reprovaria de novo, só que por "valor inválido"
  // em vez de "atributo ausente".
  fields.push(
    `<g:color>${cdata(color)}</g:color>`,
    `<g:size>${cdata(size)}</g:size>`,
    `<g:gender>${product.gender || 'unisex'}</g:gender>`,
    `<g:age_group>${product.ageGroup || 'adult'}</g:age_group>`
  )

  // "Silhueta" (formato/estilo do anel — solitário, aliança, trio etc.) não
  // vem em nenhum campo do feed da Awin pras joias — sem dado real pra
  // extrair (ao contrário da cor, que costuma aparecer no nome), usa um
  // custom label com valor default só pra não deixar o atributo vazio.
  if (product.vertical === 'joias') {
    fields.push(`<g:custom_label_0>${cdata('Silhueta')}</g:custom_label_0>`)
  }

  // Vincula esse produto à faixa de promoção correspondente (ver
  // promotions.txt, gerado em main() a partir dos mesmos buckets) — é o
  // método que a própria Google recomenda pra product_applicability=
  // specific_products, em vez de listar item_id um a um no feed de
  // promoções (tem teto de 1.000 por promoção lá).
  if (promotionBucket != null) {
    fields.push(`<g:promotion_id>${escapeXml(promotionIdFor(promotionBucket))}</g:promotion_id>`)
  }

  return `  <item>\n    ${fields.join('\n    ')}\n  </item>`
}

// Lê muitos arquivos pequenos em paralelo, mas em lotes, pra não estourar o
// limite de file handles abertos simultaneamente (mesmo padrão de
// fetch-feeds.mjs).
async function readInBatches(files, batchSize, readFn) {
  for (let i = 0; i < files.length; i += batchSize) {
    await Promise.all(files.slice(i, i + batchSize).map(readFn))
  }
}

async function main() {
  const productFiles = await walkProductFiles(path.join(DATA_DIR, 'products'))

  // Rede de segurança: o <g:id> é a chave primária do feed pro Google
  // Merchant/Pinterest, e um ID repetido derruba a ingestão do ARQUIVO
  // inteiro (não só do item), em vez de só reprovar o item duplicado (achado
  // real: erro 9156 do Pinterest, causado por merchant_product_id repetido
  // quando um merchant tem duas fids da Awin combinadas — ver dedup em
  // fetch-feeds.mjs). Mantém aqui também, mesmo já deduplicando na fonte,
  // porque esta é a última linha de defesa antes do arquivo público.
  const seenIds = new Set()
  let skippedDuplicateId = 0
  let skippedNonCanonical = 0

  const items = []
  let skipped = 0
  const activeBuckets = new Set()
  await readInBatches(productFiles, 500, async (file) => {
    const product = JSON.parse(await readFile(file, 'utf-8'))
    // Mesmo corte do sitemap (ver prerender.mjs): só o representante do
    // grupo merchant+modelo (canonicalSlug == o próprio slug, ver
    // fetch-feeds.mjs) entra no feed — as outras variações de tamanho/cor
    // não usam item_group_id (a gente não agrupa variação pro Google hoje),
    // então mandar todas só inflava o arquivo sem nenhum recurso de
    // variação funcionando em troca. Achado real: esse feed sozinho pesava
    // ~281 MB (quase 30% do deploy de ~922 MB). canonicalSlug ausente
    // (produto antigo, de antes desse campo existir) não é descartado —
    // trata como representante, mesmo padrão "falha aberto" dos outros
    // campos opcionais.
    if (product.canonicalSlug && product.canonicalSlug !== product.slug) {
      skippedNonCanonical++
      return
    }
    const id = `${product.merchantSlug}-${product.merchantProductId || product.slug}`
    if (seenIds.has(id)) {
      skippedDuplicateId++
      return
    }
    const promotionBucket = getPromotionBucket(product)
    const itemXml = buildItemXml(product, promotionBucket)
    if (itemXml) {
      seenIds.add(id)
      items.push(itemXml)
      if (promotionBucket != null) activeBuckets.add(promotionBucket)
    } else skipped++
  })
  if (skippedNonCanonical > 0) {
    console.log(`Google Merchant: ${skippedNonCanonical} produtos ignorados por não serem o representante do grupo merchant+modelo (variação de tamanho/cor).`)
  }
  if (skippedDuplicateId > 0) {
    console.log(`Google Merchant: ${skippedDuplicateId} produtos ignorados por g:id duplicado (mesmo merchant_product_id em feeds combinadas).`)
  }

  const chunks = []
  for (let i = 0; i < items.length; i += ITEMS_PER_FILE) {
    chunks.push(items.slice(i, i + ITEMS_PER_FILE))
  }

  const files = []
  for (let i = 0; i < chunks.length; i++) {
    const body = chunks[i].join('\n')
    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n` +
      `<channel>\n` +
      `  <title>Compare Ofertas</title>\n` +
      `  <link>${SITE_URL}/</link>\n` +
      `  <description>Feed de produtos Compare Ofertas pro Google Merchant Center</description>\n` +
      `${body}\n` +
      `</channel>\n</rss>\n`
    const fileName = `googleMerchant_${i + 1}.xml`
    await writeFile(path.join(DIST_DIR, fileName), xml)
    files.push(fileName)
  }

  console.log(
    `Google Merchant: ${items.length} produtos em ${files.length} arquivo(s) (${skipped} pulados por falta de dado essencial).`
  )

  await writePromotionsFeed(activeBuckets)
}

// Um valor com vírgula/aspas/quebra de linha precisa ser envolvido em aspas
// (regra padrão de CSV) — nenhum dos nossos campos tem isso hoje (percentual
// fixo, texto sem vírgula), mas melhor não confiar nisso silenciosamente.
function csvField(value) {
  const s = String(value ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function isoUtc(date) {
  return date.toISOString().replace(/\.\d{3}Z$/, '+00:00')
}

async function writePromotionsFeed(activeBuckets) {
  const header = [
    'promotion_id',
    'product_applicability',
    'offer_type',
    'long_title',
    'promotion_effective_dates',
    'redemption_channel',
    'promotion_destination',
    'coupon_value_type',
    'percent_off',
    'fine_print',
    'promotion_url',
  ]

  const now = new Date()
  const until = new Date(now.getTime() + PROMO_VALID_DAYS * 24 * 60 * 60 * 1000)
  const effectiveDates = `${isoUtc(now)}/${isoUtc(until)}`

  const rows = [...activeBuckets]
    .sort((a, b) => b - a)
    .map((bucket) =>
      [
        promotionIdFor(bucket),
        'specific_products',
        'no_code',
        `A partir de ${bucket}% off`,
        effectiveDates,
        'online',
        // Só listagem gratuita — não fazemos Shopping ads (a maioria dos
        // programas de afiliado que usamos proíbe SEM, ver contexto da
        // decisão de não rodar ads pagos).
        'free_listings',
        'percent_off',
        bucket,
        'Desconto já aplicado no preço mostrado, calculado sobre o preço habitual monitorado do produto. Sujeito a disponibilidade e variação de preço no site do parceiro.',
        `${SITE_URL}/quedas-de-preco/`,
      ]
        .map(csvField)
        .join(',')
    )

  const csv = [header.join(','), ...rows].join('\n') + '\n'
  await writeFile(path.join(DIST_DIR, 'promotions.txt'), csv)
  console.log(
    rows.length
      ? `Promoções: ${rows.length} faixa(s) de queda verificada ativa(s) (${[...activeBuckets].sort((a, b) => b - a).map((b) => `${b}%+`).join(', ')}).`
      : 'Promoções: nenhuma faixa de queda verificada ativa hoje — promotions.txt gerado só com cabeçalho.'
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
