// Loja própria da Blendibox (bolsas, Yampi) lida AO VIVO das páginas de produto
// em loja.blendibox.com.br — fonte única do rodapé "Produtos Blendibox" e do
// merchant "Blendibox" dentro do Compare Ofertas (cada variação de cor vira um
// produto).
//
// Por que não o XML Google Shopping da Yampi (usado antes só pro rodapé): é um
// retrato que atrasa em relação à loja. Em 2026-10-28 ele listava 6 das 16 cores
// da Maxi Bolsa e marcava como "in stock" 4 produtos cuja página já redirecionava
// pra home (despublicados) — o rodapé mandava gente pra uma loja sem o produto.
//
// A página de produto existente traz, no próprio HTML (sem JS): o JSON-LD
// Product (nome, descrição, marca, imagens) e o bloco `"skus":{"data":[...]}` com,
// POR VARIAÇÃO: sku, cor, preço, imagens da cor, `stock_status` e `blocked_sale`.
// Produto despublicado responde 302 pra home. A lista de produtos vem do
// products_sitemap.xml da própria loja.
const STORE_URL = 'https://loja.blendibox.com.br'
const SITEMAP_URL = `${STORE_URL}/products_sitemap.xml`
const USER_AGENT = 'Mozilla/5.0 (compatible; CompareOfertasBot/1.0; +https://comprar.blendibox.com.br)'
const MERCHANT_ID = 'blendibox'
const MERCHANT_NAME = 'Blendibox'
const MAX_DESCRIPTION_CHARS = 1500
const FETCH_ATTEMPTS = 3

// Rastreio de origem na loja (GA4 da loja): quanto do tráfego que sai do
// Compare Ofertas realmente compra.
const UTM = 'utm_source=compareofertas&utm_medium=catalogo&utm_campaign=blendibox-bolsas'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// GET com redirect manual: 302 pra home é o sinal de "produto despublicado" (não
// é erro, nem se tenta de novo); só erro de rede/5xx é repetido.
async function fetchPage(url) {
  let lastError = null
  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        redirect: 'manual',
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xml' },
        signal: AbortSignal.timeout(20000),
      })
      if (res.status >= 300 && res.status < 400) return { status: res.status, body: '' }
      if (res.status >= 500) throw new Error(`HTTP ${res.status}`)
      return { status: res.status, body: res.status === 200 ? await res.text() : '' }
    } catch (err) {
      lastError = err
      if (attempt < FETCH_ATTEMPTS) await sleep(attempt * 1500)
    }
  }
  throw lastError
}

// Lê o array JSON que começa em html[startIdx] === '[' (respeitando strings e
// escapes) — o bloco de SKUs é grande e aninhado demais pra regex.
function readJsonArray(html, startIdx) {
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = startIdx; i < html.length; i++) {
    const c = html[i]
    if (inString) {
      if (escaped) escaped = false
      else if (c === '\\') escaped = true
      else if (c === '"') inString = false
      continue
    }
    if (c === '"') inString = true
    else if (c === '[') depth++
    else if (c === ']') {
      depth--
      if (depth === 0) return JSON.parse(html.slice(startIdx, i + 1))
    }
  }
  return null
}

function readSkus(html) {
  const marker = '"skus":{"data":'
  const at = html.indexOf(marker)
  if (at < 0) return null
  return readJsonArray(html, at + marker.length)
}

function readProductJsonLd(html) {
  for (const part of html.split('application/ld+json').slice(1)) {
    const body = part.slice(part.indexOf('>') + 1, part.indexOf('</script>'))
    if (!body.includes('"Product"')) continue
    try {
      const json = JSON.parse(body)
      if (json['@type'] === 'Product') return json
    } catch {
      // JSON-LD quebrado: tenta o próximo bloco
    }
  }
  return null
}

// Categoria da própria loja (ex: Bolsas > Bolsas Transversais), do bloco
// `"categories":{"data":[...]}` da página. fetch-feeds.mjs usa o último
// segmento depois do ">" como categoria.
function readCategory(html) {
  const marker = '"categories":{"data":'
  const at = html.indexOf(marker)
  if (at < 0) return 'Bolsas'
  try {
    const categories = readJsonArray(html, at + marker.length) || []
    const active = categories.filter((c) => c && c.active !== false && c.name)
    const child = active.find((c) => c.parent_id != null)
    if (child) {
      const parent = active.find((c) => c.id === child.parent_id)
      return parent ? `${parent.name} > ${child.name}` : child.name
    }
    return active[0]?.name || 'Bolsas'
  } catch {
    return 'Bolsas'
  }
}

function cleanDescription(text) {
  return String(text || '')
    .replace(/<[^>]*>/g, ' ')
    // o cadastro da loja às vezes cola link de vídeo do Shopee na descrição
    .replace(/https?:\/\/\S+\.(mp4|mov|webm)\S*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_DESCRIPTION_CHARS)
}

function capitalizeWords(text) {
  return text.replace(/(^|\s|\/)(\p{L})/gu, (_, sep, letter) => `${sep}${letter.toUpperCase()}`)
}

// Uma variação só é "disponível" quando a PRÓPRIA loja diz que dá pra comprar:
// status em estoque, venda não bloqueada, preço válido e foto da cor. (A
// quantidade pode ser 0 mesmo em estoque — venda sem controle de quantidade —,
// por isso o status da loja manda, não o número.)
function parseVariant(sku, productName) {
  const price = Number(sku.price_sale ?? sku.prices?.data?.price_sale)
  const listPrice = Number(sku.prices?.data?.price)
  const images = (sku.images?.data || []).map((i) => i?.url).filter(Boolean)
  const colorValue = (sku.variations || []).map((v) => v.value).filter(Boolean).join(' / ')
  const color = colorValue ? capitalizeWords(colorValue) : ''
  const quantity = Number(sku.total_in_stock) || 0

  let skipReason = null
  if (sku.blocked_sale) skipReason = 'blocked'
  else if (sku.stock_status !== 'in_stock') skipReason = 'out_of_stock'
  else if (!Number.isFinite(price) || price <= 0) skipReason = 'no_price'
  else if (!images.length) skipReason = 'no_image'

  return {
    skipReason,
    id: String(sku.id),
    sku: String(sku.sku || sku.id),
    color,
    title: color ? `${productName} ${color}` : productName,
    price,
    listPrice: Number.isFinite(listPrice) && listPrice > price ? listPrice : null,
    quantity,
    images,
  }
}

async function readProduct(url) {
  const page = await fetchPage(url)
  if (page.status !== 200) return { url, dead: true, status: page.status }

  const ld = readProductJsonLd(page.body)
  const skus = readSkus(page.body)
  if (!ld?.name || !skus) return { url, malformed: true }

  // O cadastro do 3 em 1 vem com um código interno colado no nome
  // ("... - Blendibox | 3em1_puffer") — tira o sufixo "| codigo_interno".
  const name = String(ld.name).replace(/\s*\|\s*\S*_\S*\s*$/, '').trim()
  const variants = skus.map((sku) => parseVariant(sku, name))
  return {
    url,
    name,
    description: cleanDescription(ld.description),
    category: readCategory(page.body),
    variants,
  }
}

// → { products: [{ url, name, description, category, variants: [disponíveis] }], stats }
// Nunca lança: loja fora do ar ou página quebrada vira aviso + lista menor/vazia
// — o build do Compare Ofertas não pode parar por causa de um catálogo tão pequeno.
export async function fetchBlendiboxStore() {
  const stats = { pages: 0, dead: 0, malformed: 0, failed: 0, variants: 0, skipped: {} }
  let urls = []
  try {
    const sitemap = await fetchPage(SITEMAP_URL)
    urls = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()).filter((u) => u.startsWith(STORE_URL))
  } catch (err) {
    console.warn(`[blendibox] sitemap da loja indisponível (${err.message}) — sem produtos da Blendibox nesta rodada.`)
    return { products: [], stats }
  }
  if (!urls.length) {
    console.warn('[blendibox] sitemap sem produtos — sem produtos da Blendibox nesta rodada.')
    return { products: [], stats }
  }

  const products = []
  for (const url of urls) {
    stats.pages++
    let product
    try {
      product = await readProduct(url)
    } catch (err) {
      stats.failed++
      console.warn(`[blendibox] falha ao ler ${url}: ${err.message}`)
      continue
    }
    if (product.dead) {
      stats.dead++
      continue
    }
    if (product.malformed) {
      stats.malformed++
      console.warn(`[blendibox] página sem dados de produto/SKUs, ignorada: ${url}`)
      continue
    }
    const available = []
    for (const variant of product.variants) {
      if (variant.skipReason) stats.skipped[variant.skipReason] = (stats.skipped[variant.skipReason] || 0) + 1
      else available.push(variant)
    }
    if (!available.length) continue
    stats.variants += available.length
    products.push({ ...product, variants: available })
  }

  console.log(
    `[blendibox] ${stats.pages} páginas: ${products.length} produtos com variação disponível (${stats.variants} variações), ` +
      `${stats.dead} despublicados (redirecionam pra home), ${stats.malformed} sem dados, ${stats.failed} com falha` +
      `${Object.keys(stats.skipped).length ? `; variações descartadas: ${JSON.stringify(stats.skipped)}` : ''}.`
  )
  return { products, stats }
}

// Uma linha por VARIAÇÃO disponível, no formato das colunas da Awin que o
// fetch-feeds.mjs já sabe consumir (mesmo padrão de scripts/lib/shopee.mjs).
// merchant_product_id = SKU da loja (estável: vira o g:id do Merchant/Pinterest).
export async function fetchBlendiboxRows() {
  const { products } = await fetchBlendiboxStore()
  const rows = []
  const usedIds = new Set()
  const now = new Date().toISOString()
  for (const product of products) {
    for (const variant of product.variants) {
      // SKU repetido entre produtos derrubaria uma das linhas no dedup por
      // merchant_product_id — cai pro id numérico da Yampi, que é único.
      const productId = usedIds.has(variant.sku) ? variant.id : variant.sku
      usedIds.add(productId)
      const link = `${product.url}${product.url.includes('?') ? '&' : '?'}${UTM}`
      const [main, second, third, fourth] = variant.images
      rows.push({
        aw_deep_link: link,
        product_name: variant.title,
        aw_product_id: variant.id,
        merchant_product_id: productId,
        merchant_image_url: main,
        description: product.description,
        merchant_category: product.category,
        search_price: variant.price,
        merchant_name: MERCHANT_NAME,
        merchant_id: MERCHANT_ID,
        category_name: product.category,
        category_id: '',
        aw_image_url: main,
        currency: 'BRL',
        store_price: variant.listPrice ?? variant.price,
        delivery_cost: '',
        merchant_deep_link: link,
        language: 'pt',
        last_updated: now,
        display_price: variant.price,
        data_feed_id: MERCHANT_ID,
        alternate_image_two: second || '',
        alternate_image_three: third || '',
        alternate_image_four: fourth || '',
        large_image: main,
        reviews: '',
        rating: '',
        average_rating: '',
        number_available: '',
        in_stock: 'in stock',
        // 0 = "sem controle de quantidade" na Yampi, não "esgotado": só informa quando há número real.
        stock_quantity: variant.quantity > 0 ? variant.quantity : '',
        product_GTIN: '',
        colour: variant.color,
        brand_name: MERCHANT_NAME,
      })
    }
  }
  return rows
}
