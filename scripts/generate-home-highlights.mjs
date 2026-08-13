// Pré-calcula as 3 seções curadas da home (Destaques, Baixou de preço,
// Comprado recentemente) em public/data/home-highlights.json — um arquivo
// pequeno (só ~30-40 produtos ao todo).
//
// Antes, o ListingPage calculava essas 3 seções no CLIENTE filtrando o
// public/data/index.json inteiro — que hoje passa de 45MB (o catálogo
// cresceu bem além do que "índice leve" significava quando isso foi
// desenhado). O Lighthouse aponta esse fetch como o maior gargalo de LCP
// do site (>5MB, chain crítico de rede). Fazer essa mesma seleção aqui, em
// Node, custa nada (já temos tudo em memória/disco) e reduz o payload da
// home de megabytes pra alguns KB.
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA_DIR = path.join(ROOT, 'public', 'data')

const MAX_RECENT_SALES = 32
const MAX_PRICE_DROPS = 10

// Vivara, Centauro e Nike são, na prática, os merchants com melhor histórico
// real de vendas — sempre aparecem primeiro nos Destaques, antes dos outros
// merchants "priority". Mantém em sincronia com FEATURED_ORDER em
// src/pages/ListingPage.tsx (client não calcula mais isso, mas o conceito é
// o mesmo).
const FEATURED_ORDER = ['vivara', 'centauro', 'nike']

function pickFeatured(products, merchants) {
  const prioritySlugs = merchants
    .filter((m) => m.priority)
    .map((m) => m.slug)
    .sort((a, b) => {
      const ia = FEATURED_ORDER.indexOf(a)
      const ib = FEATURED_ORDER.indexOf(b)
      if (ia === -1 && ib === -1) return 0
      if (ia === -1) return 1
      if (ib === -1) return -1
      return ia - ib
    })
  const featured = []
  for (const slug of prioritySlugs) {
    const items = products
      .filter((p) => p.merchantSlug === slug && p.searchPrice != null)
      .sort((a, b) => a.searchPrice - b.searchPrice)
    if (items.length === 0) continue
    // Pega o item "do meio" (mediana de preço) — evita mostrar sempre o mais
    // barato/mais caro, dá uma sensação de curadoria em vez de extremo aleatório.
    featured.push(items[Math.floor(items.length / 2)])
  }
  return featured
}

function pickPriceDrops(products) {
  return products
    .filter((p) => p.priceDropPercent != null)
    .sort((a, b) => (b.priceDropPercent ?? 0) - (a.priceDropPercent ?? 0))
    .slice(0, MAX_PRICE_DROPS)
}

// social-proof.json (scripts/parse-sales-highlights.mjs) só guarda
// merchantSlug/slug/label — busca aqui o produto completo (imagem, preço)
// pra já entregar pronto pro ProductCard, sem precisar do índice completo
// no cliente pra "hidratar" cada destaque.
function pickRecentSales(highlights, products) {
  const bySlugKey = new Map()
  for (const p of products) bySlugKey.set(`${p.merchantSlug}:${p.slug}`, p)

  const matches = []
  for (const h of highlights) {
    const product = bySlugKey.get(`${h.merchantSlug}:${h.slug}`)
    if (!product) continue
    matches.push({ product, label: h.label })
    if (matches.length >= MAX_RECENT_SALES) break
  }
  return matches
}

async function main() {
  const [index, merchants, socialProof] = await Promise.all([
    readFile(path.join(DATA_DIR, 'index.json'), 'utf-8').then(JSON.parse),
    readFile(path.join(DATA_DIR, 'merchants.json'), 'utf-8').then(JSON.parse),
    readFile(path.join(DATA_DIR, 'social-proof.json'), 'utf-8')
      .then(JSON.parse)
      .catch(() => []),
  ])

  const highlights = {
    featured: pickFeatured(index, merchants),
    priceDrops: pickPriceDrops(index),
    recentSales: pickRecentSales(socialProof, index),
    // Total real de produtos com queda de preço confirmada (não só os ~10 do
    // carrossel) — usado na linha de "prova de valor" do hero da home. Mesma
    // definição de queda do priceDropPercent (ver update-price-history.mjs).
    priceDropsCount: index.filter((p) => p.priceDropPercent != null).length,
  }

  await writeFile(path.join(DATA_DIR, 'home-highlights.json'), JSON.stringify(highlights))

  const sizeKb = (
    Buffer.byteLength(JSON.stringify(highlights)) / 1024
  ).toFixed(1)
  console.log(
    `home-highlights.json: ${highlights.featured.length} destaques, ${highlights.priceDrops.length} quedas de preço no carrossel (${highlights.priceDropsCount} no total), ${highlights.recentSales.length} vendas recentes (${sizeKb} KB).`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
