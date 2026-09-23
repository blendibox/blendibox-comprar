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
import { loadPriceDrop } from './lib/price-drop.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// PRICE_HISTORY_ROOT redireciona os caminhos (só pra testar com dados de mentira)
const ROOT = process.env.PRICE_HISTORY_ROOT ? path.resolve(process.env.PRICE_HISTORY_ROOT) : path.resolve(__dirname, '..')
const DATA_DIR = path.join(ROOT, 'public', 'data')

const MAX_RECENT_SALES = 32
const MAX_PRICE_DROPS = 10

// Páginas e seções de campanha (/black-friday/, /dia-das-maes/, a home em
// data comemorativa...) — só quedas grandes o bastante pra valer o destaque,
// no máximo N por loja (sem isso uma loja com muita queda ao mesmo tempo,
// como a Kabum com licenças de antivírus, ocupa a lista inteira) e sem as
// "quedas" implausíveis: acima de 80% quase sempre é erro de preço no feed
// (peça avulsa que passa de R$2 mil pra R$360, por exemplo), e uma página que
// promete queda verificada não pode abrir com isso.
//
// Guarda o top do catálogo todo e o top de cada departamento (vertical) —
// cada época usa os departamentos dela (ver SEASONAL_LANDINGS em
// src/lib/seasonalEvents.ts). Tamanhos: uma página lista até 48 itens, então
// o "todos" guarda 48, e cada departamento 24 (duas fatias somadas já cobrem
// o que uma página mostra).
const TOP_DROPS_MIN_PERCENT = 10
const TOP_DROPS_MAX_PLAUSIBLE_PERCENT = 80
const TOP_DROPS_MAX_ALL = 48
const TOP_DROPS_MAX_PER_VERTICAL = 24
const TOP_DROPS_MAX_PER_MERCHANT = 10

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

// Carrossel "Caiu de preço": qualquer queda válida (contra o preço habitual —
// ver src/lib/priceDrop.ts — mas SEM o rigor extra de "verificada": não exige
// histórico mínimo nem "sem sobe e desce"). O rigor de "verificada" fica
// reservado pras páginas de campanha/vídeo/Telegram, que fazem uma afirmação
// mais forte ("Black Friday: quedas verificadas"); aqui a home só mostra "isso
// caiu de preço essa semana", o mesmo padrão do selo dos cards — sem isso, a
// contagem da home ficava artificialmente baixa (dezenas em vez de milhares).
function pickPriceDrops(products) {
  return products
    .filter((p) => p.priceDropPercent != null)
    .sort((a, b) => (b.priceDropPercent ?? 0) - (a.priceDropPercent ?? 0))
    .slice(0, MAX_PRICE_DROPS)
}

function rankTopDrops(products, maxItems) {
  const qualifying = products
    .filter(
      (p) =>
        p.priceDropVerified === true &&
        p.priceDropPercent != null &&
        p.priceDropPercent >= TOP_DROPS_MIN_PERCENT &&
        p.priceDropPercent <= TOP_DROPS_MAX_PLAUSIBLE_PERCENT
    )
    // Desempate por nome/loja pra a ordem ser estável entre builds (senão a
    // lista "embaralha" à toa quando várias quedas têm o mesmo percentual).
    .sort(
      (a, b) =>
        b.priceDropPercent - a.priceDropPercent ||
        a.merchantSlug.localeCompare(b.merchantSlug) ||
        a.slug.localeCompare(b.slug)
    )

  const perMerchant = new Map()
  const items = []
  for (const p of qualifying) {
    const count = perMerchant.get(p.merchantSlug) ?? 0
    if (count >= TOP_DROPS_MAX_PER_MERCHANT) continue
    perMerchant.set(p.merchantSlug, count + 1)
    items.push(p)
    if (items.length >= maxItems) break
  }
  return { total: qualifying.length, items }
}

function pickTopPriceDrops(products, minHistoryDays) {
  const byVertical = {}
  const verticals = [...new Set(products.map((p) => p.vertical).filter(Boolean))].sort()
  for (const vertical of verticals) {
    const group = rankTopDrops(products.filter((p) => p.vertical === vertical), TOP_DROPS_MAX_PER_VERTICAL)
    if (group.items.length > 0) byVertical[vertical] = group
  }
  return {
    generatedAt: new Date().toISOString(),
    minDropPercent: TOP_DROPS_MIN_PERCENT,
    // Histórico mínimo (dias) exigido hoje — a página de campanha mostra esse
    // número no texto de método, então precisa vir daqui
    minHistoryDays,
    all: rankTopDrops(products, TOP_DROPS_MAX_ALL),
    byVertical,
  }
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

  const { verifiedMinHistoryDays } = await loadPriceDrop()
  const minHistoryDays =
    Number(process.env.VERIFIED_MIN_HISTORY_DAYS) || verifiedMinHistoryDays(new Date().toISOString().slice(0, 10))

  const highlights = {
    featured: pickFeatured(index, merchants),
    priceDrops: pickPriceDrops(index),
    recentSales: pickRecentSales(socialProof, index),
    // Total real de produtos com queda de preço válida (não só os ~10 do
    // carrossel) — usado na linha de "prova de valor" do hero da home. Mesma
    // definição do carrossel acima (não exige "verificada" — ver pickPriceDrops).
    priceDropsCount: index.filter((p) => p.priceDropPercent != null).length,
  }

  await writeFile(path.join(DATA_DIR, 'home-highlights.json'), JSON.stringify(highlights))

  const sizeKb = (
    Buffer.byteLength(JSON.stringify(highlights)) / 1024
  ).toFixed(1)
  console.log(
    `home-highlights.json: ${highlights.featured.length} destaques, ${highlights.priceDrops.length} quedas de preço no carrossel (${highlights.priceDropsCount} no total), ${highlights.recentSales.length} vendas recentes (${sizeKb} KB).`
  )

  const topPriceDrops = pickTopPriceDrops(index, minHistoryDays)
  await writeFile(path.join(DATA_DIR, 'top-price-drops.json'), JSON.stringify(topPriceDrops))
  const perVertical = Object.entries(topPriceDrops.byVertical)
    .map(([v, g]) => `${v}:${g.total}`)
    .join(' ')
  console.log(
    `top-price-drops.json: ${topPriceDrops.all.items.length} de ${topPriceDrops.all.total} quedas ≥${TOP_DROPS_MIN_PERCENT}% (páginas de campanha). Por departamento: ${perVertical || '(nenhum)'}`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
