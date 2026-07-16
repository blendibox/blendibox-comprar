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

function buildItemXml(product) {
  const price = formatPrice(product.searchPrice, product.currency)
  if (!price || !product.productName || !product.awImageUrl) return null

  const id = `${product.merchantSlug}-${product.merchantProductId || product.slug}`
  const link = `${SITE_URL}/${product.merchantSlug}/${product.slug}/`
  const available = product.numberAvailable === 0 ? 'out of stock' : 'in stock'
  const hasGtin = Boolean(product.productGtin)

  const fields = [
    `<g:id>${escapeXml(id)}</g:id>`,
    `<title>${cdata(product.productName)}</title>`,
    `<description>${cdata(product.description || product.productName)}</description>`,
    `<link>${escapeXml(link)}</link>`,
    `<g:image_link>${escapeXml(product.awImageUrl)}</g:image_link>`,
  ]

  if (product.alternateImageTwo && product.alternateImageTwo !== product.awImageUrl) {
    fields.push(`<g:additional_image_link>${escapeXml(product.alternateImageTwo)}</g:additional_image_link>`)
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
