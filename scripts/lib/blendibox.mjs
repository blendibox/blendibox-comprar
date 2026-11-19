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
//
// Último estado bom (data/blendibox-store.json, versionado como os outros
// snapshots do workflow): em 2026-11-14 a loja (atrás da CDN GoCache da Yampi)
// passou a devolver ao runner do GitHub um sitemap sem produtos — responde normal
// do Brasil. Sem esse fallback o build gravava "zero produtos", o merchant
// Blendibox sumia do catálogo (hub /blendibox/ virava 404, feeds do Google e do
// Pinterest perdiam os itens) e o rodapé ficava vazio por dias sem ninguém notar.
// Agora, se a loja não responde, o build reaproveita o último estado lido com
// sucesso (até 14 dias) e avisa em voz alta no log do Actions.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', '..')
const SNAPSHOT_PATH = path.join(ROOT, 'data', 'blendibox-store.json')
const DAY_MS = 24 * 60 * 60 * 1000
const SNAPSHOT_MAX_AGE_DAYS = 14
// Só reescreve o snapshot se o conteúdo mudou ou se o último tem mais que isso:
// evita um commit diário de ~100KB sem mudança nenhuma.
const SNAPSHOT_REFRESH_DAYS = 3

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

// Aviso que não passa batido: além do log, vira anotação amarela no resumo da
// execução do GitHub Actions.
function warn(message) {
  console.warn(message)
  if (process.env.GITHUB_ACTIONS) console.log(`::warning title=Blendibox::${message.replace(/\r?\n/g, ' ')}`)
}

// Texto curto pro log: status + servidor/CDN + redirecionamento + um pedaço do
// corpo (WAF/CDN costuma explicar o bloqueio ali).
function describeResponse(page) {
  return (
    `HTTP ${page.status}` +
    `${page.server ? ` (server: ${page.server})` : ''}` +
    `${page.location ? ` → ${page.location}` : ''}` +
    `${page.snippet ? ` — "${page.snippet}"` : ''}`
  )
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
      const server = res.headers.get('server') || ''
      if (res.status >= 300 && res.status < 400) {
        return { status: res.status, body: '', server, location: res.headers.get('location') || '' }
      }
      if (res.status >= 500) throw new Error(`HTTP ${res.status}`)
      if (res.status === 200) return { status: 200, body: await res.text(), server }
      const snippet = (await res.text().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 160)
      return { status: res.status, body: '', server, snippet }
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
  if (page.status !== 200) {
    // 3xx (302 pra home) e 404/410 = despublicado de verdade. Qualquer outro status
    // (403/429 de WAF/CDN, por exemplo) NÃO prova que o produto saiu do ar: vira
    // falha, pra não ser confundido com despublicação.
    const unpublished = (page.status >= 300 && page.status < 400) || page.status === 404 || page.status === 410
    if (unpublished) return { url, dead: true, status: page.status }
    throw new Error(describeResponse(page))
  }

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

// Último estado bom gravado por uma leitura COMPLETA e limpa da loja (ou null).
async function readSnapshot() {
  try {
    const snap = JSON.parse(await readFile(SNAPSHOT_PATH, 'utf-8'))
    return Array.isArray(snap.products) && Number.isFinite(Date.parse(snap.savedAt)) ? snap : null
  } catch {
    return null
  }
}

function snapshotAgeDays(snapshot) {
  return (Date.now() - Date.parse(snapshot.savedAt)) / DAY_MS
}

async function writeSnapshotIfNeeded(products, previous) {
  if (!products.length) return // loja realmente sem produto à venda: não vira "estado bom"
  const unchanged = previous && JSON.stringify(previous.products) === JSON.stringify(products)
  if (unchanged && snapshotAgeDays(previous) < SNAPSHOT_REFRESH_DAYS) return
  await mkdir(path.dirname(SNAPSHOT_PATH), { recursive: true })
  await writeFile(SNAPSHOT_PATH, JSON.stringify({ savedAt: new Date().toISOString(), products }))
}

// → { products: [{ url, name, description, category, variants: [disponíveis] }], stats }
// Nunca lança: loja fora do ar ou página quebrada vira aviso + o último estado bom
// (ou lista vazia se não houver um recente) — o build do Compare Ofertas não pode
// parar por causa de um catálogo tão pequeno.
export async function fetchBlendiboxStore() {
  const stats = { pages: 0, dead: 0, malformed: 0, failed: 0, fromSnapshot: 0, variants: 0, skipped: {} }
  const snapshot = await readSnapshot()
  const usable = snapshot && snapshotAgeDays(snapshot) <= SNAPSHOT_MAX_AGE_DAYS ? snapshot : null

  let urls = []
  let sitemapProblem = null
  try {
    const sitemap = await fetchPage(SITEMAP_URL)
    if (sitemap.status !== 200) {
      sitemapProblem = describeResponse(sitemap)
    } else {
      urls = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()).filter((u) => u.startsWith(STORE_URL))
      if (!urls.length) sitemapProblem = `HTTP 200 (server: ${sitemap.server || '?'}), mas sem nenhuma URL de produto da loja`
    }
  } catch (err) {
    sitemapProblem = err.message
  }
  if (sitemapProblem) {
    if (!usable) {
      warn(`[blendibox] sitemap da loja indisponível (${sitemapProblem}) e sem estado bom recente guardado — sem produtos da Blendibox nesta rodada.`)
      return { products: [], stats }
    }
    warn(
      `[blendibox] sitemap da loja indisponível (${sitemapProblem}) — usando o último estado bom ` +
        `(${usable.savedAt.slice(0, 10)}, ${Math.floor(snapshotAgeDays(usable))} dia(s) atrás): ${usable.products.length} produtos.`
    )
    stats.fromSnapshot = usable.products.length
    stats.variants = usable.products.reduce((n, p) => n + p.variants.length, 0)
    return { products: usable.products, stats }
  }

  const products = []
  for (const url of urls) {
    stats.pages++
    let product
    try {
      product = await readProduct(url)
    } catch (err) {
      stats.failed++
      const kept = usable?.products.find((p) => p.url === url)
      if (kept) {
        stats.fromSnapshot++
        stats.variants += kept.variants.length
        products.push(kept)
        warn(`[blendibox] falha ao ler ${url}: ${err.message} — usando o último estado bom desse produto.`)
      } else {
        warn(`[blendibox] falha ao ler ${url}: ${err.message}`)
      }
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
      `${stats.fromSnapshot ? ` (${stats.fromSnapshot} reaproveitados do último estado bom)` : ''}` +
      `${Object.keys(stats.skipped).length ? `; variações descartadas: ${JSON.stringify(stats.skipped)}` : ''}.`
  )
  // Só uma leitura 100% limpa vira o novo "último estado bom".
  if (!stats.failed && !stats.malformed) await writeSnapshotIfNeeded(products, snapshot)
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
