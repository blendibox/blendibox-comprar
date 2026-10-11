// Busca o catálogo "Shopee Oficial BR" via link de datafeed do painel de
// Afiliados da Shopee (affiliate.shopee.com.br/creative/product_feed).
// Diferente do feed da Awin (um merchant = um vertical fixo), esse único
// feed cobre categorias muito diferentes (alimentos, eletrônicos, moda...)
// dentro do "merchant" Shopee — por isso o vertical é calculado por produto
// aqui (via CATEGORY_TO_VERTICAL) em vez de vir do merchants.config.json.
//
// SHOPEE_FEED_URL é a URL completa copiada do painel (já inclui um token de
// autenticação na query string — nunca deve ficar hardcoded no repo, só
// como secret). Confirmado com o usuário que essa URL é fixa/reutilizável
// (o conteúdo por trás dela é atualizado pela Shopee, o link não expira).
//
// O secret precisa apontar pro feed de 100.000 linhas (o "feed A"), que traz
// curtidas (like), nota da loja (shop_rating), nome da loja, tipo de envio
// (cb_option) e condição. O feed de 10.000 linhas (o antigo, sem essas colunas)
// não serve: sem curtidas o ranking caía só na nota (quase todo item tem 4,9
// ou 5,0), virava sorteio e o catálogo trocava todo dia.
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'csv-parse/sync'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const KNOWN_PATHS_FILE = path.join(ROOT, 'data', 'shopee-known-paths.json')

// Mapeamento categoria (global_category1 do feed) → vertical do site.
// Nomes conferidos rodando contra o feed real (não são só um chute inicial)
// — categorias que não aparecem aqui são ignoradas de propósito (build loga
// quais foram puladas, pra facilitar estender esta tabela depois em vez de
// importar tudo de uma vez). Categorias sem vertical correspondente hoje
// (autopeças, alimentos, papelaria, mom & baby...) ficam de fora até existir um
// vertical pra elas — não force-encaixar num bucket que não bate.
const CATEGORY_TO_VERTICAL = {
  Beauty: 'beleza',
  Health: 'beleza',
  'Women Clothes': 'moda',
  'Men Clothes': 'moda',
  'Women Shoes': 'moda',
  'Men Shoes': 'moda',
  'Women Bags': 'moda',
  'Men Bags': 'moda',
  'Fashion Accessories': 'moda',
  'Baby & Kids Fashion': 'moda',
  // Na prática é mala, necessaire e organizador de bagagem — não
  // equipamento de viagem em si. Mesmo bucket de Women/Men Bags.
  'Travel & Luggage': 'moda',
  Watches: 'joias',
  'Jewelry & Accessories': 'joias',
  'Sports & Outdoors': 'esporte',
  'Home & Living': 'casa',
  'Home Appliances': 'casa',
  'Home Improvement': 'casa',
  'Mobile & Gadgets': 'eletronicos',
  Audio: 'eletronicos',
  'Cameras & Drones': 'eletronicos',
  'Computers & Accessories': 'eletronicos',
  'Books & Magazines': 'livros',
  'Toys, Kids & Babies': 'brinquedos',
  'Baby & Toys': 'brinquedos',
  'Gaming & Consoles': 'eletronicos',
  Pets: 'pet',
}

// Casos em que o vertical certo depende da subcategoria (global_category3),
// não só da categoria 1 — ex: álbum/figurinha de copa do mundo entra como
// "colecionável" na Shopee (Hobbies & Collections), não como livro, mas faz
// sentido junto de "livros" no site (mesma prateleira de adesivos/figurinhas
// que já existe em Books & Magazines > Sticker & Colouring Books).
const CATEGORY3_OVERRIDES = {
  'Hobbies & Collections>Sports Collectibles': 'livros',
}

// Curadoria: só lojas OFICIAIS (o feed não tem coluna de tipo de loja, mas o
// nome das lojas de marca traz "Oficial"/"Official": Britânia Oficial, Philco
// Oficial, Casas Bahia Oficial...), produtos caros e muito curtidos. O feed não
// traz vendas nem comissão — curtidas são o melhor sinal de popularidade que
// existe nele, e item muito curtido também some menos do feed de um dia pro
// outro. Medido em 11/10/2026: ~590 itens de ~110 lojas passam nesses cortes.
const MIN_SHOP_RATING = 4.8
const MIN_ITEM_RATING = 4.7
const MIN_LIKES = 1000
const MIN_PRICE = 100
const MAX_PRICE = 5000 // teto de sanidade: evita preço de teste/erro no feed
const MAX_PER_SHOP = 10 // sem isso uma loja (ex: 75 itens de móveis) ocupa o catálogo
const MAX_TOTAL = 500
const DEFAULT_MAX_PER_VERTICAL = 20
const VERTICAL_CAPS = { casa: 200, eletronicos: 110, beleza: 80, moda: 80, esporte: 40, joias: 25 }

// Histerese: item que já estava publicado ontem passa com cortes um pouco mais
// frouxos (curtidas e preço oscilam, e um item na fronteira entraria e sairia
// do catálogo a cada build). Estabilidade importa porque cada item que sai
// vira URL morta.
const KEEP_FACTOR = 0.7
const KEEP_BONUS = 0.5

const REQUIRED_COLUMNS = ['like', 'shop_rating', 'shop_name', 'cb_option', 'condition', 'item_rating']

const isOfficialShop = (name) => /\b(oficial|official)\b/i.test(String(name ?? ''))

// "Britânia Oficial" -> "Britânia"; "Casas Bahia Loja Oficial" -> "Casas Bahia".
// Vai pro g:brand do feed do Google Merchant (a marca real do produto, não o
// nome do marketplace).
function brandFromOfficialShop(name) {
  const brand = String(name ?? '')
    .replace(/\b(loja\s+)?(oficial|official)(\s+store)?\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  return brand || ''
}

function priceOf(row) {
  const n = Number(row.sale_price || row.price)
  return Number.isFinite(n) ? n : null
}

// ids (itemid) dos produtos publicados na última execução — o slug termina em
// "-{itemid}" (ver finalizeProduct em fetch-feeds.mjs).
async function loadPreviouslyPublishedIds() {
  try {
    const known = JSON.parse(await readFile(KNOWN_PATHS_FILE, 'utf-8'))
    return new Set(Object.keys(known).map((p) => p.match(/-(\d+)$/)?.[1]).filter(Boolean))
  } catch {
    return new Set()
  }
}

function passes(row, keeping) {
  const f = keeping ? KEEP_FACTOR : 1
  const price = priceOf(row)
  if (price == null) return false
  return (
    row.cb_option === 'Non-Cross border' &&
    row.condition === 'New' &&
    isOfficialShop(row.shop_name) &&
    (Number(row.shop_rating) || 0) >= MIN_SHOP_RATING - (keeping ? 0.1 : 0) &&
    (Number(row.item_rating) || 0) >= MIN_ITEM_RATING - (keeping ? 0.1 : 0) &&
    (Number(row.like) || 0) >= MIN_LIKES * f &&
    price >= MIN_PRICE * (keeping ? 0.8 : 1) &&
    price <= MAX_PRICE
  )
}

// Popularidade (curtidas, em escala log) ponderada pelo preço — "caros e muito
// curtidos". Quem já estava publicado ganha um bônus pra não oscilar.
function score(row, keeping) {
  return Math.log10(1 + (Number(row.like) || 0)) * Math.log10(priceOf(row)) + (keeping ? KEEP_BONUS : 0)
}

function mapRow(row, vertical) {
  const price = row.sale_price || row.price || ''
  // A própria Shopee já entrega o link de afiliado pronto nessa coluna —
  // não construímos link nenhum aqui, só usamos o que o feed dá.
  const deepLink = row['product_short link'] || row.product_link

  return {
    aw_deep_link: deepLink,
    product_name: row.title,
    aw_product_id: row.itemid,
    merchant_product_id: row.itemid,
    merchant_image_url: row.image_link,
    description: row.description || '',
    merchant_category: row.global_category1,
    search_price: price,
    merchant_name: row.shop_name || 'Shopee Oficial BR',
    merchant_id: 'shopee',
    category_name: row.global_category1,
    category_id: row.global_catid1 || '',
    aw_image_url: row.image_link,
    currency: 'BRL',
    store_price: row.price || '',
    delivery_cost: '',
    merchant_deep_link: deepLink,
    language: 'pt',
    last_updated: new Date().toISOString(),
    display_price: price,
    data_feed_id: 'shopee',
    alternate_image_two: row.image_link_3 || '',
    reviews: '',
    rating: row.item_rating || '',
    average_rating: row.item_rating || '',
    number_available: '',
    product_GTIN: '',
    discount_percentage: row.discount_percentage || '',
    brand_name: brandFromOfficialShop(row.shop_name),
    // Não existe coluna equivalente no FIELD_MAP do Awin — passa direto pelo
    // mapRow() genérico de fetch-feeds.mjs (chave desconhecida = mantida
    // como está) e tem prioridade sobre o vertical fixo do merchant.
    vertical,
  }
}

export async function fetchShopeeRows() {
  const feedUrl = process.env.SHOPEE_FEED_URL
  if (!feedUrl) {
    console.log('[shopee] SHOPEE_FEED_URL não definida — build segue sem o catálogo da Shopee.')
    return []
  }

  console.log('[shopee] baixando datafeed...')
  const res = await fetch(feedUrl)
  if (!res.ok) {
    console.error(`[shopee] falha ao baixar feed (HTTP ${res.status}), seguindo sem ele.`)
    return []
  }

  // O feed já veio com byte NUL no meio de linhas (quebra parsers de CSV).
  const csvText = (await res.text()).replace(/\0/g, '')
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  })
  console.log(`[shopee] ${records.length} produtos no feed bruto`)

  const missing = REQUIRED_COLUMNS.filter((c) => !(records[0] && c in records[0]))
  if (missing.length) {
    console.error(
      `[shopee] feed sem as colunas ${missing.join(', ')} — parece o feed antigo de 10.000 linhas. ` +
        'Use o feed de 100.000 linhas (com curtidas e dados da loja) em SHOPEE_FEED_URL. Seguindo sem a Shopee.'
    )
    return []
  }

  const previousIds = await loadPreviouslyPublishedIds()

  const candidates = []
  const skippedCategories = new Map()
  for (const row of records) {
    const overrideKey = `${row.global_category1}>${row.global_category3}`
    const vertical = CATEGORY3_OVERRIDES[overrideKey] || CATEGORY_TO_VERTICAL[row.global_category1]
    if (!vertical) {
      skippedCategories.set(row.global_category1, (skippedCategories.get(row.global_category1) ?? 0) + 1)
      continue
    }
    const keeping = previousIds.has(String(row.itemid))
    if (!passes(row, keeping)) continue
    candidates.push({ row, vertical, keeping, score: score(row, keeping) })
  }
  candidates.sort((a, b) => b.score - a.score || String(a.row.itemid).localeCompare(String(b.row.itemid)))

  const perShop = new Map()
  const perVertical = new Map()
  const selected = []
  for (const c of candidates) {
    if (selected.length >= MAX_TOTAL) break
    const shop = c.row.shop_name
    const cap = VERTICAL_CAPS[c.vertical] ?? DEFAULT_MAX_PER_VERTICAL
    if ((perShop.get(shop) ?? 0) >= MAX_PER_SHOP) continue
    if ((perVertical.get(c.vertical) ?? 0) >= cap) continue
    perShop.set(shop, (perShop.get(shop) ?? 0) + 1)
    perVertical.set(c.vertical, (perVertical.get(c.vertical) ?? 0) + 1)
    selected.push(c)
  }

  const kept = selected.filter((c) => c.keeping).length
  console.log(
    `[shopee] curadoria: ${selected.length} produtos de ${perShop.size} lojas oficiais ` +
      `(${candidates.length} passaram nos cortes; ${kept} já estavam publicados). ` +
      `Por vertical: ${[...perVertical].map(([v, n]) => `${v}:${n}`).join(' ')}`
  )
  for (const [category, count] of skippedCategories) {
    console.log(`[shopee] categoria não mapeada "${category}": ${count} produtos ignorados (ver CATEGORY_TO_VERTICAL em scripts/lib/shopee.mjs)`)
  }

  return selected.map((c) => mapRow(c.row, c.vertical))
}
