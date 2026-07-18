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
import { parse } from 'csv-parse/sync'

// Mapeamento categoria (global_category1 do feed) → vertical do site.
// Nomes conferidos rodando contra o feed real (não são só um chute inicial)
// — categorias que não aparecem aqui são ignoradas de propósito (build loga
// quais foram puladas, pra facilitar estender esta tabela depois em vez de
// importar tudo de uma vez). Categorias sem vertical correspondente hoje
// (autopeças, alimentos, pet, papelaria...) ficam de fora até existir um
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
}

// Casos em que o vertical certo depende da subcategoria (global_category3),
// não só da categoria 1 — ex: álbum/figurinha de copa do mundo entra como
// "colecionável" na Shopee (Hobbies & Collections), não como livro, mas faz
// sentido junto de "livros" no site (mesma prateleira de adesivos/figurinhas
// que já existe em Books & Magazines > Sticker & Colouring Books).
const CATEGORY3_OVERRIDES = {
  'Hobbies & Collections>Sports Collectibles': 'livros',
}

// Catálogo começa limitado (não importa o feed inteiro de uma vez) — top N
// produtos por vertical, ranqueados por avaliação/curtidas como sinal de
// qualidade (não temos histórico de vendas próprio pra esses produtos).
// Moda, beleza, eletrônicos e casa são as categorias de maior venda na
// Shopee em geral — limite maior pra elas; o resto segue mais conservador
// até termos dado real de conversão pra reajustar.
const DEFAULT_MAX_PER_VERTICAL = 300
const VERTICAL_CAPS = {
  moda: 1000,
  beleza: 1000,
  eletronicos: 1000,
  casa: 1000,
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

  const csvText = await res.text()
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  })
  console.log(`[shopee] ${records.length} produtos no feed bruto`)

  // Agrupa por vertical e, dentro de cada vertical, por subcategoria
  // (global_category3) — necessário pra depois ranquear com diversidade em
  // vez de um corte único por nota/curtidas, que espremia subgêneros
  // pequenos (ex: bíblia/devocional, autoajuda, adesivos) pra fora do corte
  // só porque outros subgêneros maiores (ex: literatura de forma geral)
  // tinham nota média mais alta.
  const byVertical = new Map()
  const skipped = new Map()

  for (const row of records) {
    const overrideKey = `${row.global_category1}>${row.global_category3}`
    const vertical = CATEGORY3_OVERRIDES[overrideKey] || CATEGORY_TO_VERTICAL[row.global_category1]
    if (!vertical) {
      skipped.set(row.global_category1, (skipped.get(row.global_category1) ?? 0) + 1)
      continue
    }
    if (!byVertical.has(vertical)) byVertical.set(vertical, new Map())
    const bySubcategory = byVertical.get(vertical)
    const subcategory = row.global_category3 || row.global_category2 || '(geral)'
    if (!bySubcategory.has(subcategory)) bySubcategory.set(subcategory, [])
    bySubcategory.get(subcategory).push(row)
  }

  for (const [category, count] of skipped) {
    console.log(`[shopee] categoria não mapeada "${category}": ${count} produtos ignorados (ver CATEGORY_TO_VERTICAL em scripts/lib/shopee.mjs)`)
  }

  const rows = []
  for (const [vertical, bySubcategory] of byVertical) {
    const cap = VERTICAL_CAPS[vertical] ?? DEFAULT_MAX_PER_VERTICAL
    // Cada subcategoria é ranqueada internamente por avaliação+curtidas (sinal
    // de qualidade disponível no feed, já que não temos histórico de vendas
    // próprio ainda), mas a seleção final entre subcategorias é round-robin —
    // garante espaço pras pequenas em vez de deixar as maiores dominarem tudo.
    const queues = [...bySubcategory.entries()].map(([subcategory, items]) => ({
      subcategory,
      items: items
        .map((row) => ({ row, score: (Number(row.item_rating) || 0) * 1000 + (Number(row.like) || 0) }))
        .sort((a, b) => b.score - a.score),
      cursor: 0,
    }))

    const selected = []
    let progressed = true
    while (selected.length < cap && progressed) {
      progressed = false
      for (const queue of queues) {
        if (selected.length >= cap) break
        if (queue.cursor < queue.items.length) {
          selected.push(queue.items[queue.cursor].row)
          queue.cursor++
          progressed = true
        }
      }
    }

    const totalCandidates = queues.reduce((sum, q) => sum + q.items.length, 0)
    console.log(
      `[shopee] vertical "${vertical}": ${selected.length}/${totalCandidates} produtos (limite ${cap}, ${queues.length} subcategorias)`
    )
    for (const row of selected) {
      rows.push(mapRow(row, vertical))
    }
  }

  return rows
}
