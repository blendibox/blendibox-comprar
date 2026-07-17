// Feed próprio da loja Blendibox (bolsas, XML no formato Google Shopping,
// gerado pela Yampi) — usado só pro carrossel de "nossos produtos" no
// rodapé, nada a ver com o feed de afiliados da Awin. É um XML simples e
// público (sem chave), então um extrator com regex resolve sem precisar de
// dependência de parser de XML.
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUTPUT_DIR = path.join(ROOT, 'public', 'data')

const FEED_URL = 'https://s3.amazonaws.com/images.yampi.me/xml/5aeafc00-b9e8-11ef-94d9-691c48740ba7.xml'
const MAX_PRODUCTS = 16

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function extractField(block, tag) {
  const escaped = tag.replace(':', '\\:')
  const re = new RegExp(`<${escaped}>([\\s\\S]*?)<\\/${escaped}>`)
  const m = block.match(re)
  return m ? decodeEntities(m[1].trim()) : null
}

// A Yampi serve variantes de tamanho pelo sufixo do nome do arquivo — a
// "-large" (usada no feed) tem ~290KB, a "-small" ~4,5KB, mesma imagem. Pro
// carrossel do rodapé (thumbnails pequenos) o tamanho pequeno é suficiente
// e reduz bastante o tempo de download.
function useSmallImage(url) {
  return url.replace(/-large\.(jpe?g|png|webp)$/i, '-small.$1')
}

async function main() {
  const response = await fetch(FEED_URL)
  if (!response.ok) {
    console.warn(`Feed da Blendibox indisponível (HTTP ${response.status}) — carrossel fica vazio.`)
    await mkdir(OUTPUT_DIR, { recursive: true })
    await writeFile(path.join(OUTPUT_DIR, 'blendibox-products.json'), '[]')
    return
  }

  const xml = await response.text()
  const items = xml.split('<item>').slice(1).map((s) => s.split('</item>')[0])

  const seen = new Set()
  const products = []
  for (const item of items) {
    const link = extractField(item, 'link')
    const image = extractField(item, 'g:image_link')
    if (!link || !image || seen.has(link)) continue
    seen.add(link)
    products.push({
      title: extractField(item, 'title'),
      link,
      brand: extractField(item, 'g:brand') || 'Blendibox',
      image: useSmallImage(image),
    })
    if (products.length >= MAX_PRODUCTS) break
  }

  await mkdir(OUTPUT_DIR, { recursive: true })
  await writeFile(path.join(OUTPUT_DIR, 'blendibox-products.json'), JSON.stringify(products))
  console.log(`Feed Blendibox: ${products.length} produtos gravados.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
