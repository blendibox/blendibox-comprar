// Busca o catálogo "Shopee BR" via link de datafeed do painel de
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

// Curadoria em duas faixas. O feed não traz vendas nem comissão — curtidas são
// o melhor sinal de popularidade que existe nele, e item muito curtido também
// some menos do feed de um dia pro outro (cada item que sai vira URL morta).
//
// FAIXA 1 ("of"): lojas OFICIAIS (o feed não tem coluna de tipo de loja, mas o
// nome das lojas de marca traz "Oficial"/"Official": Britânia Oficial, Philco
// Oficial, Casas Bahia Oficial...), caros e muito curtidos.
const MIN_SHOP_RATING = 4.8
const MIN_ITEM_RATING = 4.7
const MIN_LIKES = 1000
const MIN_PRICE = 100
const MAX_PRICE = 5000 // teto de sanidade: evita preço de teste/erro no feed
const MAX_PER_SHOP = 10 // sem isso uma loja (ex: 75 itens de móveis) ocupa o catálogo
const MAX_TOTAL = 500
const DEFAULT_MAX_PER_VERTICAL = 20
const VERTICAL_CAPS = { casa: 200, eletronicos: 110, beleza: 80, moda: 80, esporte: 40, joias: 25 }

// FAIXA 2 ("np"): lojas SEM "Oficial" no nome — aqui entram marcas e varejistas
// de verdade que só não se rotulam assim (Electrolux, Pichau, Principia...), mas
// também falsificação e vendedor ruim, por isso os cortes são mais rígidos:
// mais curtidas, menos itens por loja e nenhum título com marca famosa (marca
// famosa só entra por loja oficial). Medido em 11/10/2026: ~500+ itens de ~170
// lojas. Um sub_id próprio por faixa deixa comparar no painel qual converte.
const T2_MIN_SHOP_RATING = 4.8
const T2_MIN_LIKES = 2000
const T2_MAX_PER_SHOP = 5
const T2_MAX_TOTAL = 700
const T2_DEFAULT_MAX_PER_VERTICAL = 20
const T2_VERTICAL_CAPS = { casa: 280, eletronicos: 100, beleza: 110, moda: 100, esporte: 50, joias: 20 }

// Marcas que lojas não oficiais costumam falsificar ou revender sem garantia.
const FAMOUS_BRANDS = [
  'nike', 'adidas', 'puma', 'fila', 'asics', 'mizuno', 'new balance', 'under armour', 'converse', 'vans',
  'apple', 'iphone', 'airpods', 'samsung', 'xiaomi', 'redmi', 'motorola', 'lenovo', 'logitech', 'razer', 'jbl',
  'sony', 'playstation', 'ps5', 'nintendo', 'garmin', 'kindle', 'philips', 'dyson', 'lego', 'barbie', 'hot wheels',
  'lacoste', 'tommy', 'calvin klein', 'hugo boss', 'gucci', 'louis vuitton', 'chanel', 'dior', 'rolex', 'swarovski',
  'pandora', 'ray-ban', 'rayban', 'oakley', 'havaianas', 'natura', 'boticario', 'stanley', 'yeti',
]
const stripAccents = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const FAMOUS_BRAND_RE = new RegExp(`\\b(${FAMOUS_BRANDS.map((b) => b.replace(/[-\s]/g, '[-\\s]?')).join('|')})\\b`)
const hasFamousBrand = (title) => FAMOUS_BRAND_RE.test(stripAccents(title))

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
// nome do marketplace). Só pra faixa oficial: nome de loja não oficial não é
// necessariamente a marca do produto.
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

// Devolve a faixa ('of' | 'np') em que o item se qualifica, ou null.
function tierIfPasses(row, keeping) {
  const price = priceOf(row)
  if (price == null) return null
  if (row.cb_option !== 'Non-Cross border' || row.condition !== 'New') return null
  const official = isOfficialShop(row.shop_name)
  if (!official && hasFamousBrand(row.title)) return null
  const f = keeping ? KEEP_FACTOR : 1
  const slack = keeping ? 0.1 : 0
  const minShop = official ? MIN_SHOP_RATING : T2_MIN_SHOP_RATING
  const minLikes = official ? MIN_LIKES : T2_MIN_LIKES
  const ok =
    (Number(row.shop_rating) || 0) >= minShop - slack &&
    (Number(row.item_rating) || 0) >= MIN_ITEM_RATING - slack &&
    (Number(row.like) || 0) >= minLikes * f &&
    price >= MIN_PRICE * (keeping ? 0.8 : 1) &&
    price <= MAX_PRICE
  return ok ? (official ? 'of' : 'np') : null
}

// Popularidade (curtidas, em escala log) ponderada pelo preço — "caros e muito
// curtidos". Quem já estava publicado ganha um bônus pra não oscilar.
function score(row, keeping) {
  return Math.log10(1 + (Number(row.like) || 0)) * Math.log10(priceOf(row)) + (keeping ? KEEP_BONUS : 0)
}

// ID de afiliado da Shopee (não é segredo: aparece em todo link de afiliado).
// O link que vem no feed ("product_short link") é só um redirecionador —
// shope.ee/an_redir?origin_link=<produto> — SEM identificar a conta: seguindo o
// link, a URL final não traz o utm_source=an_<id> que o guia da Shopee descreve,
// então o clique não é atribuído a ninguém (provável causa da conversão zero de
// antes de 13/10/2026). O guia manda acrescentar &affiliate_id=<id> e, se quiser,
// &sub_id= (até 5 campos separados por hífen, que aparecem nos relatórios).
const AFFILIATE_ID = process.env.SHOPEE_AFFILIATE_ID || '18150950000'

function affiliateLink(row, vertical, tier) {
  const base =
    row['product_short link'] ||
    (row.product_link ? `https://shope.ee/an_redir?origin_link=${encodeURIComponent(row.product_link)}` : '')
  if (!base) return ''
  if (/[?&]affiliate_id=/.test(base)) return base
  // sub_id: site + vertical + faixa (of = loja oficial, np = não oficial), pra
  // enxergar no painel que tipo de produto e de loja converte.
  return `${base}&affiliate_id=${AFFILIATE_ID}&sub_id=blendibox-0-site-${vertical}-${tier}`
}

function mapRow(row, vertical, tier) {
  const price = row.sale_price || row.price || ''
  const deepLink = affiliateLink(row, vertical, tier)

  return {
    aw_deep_link: deepLink,
    product_name: row.title,
    aw_product_id: row.itemid,
    merchant_product_id: row.itemid,
    merchant_image_url: row.image_link,
    description: row.description || '',
    merchant_category: row.global_category1,
    search_price: price,
    merchant_name: row.shop_name || 'Shopee BR',
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
    brand_name: tier === 'of' ? brandFromOfficialShop(row.shop_name) : '',
    // Não existe coluna equivalente no FIELD_MAP do Awin — passa direto pelo
    // mapRow() genérico de fetch-feeds.mjs (chave desconhecida = mantida
    // como está) e tem prioridade sobre o vertical fixo do merchant.
    vertical,
  }
}

// Seleciona dentro de uma faixa respeitando teto por loja, por vertical e total.
function selectTier(candidates, { maxTotal, perShopCap, verticalCaps, defaultCap }) {
  const perShop = new Map()
  const perVertical = new Map()
  const selected = []
  for (const c of candidates) {
    if (selected.length >= maxTotal) break
    const shop = c.row.shop_name
    const cap = verticalCaps[c.vertical] ?? defaultCap
    if ((perShop.get(shop) ?? 0) >= perShopCap) continue
    if ((perVertical.get(c.vertical) ?? 0) >= cap) continue
    perShop.set(shop, (perShop.get(shop) ?? 0) + 1)
    perVertical.set(c.vertical, (perVertical.get(c.vertical) ?? 0) + 1)
    selected.push(c)
  }
  return { selected, shops: perShop.size, perVertical }
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

  const byTier = { of: [], np: [] }
  const skippedCategories = new Map()
  for (const row of records) {
    const overrideKey = `${row.global_category1}>${row.global_category3}`
    const vertical = CATEGORY3_OVERRIDES[overrideKey] || CATEGORY_TO_VERTICAL[row.global_category1]
    if (!vertical) {
      skippedCategories.set(row.global_category1, (skippedCategories.get(row.global_category1) ?? 0) + 1)
      continue
    }
    const keeping = previousIds.has(String(row.itemid))
    const tier = tierIfPasses(row, keeping)
    if (!tier) continue
    byTier[tier].push({ row, vertical, keeping, tier, score: score(row, keeping) })
  }
  const byScore = (a, b) => b.score - a.score || String(a.row.itemid).localeCompare(String(b.row.itemid))
  byTier.of.sort(byScore)
  byTier.np.sort(byScore)

  const official = selectTier(byTier.of, {
    maxTotal: MAX_TOTAL,
    perShopCap: MAX_PER_SHOP,
    verticalCaps: VERTICAL_CAPS,
    defaultCap: DEFAULT_MAX_PER_VERTICAL,
  })
  const other = selectTier(byTier.np, {
    maxTotal: T2_MAX_TOTAL,
    perShopCap: T2_MAX_PER_SHOP,
    verticalCaps: T2_VERTICAL_CAPS,
    defaultCap: T2_DEFAULT_MAX_PER_VERTICAL,
  })

  const fmt = (m) => [...m].map(([v, n]) => `${v}:${n}`).join(' ')
  console.log(
    `[shopee] curadoria faixa 1 (oficiais): ${official.selected.length} produtos de ${official.shops} lojas ` +
      `(${byTier.of.length} passaram nos cortes; ${official.selected.filter((c) => c.keeping).length} já estavam publicados). ` +
      `Por vertical: ${fmt(official.perVertical)}`
  )
  console.log(
    `[shopee] curadoria faixa 2 (não oficiais): ${other.selected.length} produtos de ${other.shops} lojas ` +
      `(${byTier.np.length} passaram nos cortes; ${other.selected.filter((c) => c.keeping).length} já estavam publicados). ` +
      `Por vertical: ${fmt(other.perVertical)}`
  )
  for (const [category, count] of skippedCategories) {
    console.log(`[shopee] categoria não mapeada "${category}": ${count} produtos ignorados (ver CATEGORY_TO_VERTICAL em scripts/lib/shopee.mjs)`)
  }

  return [...official.selected, ...other.selected].map((c) => mapRow(c.row, c.vertical, c.tier))
}
