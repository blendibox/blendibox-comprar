// Carrossel "Produtos Blendibox" do rodapé. Lê as páginas da loja ao vivo (ver
// scripts/lib/blendibox.mjs — mesma fonte do merchant Blendibox no catálogo) e
// só lista produto que tem pelo menos UMA variação à venda agora. O XML Google
// Shopping da Yampi, usado antes, atrasava: marcava como "in stock" produtos já
// despublicados, e o rodapé mandava a pessoa pra home da loja.
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchBlendiboxStore } from './lib/blendibox.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUTPUT_DIR = path.join(ROOT, 'public', 'data')

const MAX_PRODUCTS = 16
const UTM = 'utm_source=compareofertas&utm_medium=rodape&utm_campaign=produtos-blendibox'

// A Yampi serve variantes de tamanho pelo sufixo do nome do arquivo — a
// "-large" tem ~290KB, a "-small" ~4,5KB, mesma imagem. Pro carrossel do
// rodapé (thumbnails pequenos) o tamanho pequeno é suficiente e reduz bastante
// o tempo de download.
function useSmallImage(url) {
  return url.replace(/-large\.(jpe?g|png|webp)$/i, '-small.$1')
}

async function main() {
  const { products: store } = await fetchBlendiboxStore()

  // Um cartão por produto (não por cor): a foto é a da primeira variação à venda.
  const products = store.slice(0, MAX_PRODUCTS).map((product) => ({
    title: product.name,
    link: `${product.url}?${UTM}`,
    brand: 'Blendibox',
    image: useSmallImage(product.variants[0].images[0]),
  }))

  await mkdir(OUTPUT_DIR, { recursive: true })
  await writeFile(path.join(OUTPUT_DIR, 'blendibox-products.json'), JSON.stringify(products))
  console.log(`Rodapé Blendibox: ${products.length} produtos (só com variação disponível) gravados.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
