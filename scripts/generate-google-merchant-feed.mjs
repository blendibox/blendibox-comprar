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

function buildItemXml(product) {
  const price = formatPrice(product.searchPrice, product.currency)
  // fetch-feeds.mjs já upsiza toda imagem servida pela proxy
  // images2.productserve.com (ver scripts/lib/images.mjs) e já garante que
  // awImageUrl não é placeholder (pickRealImage) — mas large_image é uma
  // coluna separada, então valida ela aqui antes de preferi-la.
  const mainImage = isRealImageUrl(product.largeImage) ? product.largeImage : product.awImageUrl
  if (!price || !product.productName || !mainImage) return null

  const id = `${product.merchantSlug}-${product.merchantProductId || product.slug}`
  const link = `${SITE_URL}/${product.merchantSlug}/${product.slug}/`
  const available = product.numberAvailable === 0 ? 'out of stock' : 'in stock'
  const hasGtin = Boolean(product.productGtin)
  const color = product.color || extractJewelryColor(product) || 'Branco'
  const size = product.size || 'Único'

  // O Merchant Center sinaliza "adicione detalhes que os clientes procuram"
  // quando cor/tamanho não aparecem como TEXTO na descrição — os campos
  // estruturados g:color/g:size abaixo não contam pra essa recomendação
  // específica, então repete a mesma informação em texto legível. Só pra
  // joias, onde a cor é dado real extraído do nome (não o "Branco" genérico
  // que os outros verticais recebem por falta de coluna própria no feed).
  const baseDescription = product.description || product.productName
  const description =
    product.vertical === 'joias' ? `${baseDescription} Cor: ${color}. Tamanho: ${size}.` : baseDescription

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
    `<g:brand>${cdata(product.merchantDisplayName)}</g:brand>`,
    `<g:condition>new</g:condition>`
  )

  if (hasGtin) {
    fields.push(`<g:gtin>${escapeXml(product.productGtin)}</g:gtin>`)
  } else {
    if (product.merchantProductId) fields.push(`<g:mpn>${escapeXml(product.merchantProductId)}</g:mpn>`)
    fields.push(`<g:identifier_exists>no</g:identifier_exists>`)
  }

  const productType = product.merchantCategory || product.categoryName
  if (productType) fields.push(`<g:product_type>${cdata(productType)}</g:product_type>`)

  // O feed da Awin não traz cor/tamanho/gênero/faixa etária — pra produtos
  // que o Google classifica como "Roupas e acessórios", esses atributos são
  // obrigatórios e a ausência reprova o item. Sem esse dado real, usamos um
  // valor default neutro em vez de deixar o campo de fora (nunca reprova por
  // falta do atributo; só não é tão específico quanto um dado real seria).
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

  const items = []
  let skipped = 0
  await readInBatches(productFiles, 500, async (file) => {
    const product = JSON.parse(await readFile(file, 'utf-8'))
    const itemXml = buildItemXml(product)
    if (itemXml) items.push(itemXml)
    else skipped++
  })

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
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
