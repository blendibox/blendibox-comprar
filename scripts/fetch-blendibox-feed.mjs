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

// A Yampi serve variantes de tamanho pelo sufixo do nome do arquivo (medido em
// 2026-11-05, mesma imagem): "-small" 70px (~3–7KB), "-thumb" 290px (~23–84KB),
// "-medium" 650px (~100–280KB), "-large" 1000px (~190–390KB). O cartão mostra a
// foto com ~110px de largura CSS, ou seja ~220px reais em tela retina: a "-small"
// (70px) ficava esticada e borrada; a "-thumb" (290px) cobre até 2,6x e custa uma
// fração da "-medium"/"-large".
function useThumbImage(url) {
  return url.replace(/-large\.(jpe?g|png|webp)$/i, '-thumb.$1')
}

async function main() {
  const { products: store } = await fetchBlendiboxStore()

  // Um cartão por produto (não por cor): a foto é a da primeira variação à venda.
  const products = store.slice(0, MAX_PRODUCTS).map((product) => ({
    title: product.name,
    link: `${product.url}?${UTM}`,
    brand: 'Blendibox',
    image: useThumbImage(product.variants[0].images[0]),
  }))

  await mkdir(OUTPUT_DIR, { recursive: true })
  await writeFile(path.join(OUTPUT_DIR, 'blendibox-products.json'), JSON.stringify(products))
  console.log(`Rodapé Blendibox: ${products.length} produtos (só com variação disponível) gravados.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
