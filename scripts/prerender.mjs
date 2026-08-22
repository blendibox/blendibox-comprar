// Roda depois do `vite build`. Gera HTML estático real (não só o shell SPA)
// pra cada produto elegível/prioritário e pra cada hub de loja/categoria/vertical,
// com <title>/meta/OG/JSON-LD próprios — importante pra SEO e pra crawlers que
// não executam JS (redes sociais, etc). O React é o mesmo usado no cliente
// (src/router.tsx), bundlado sob demanda aqui via esbuild pra rodar em Node.
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import { getRealImageCandidates } from './lib/images.mjs'
import { slugify } from './lib/slugify.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DIST_DIR = path.join(ROOT, 'dist')
const DATA_DIR = path.join(ROOT, 'public', 'data')
const SITE_URL = (process.env.SITE_URL || 'https://comprar.blendibox.com.br').replace(/\/$/, '')
const PAGE_SIZE = 60

// merchantCategory normalmente já vem em português (a maioria dos merchants
// manda o nome da categoria pronto pro feed da Awin). A LG é a exceção conhecida
// hoje: parte do catálogo dela vem na taxonomia do Google Product Category, em
// inglês (o programa dela na Awin paga em dólar, então usam o feed internacional
// padrão). As 11 strings abaixo são as únicas ocorrências reais encontradas
// rodando contra os 3.631 produtos da LG em public/data/products/lg — não é
// tradução de dicionário genérico, é o valor exato que aparece no feed. Sem
// entrada aqui = usa o último trecho como está (nunca inventa um termo).
const CATEGORY_TRANSLATIONS = {
  'Electronics > Audio > Audio Components > Speakers': 'Caixas de Som',
  'Electronics > Electronics Accessories > Computer Accessories': 'Acessórios de Informática',
  'Electronics > Video > Computer Monitors': 'Monitores',
  'Electronics > Video > Projectors': 'Projetores',
  'Electronics > Video > Televisions': 'TVs',
  'Electronics > Video > Video Accessories > Computer Monitor Accessories': 'Acessórios para Monitores',
  'Home & Garden > Household Appliances > Climate Control Appliances': 'Ar-Condicionado',
  'Home & Garden > Household Appliances > Climate Control Appliances > Air Conditioners': 'Ar-Condicionado Residencial',
  'Home & Garden > Household Appliances > Laundry Appliances > Washing Machines': 'Lavanderia',
  'Home & Garden > Kitchen & Dining > Cookware & Bakeware > Cookware': 'Panelas',
  'Home & Garden > Kitchen & Dining > Kitchen Appliances': 'Eletrodomésticos de Cozinha',
}

// Rótulo curto de categoria pra usar no <title> e no breadcrumb. Strings com
// " > " são taxonomia Google Product Category (só a LG usa isso hoje); as
// demais já são o nome de categoria em português como o merchant mandou.
function categoryLabel(merchantCategory) {
  if (!merchantCategory) return null
  if (!merchantCategory.includes('>')) return merchantCategory
  return CATEGORY_TRANSLATIONS[merchantCategory] || merchantCategory.split('>').pop().trim()
}

// buildCategorySlug() em fetch-feeds.mjs gera o categorySlug a partir do
// último trecho do merchantCategory BRUTO (antes de qualquer tradução) — pra
// LG isso significa slugs em inglês ("televisions", "speakers", etc.) nas
// páginas de hub de categoria. Deriva o mesmo mapeamento de CATEGORY_TRANSLATIONS
// (uma fonte só, sem repetir a lista) pra exibir o rótulo certo nessas páginas
// sem mexer no slug/URL em si (evita quebrar link já indexado). Contraparte
// client-side: src/lib/categoryLabels.ts (mantida em sincronia manualmente).
const CATEGORY_SLUG_LABELS = Object.fromEntries(
  Object.entries(CATEGORY_TRANSLATIONS).map(([breadcrumb, label]) => [slugify(breadcrumb.split('>').pop().trim()), label])
)
function categoryHubLabel(categorySlug) {
  return CATEGORY_SLUG_LABELS[categorySlug] || categorySlug.replace(/-/g, ' ')
}

async function buildEntryServer() {
  const result = await build({
    entryPoints: [path.join(ROOT, 'src', 'entry-server.tsx')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    jsx: 'automatic',
    absWorkingDir: ROOT,
    // Só bundla o código-fonte próprio; pacotes de node_modules (react,
    // react-dom/server, react-router) ficam como import externo e são
    // resolvidos pelo Node normalmente — bundlar react-dom/server quebra
    // (faz require dinâmico de módulos nativos do Node tipo "stream").
    packages: 'external',
  })
  const tmpFile = path.join(__dirname, '.entry-server.generated.mjs')
  await writeFile(tmpFile, result.outputFiles[0].text)
  const mod = await import(`${pathToFileURL(tmpFile).href}?t=${Date.now()}`)
  return mod
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Imagem padrão pra og:image/twitter:image quando a página não tem foto
// própria (institucionais, blog) — gerada por scripts/generate-og-image.mjs,
// versionada no repo. Sem isso, compartilhar um link de artigo no WhatsApp/X
// não mostrava nenhuma prévia visual.
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`
// Logo quadrado (1254x1254) pro publisher.logo do JSON-LD de Article/
// BlogPosting — o Google recomenda pra rich results, mas exige formato
// quadrado/próximo disso; a imagem padrão de OG acima é 1200x630 (larga
// demais) e não servia pra isso.
const LOGO_IMAGE = `${SITE_URL}/logo.png`

function buildHead({ title, description, canonical, image, jsonLd, article, product }) {
  const resolvedImage = image || DEFAULT_OG_IMAGE
  const ogType = article ? 'article' : product ? 'product' : 'website'
  const tags = [
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:type" content="${ogType}" />`,
    `<meta property="og:image" content="${escapeHtml(resolvedImage)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(resolvedImage)}" />`,
  ]
  if (article) {
    tags.push(`<meta property="article:published_time" content="${escapeHtml(article.publishedTime)}" />`)
    if (article.modifiedTime) tags.push(`<meta property="article:modified_time" content="${escapeHtml(article.modifiedTime)}" />`)
  }
  if (product) {
    // Convenção do Open Graph pra comércio (Facebook/Pinterest) — só emite
    // quando o preço é real (product.price nunca é inventado).
    if (product.price != null) {
      tags.push(`<meta property="product:price:amount" content="${product.price}" />`)
      tags.push(`<meta property="product:price:currency" content="${escapeHtml(product.currency || 'BRL')}" />`)
    }
  }
  for (const entry of jsonLd ?? []) {
    tags.push(`<script type="application/ld+json">${JSON.stringify(entry)}</script>`)
  }
  return tags.join('\n    ')
}

// Disponibilidade com base no dado REAL do feed, quando existe:
// in_stock ("1"/"0"/"true"/…) tem prioridade; senão stock_quantity; senão o
// legado number_available. Só na ausência total de sinal é que assumimos
// disponível (produto está num feed ativo do lojista) — nunca inventamos
// "fora de estoque" nem nada além do que o feed diz.
function availabilityFor(product) {
  const raw = product.inStock
  if (raw != null && String(raw).trim() !== '') {
    const s = String(raw).trim().toLowerCase()
    if (['0', 'false', 'no', 'n', 'out of stock', 'outofstock', 'unavailable'].includes(s))
      return 'https://schema.org/OutOfStock'
    if (['1', 'true', 'yes', 'y', 'in stock', 'instock', 'available'].includes(s))
      return 'https://schema.org/InStock'
  }
  if (typeof product.stockQuantity === 'number')
    return product.stockQuantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
  if (product.numberAvailable === 0) return 'https://schema.org/OutOfStock'
  return 'https://schema.org/InStock'
}

// GTIN só entra no schema quando parece um código real (só dígitos, no
// comprimento padrão de um GTIN) — um valor mal formado do feed gera erro
// no Search Console em vez de ajudar. Aceita gtin8/12/13/14 sem tentar
// adivinhar qual variante é (schema.org aceita "gtin" genérico desde 2021).
function validGtin(raw) {
  if (!raw) return null
  const s = String(raw).trim()
  if (!/^\d+$/.test(s)) return null
  return [8, 12, 13, 14].includes(s.length) ? s : null
}

function productJsonLd(product, canonical) {
  const offer = {
    '@type': 'Offer',
    url: canonical,
    priceCurrency: product.currency || 'BRL',
    // Quem vende (a loja parceira) — distinto de "brand" (fabricante).
    seller: { '@type': 'Organization', name: product.merchantDisplayName },
    // Todo produto vem de feed de loja/varejo estabelecida (não é uma
    // plataforma de usado/recondicionado) — condição nova é verdadeira pra
    // praticamente 100% do catálogo, sem depender de um campo que o feed
    // não informa.
    itemCondition: 'https://schema.org/NewCondition',
    // Disponibilidade a partir do estoque real do feed (in_stock/stock_quantity);
    // só assume "disponível" quando não há nenhum sinal (feed ativo do lojista).
    availability: availabilityFor(product),
    // Data em que confirmamos esse preço — o lastUpdated do feed quando
    // existe, senão a data desta atualização do site.
    validFrom: product.lastUpdated || new Date().toISOString(),
    // Search Console pede validThrough/priceValidUntil em toda oferta. Não
    // temos essa data vinda do feed (nenhum lojista informa isso), mas o
    // site se reconstrói e rebusca os preços todo dia — 30 dias é uma janela
    // conservadora e verdadeira (o preço é revalidado bem antes disso),
    // não um valor inventado sem lastro.
    priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    // Art. 49 do CDC garante 7 dias corridos de arrependimento em toda
    // compra feita fora do estabelecimento (inclui e-commerce), pra
    // qualquer lojista no Brasil — não é uma política que o lojista
    // escolheu, é piso legal, então dá pra declarar sem depender do feed
    // informar a política de devolução de cada um. Fica só o mínimo
    // juridicamente garantido (janela de dias) — sem afirmar método/custo
    // de devolução, que aí sim varia por lojista e não temos como confirmar.
    hasMerchantReturnPolicy: {
      '@type': 'MerchantReturnPolicy',
      applicableCountry: 'BR',
      returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
      merchantReturnDays: 7,
    },
  }
  if (product.searchPrice != null) offer.price = product.searchPrice

  // Só inclui shippingDetails quando o feed realmente informa o custo de
  // entrega — não dá pra inventar prazo/valor de frete por loja.
  if (product.deliveryCost != null) {
    offer.shippingDetails = {
      '@type': 'OfferShippingDetails',
      shippingRate: {
        '@type': 'MonetaryAmount',
        value: product.deliveryCost,
        currency: product.currency || 'BRL',
      },
      shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'BR' },
    }
  }

  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.productName,
    // Todas as fotos reais do produto (mesma fonte que alimenta a galeria
    // visível na página — ver src/lib/images.ts), não só a principal.
    image: getRealImageCandidates(product),
    sku: product.merchantProductId || product.awProductId,
    brand: { '@type': 'Brand', name: product.merchantDisplayName },
    offers: offer,
  }
  if (product.description) productLd.description = product.description

  const category = categoryLabel(product.merchantCategory) || product.categoryName
  if (category) productLd.category = category

  const gtin = validGtin(product.productGtin)
  if (gtin) productLd.gtin = gtin

  // aggregateRating só entra quando o feed tem os DOIS dados reais (nota E
  // contagem de avaliações) — uma nota sem contagem não é um sinal válido
  // pro Google, e nunca inventamos nenhum dos dois.
  const ratingValue = product.averageRating ?? product.rating
  const reviewCount = product.reviews
  if (ratingValue && reviewCount) {
    productLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue,
      reviewCount,
    }
  }

  const breadcrumbItems = [
    { '@type': 'ListItem', position: 1, name: 'Início', item: `${SITE_URL}/` },
    {
      '@type': 'ListItem',
      position: 2,
      name: product.merchantDisplayName,
      item: `${SITE_URL}/${product.merchantSlug}/`,
    },
  ]
  // Nível extra só quando dá pra apontar pra um hub de categoria real (mesma
  // rota gerada mais abaixo em generateAll, /:vertical/categoria/:slug) — sem
  // isso o ListItem ficaria sem URL válida, o que o Google rejeita.
  if (category && product.vertical && product.categorySlug) {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: breadcrumbItems.length + 1,
      name: category,
      item: `${SITE_URL}/${product.vertical}/categoria/${product.categorySlug}/`,
    })
  }
  breadcrumbItems.push({ '@type': 'ListItem', position: breadcrumbItems.length + 1, name: product.productName, item: canonical })

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems,
  }

  return [productLd, breadcrumbLd]
}

// FAQ das páginas de cupom por loja — TEM QUE bater com o texto visível em
// src/pages/CouponsMerchantPage.tsx (faqFor), senão o FAQPage do JSON-LD fica
// inválido (o Google exige que o conteúdo do FAQ apareça na página).
function couponFaq(displayName) {
  return [
    {
      q: `Os cupons da ${displayName} são de verdade?`,
      a: `Sim. Todos os cupons e promoções da ${displayName} vêm direto do programa oficial de afiliados da loja e são verificados na nossa atualização diária. Cupons vencidos são removidos automaticamente.`,
    },
    {
      q: `Como usar um cupom de desconto da ${displayName}?`,
      a: `Copie o código do cupom aqui, clique para ir à loja e cole o código no carrinho ou na finalização da compra no site da ${displayName}. A compra é feita direto com a loja.`,
    },
    {
      q: `E as promoções da ${displayName} sem código de cupom?`,
      a: `Algumas ofertas da ${displayName} não precisam de código: é só clicar em "Ir para a loja" e o desconto já está aplicado na página de ofertas do site da ${displayName}. Nesses casos não há código pra copiar — basta aproveitar a promoção direto na loja.`,
    },
    {
      q: `Com que frequência os cupons da ${displayName} são atualizados?`,
      a: `Todo dia. Buscamos as promoções ativas da ${displayName} diariamente, então a lista está sempre atualizada e sem cupons vencidos.`,
    },
  ]
}

// JSON-LD das páginas de cupom por loja: BreadcrumbList (rich result de
// navegação) + FAQPage (rich result de perguntas — o mais valioso pra essas
// páginas). Coupon não tem tipo próprio no schema.org, e um Offer sem preço
// gera aviso no Search Console, então focamos nesses dois que ranqueiam de
// verdade sem risco.
function couponsMerchantJsonLd(displayName, canonical) {
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Cupons', item: `${SITE_URL}/cupons/` },
      { '@type': 'ListItem', position: 3, name: `Cupom ${displayName}`, item: canonical },
    ],
  }
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: couponFaq(displayName).map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
  return [breadcrumb, faq]
}

// BlogPosting + Breadcrumb (+ FAQ quando o post tem) pros artigos do blog. O
// FAQ só entra se tiver conteúdo visível correspondente na página
// (BlogPostPage renderiza post.faq), mesma disciplina do couponFaq acima.
function blogPostJsonLd(post, canonical) {
  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.metaDescription,
    image: [DEFAULT_OG_IMAGE],
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: { '@type': 'Organization', name: 'Compare Ofertas' },
    publisher: {
      '@type': 'Organization',
      name: 'Compare Ofertas',
      logo: { '@type': 'ImageObject', url: LOGO_IMAGE, width: 1254, height: 1254 },
    },
    mainEntityOfPage: canonical,
  }
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog/` },
      { '@type': 'ListItem', position: 3, name: post.title, item: canonical },
    ],
  }
  const jsonLd = [articleLd, breadcrumbLd]
  if (post.faq && post.faq.length) {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: post.faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    })
  }
  return jsonLd
}

function inlineJson(value) {
  // Evita que o JSON quebre a tag <script> caso algum texto contenha "</script>".
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

async function renderPage({ template, renderRoute, routePath, initialData, head }) {
  // A URL real no navegador sempre tem barra final (arquivo .../index.html
  // servido no diretório) — o location do StaticRouter no SSR e a chave do
  // __INITIAL_DATA__ precisam bater com isso, senão a hidratação no cliente
  // não encontra o dado (e o React descarta o HTML do servidor, refazendo
  // tudo do zero incluindo um fetch desnecessário).
  const hydratedPath = `${routePath}/`
  const bodyHtml = renderRoute(hydratedPath, initialData)
  const headHtml = buildHead(head)
  const hydrationScript =
    initialData !== undefined
      ? `<script>window.__INITIAL_DATA__ = ${inlineJson({ path: hydratedPath, data: initialData })}</script>\n  `
      : ''
  const html = template
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(head.title)}</title>`)
    // Remove a meta description genérica do template antes de injetar a
    // específica da página — senão fica duplicada (a do template some via
    // </head> abaixo, mas essa aqui é a que o head original já trazia).
    .replace(/\s*<meta\s+name="description"[\s\S]*?\/?>/, '')
    .replace('</head>', `    ${headHtml}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${bodyHtml}</div>\n  ${hydrationScript}`)

  const outDir = path.join(DIST_DIR, ...routePath.split('/').filter(Boolean))
  await mkdir(outDir, { recursive: true })
  await writeFile(path.join(outDir, 'index.html'), html)
  return `${SITE_URL}${routePath}/`
}

async function walkProductFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await walkProductFiles(full)))
    else if (entry.name.endsWith('.json')) files.push(full)
  }
  return files
}

async function main() {
  const template = await readFile(path.join(DIST_DIR, 'index.html'), 'utf-8')
  const { renderRoute, blogPosts } = await buildEntryServer()

  const index = JSON.parse(await readFile(path.join(DATA_DIR, 'index.json'), 'utf-8'))
  const generatedUrls = []

  // product.similar no disco só tem {slug, merchantSlug} (ver fetch-feeds.mjs
  // — o snapshot completo repetido em até 6 cópias por produto era ~70% do
  // tamanho do JSON individual). index.json já está inteiro em memória aqui,
  // então resolver os stubs pro conteúdo completo é só um lookup — sem I/O
  // extra — e preserva "produtos similares" como HTML estático de verdade
  // (bot que não roda JS, ou o primeiro paint de um visitante real, continua
  // vendo o carrossel populado, em vez de esperar fetch depois de hidratar).
  const indexByKey = new Map(index.map((p) => [`${p.merchantSlug}/${p.slug}`, p]))
  function enrichSimilar(similar) {
    return similar.map((s) => indexByKey.get(`${s.merchantSlug}/${s.slug}`)).filter((p) => p != null)
  }

  // --- Home: só as seções curadas (Destaques/Baixou de preço/Comprado
  // recentemente), pré-calculadas em scripts/generate-home-highlights.mjs —
  // arquivo pequeno, bem diferente do index.json completo usado pelos hubs
  // abaixo. Antes a home não era pré-renderizada (dependia só do index.json
  // gigante no cliente, o que não valia o custo); agora que os dados dela
  // são pequenos, dá pra gerar o HTML estático de verdade — resolve o maior
  // gargalo de LCP apontado pelo Lighthouse (a imagem do primeiro card só
  // era descoberta pelo navegador depois do fetch client-side terminar).
  const [homeMerchants, homeMeta, homeHighlights] = await Promise.all([
    readFile(path.join(DATA_DIR, 'merchants.json'), 'utf-8').then(JSON.parse),
    readFile(path.join(DATA_DIR, 'meta.json'), 'utf-8').then(JSON.parse),
    readFile(path.join(DATA_DIR, 'home-highlights.json'), 'utf-8').then(JSON.parse),
  ])
  // Data real do build (do próprio feed, não "agora") — usado como lastmod no
  // sitemap pra páginas que a gente sabe que revalidam todo dia (preço), sem
  // inventar uma data mais precisa do que realmente temos.
  const buildDate = typeof homeMeta.generatedAt === 'string' ? homeMeta.generatedAt.slice(0, 10) : new Date().toISOString().slice(0, 10)
  const homeUrl = await renderPage({
    template,
    renderRoute,
    routePath: '',
    initialData: { meta: homeMeta, merchants: homeMerchants, highlights: homeHighlights },
    head: {
      title: 'Compare Ofertas — compare preços de várias lojas em um só lugar',
      description: 'Compare preços de milhares de produtos de marcas famosas em um só lugar, atualizados semanalmente.',
      canonical: `${SITE_URL}/`,
    },
  })
  generatedUrls.push({ url: homeUrl, changefreq: 'daily', priority: 1.0, lastmod: buildDate })

  // DEBUG_LIMIT=N: processa só N produtos e pula os hubs — só pra iterar
  // rápido em debug local (o gargalo real do build é o volume de arquivos).
  const debugLimit = process.env.DEBUG_LIMIT ? Number(process.env.DEBUG_LIMIT) : null

  // --- Páginas de produto (elegíveis ou de merchant prioritário) ---
  let productFiles = await walkProductFiles(path.join(DATA_DIR, 'products'))
  if (process.env.DEBUG_ONLY_FILE) productFiles = productFiles.filter((f) => f.includes(process.env.DEBUG_ONLY_FILE))
  else if (debugLimit) productFiles = productFiles.slice(0, debugLimit)
  let productPageCount = 0
  for (const file of productFiles) {
    const product = JSON.parse(await readFile(file, 'utf-8'))
    if (!product.eligibleForStaticPage) continue
    product.similar = enrichSimilar(product.similar)

    const routePath = `/${product.merchantSlug}/${product.slug}`
    const canonical = `${SITE_URL}${routePath}/`
    const description = `Compare o preço de ${product.productName} na ${product.merchantDisplayName}. Veja detalhes e produtos similares no Compare Ofertas.`
    const category = categoryLabel(product.merchantCategory)
    // Categoria entra no título só quando existe E não é redundante (produto
    // já mencionando o próprio termo da categoria no nome não ganha nada
    // repetindo) — cauda longa de verdade, não enchimento.
    const titleCategory = category && !product.productName.toLowerCase().includes(category.toLowerCase()) ? category : null

    const url = await renderPage({
      template,
      renderRoute,
      routePath,
      initialData: product,
      head: {
        title: titleCategory
          ? `${product.productName} – ${titleCategory} – ${product.merchantDisplayName} | Compare Ofertas`
          : `${product.productName} – ${product.merchantDisplayName} | Compare Ofertas`,
        description,
        canonical,
        image: product.awImageUrl || product.merchantImageUrl,
        jsonLd: productJsonLd(product, canonical),
        product: { price: product.searchPrice, currency: product.currency },
      },
    })
    generatedUrls.push({
      url,
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: /^\d{4}-\d{2}-\d{2}/.test(product.lastUpdated || '') ? product.lastUpdated.slice(0, 10) : buildDate,
    })
    productPageCount++
  }

  // --- Hubs: vertical / loja (URL plana, /:slug) / categoria (a partir do índice leve) ---
  const byVertical = new Map()
  const byMerchant = new Map()
  const byCategory = new Map()
  for (const entry of debugLimit ? [] : index) {
    if (!byVertical.has(entry.vertical)) byVertical.set(entry.vertical, [])
    byVertical.get(entry.vertical).push(entry)

    if (!byMerchant.has(entry.merchantSlug)) byMerchant.set(entry.merchantSlug, [])
    byMerchant.get(entry.merchantSlug).push(entry)

    const categoryKey = `${entry.vertical}/${entry.categorySlug}`
    if (!byCategory.has(categoryKey)) byCategory.set(categoryKey, [])
    byCategory.get(categoryKey).push(entry)
  }

  for (const [vertical, items] of byVertical) {
    const merchantsMap = new Map()
    for (const item of items) {
      const m = merchantsMap.get(item.merchantSlug) ?? {
        slug: item.merchantSlug,
        displayName: item.merchantDisplayName,
        count: 0,
      }
      m.count++
      merchantsMap.set(item.merchantSlug, m)
    }
    const categoriesMap = new Map()
    for (const item of items) categoriesMap.set(item.categorySlug, (categoriesMap.get(item.categorySlug) ?? 0) + 1)

    const routePath = `/${vertical}`
    const canonical = `${SITE_URL}${routePath}/`
    const url = await renderPage({
      template,
      renderRoute,
      routePath,
      initialData: {
        kind: 'vertical',
        items: items.slice(0, PAGE_SIZE),
        totalCount: items.length,
        merchants: [...merchantsMap.values()].sort((a, b) => b.count - a.count),
        categories: [...categoriesMap.entries()].sort((a, b) => b[1] - a[1]),
      },
      head: {
        title: `Ofertas de ${vertical} | Compare Ofertas`,
        description: `Compare ${items.length.toLocaleString('pt-BR')} ofertas de ${vertical} de várias lojas em um só lugar.`,
        canonical,
      },
    })
    generatedUrls.push({ url, changefreq: 'daily', priority: 0.8 })
  }

  for (const [merchantSlug, items] of byMerchant) {
    const routePath = `/${merchantSlug}`
    const canonical = `${SITE_URL}${routePath}/`
    const displayName = items[0]?.merchantDisplayName ?? merchantSlug
    const categoriesMap = new Map()
    for (const item of items) categoriesMap.set(item.categorySlug, (categoriesMap.get(item.categorySlug) ?? 0) + 1)
    const url = await renderPage({
      template,
      renderRoute,
      routePath,
      initialData: {
        kind: 'merchant',
        items: items.slice(0, PAGE_SIZE),
        totalCount: items.length,
        merchants: [],
        categories: [...categoriesMap.entries()].sort((a, b) => b[1] - a[1]),
      },
      head: {
        title: `Ofertas ${displayName} | Compare Ofertas`,
        description: `Compare ${items.length.toLocaleString('pt-BR')} ofertas da ${displayName} em um só lugar.`,
        canonical,
      },
    })
    generatedUrls.push({ url, changefreq: 'daily', priority: 0.7 })
  }

  for (const [key, items] of byCategory) {
    const [vertical, categorySlug] = key.split('/')
    const routePath = `/${vertical}/categoria/${categorySlug}`
    const canonical = `${SITE_URL}${routePath}/`
    const url = await renderPage({
      template,
      renderRoute,
      routePath,
      initialData: { items: items.slice(0, PAGE_SIZE), totalCount: items.length },
      head: {
        title: `${categoryHubLabel(categorySlug)} em ${vertical} | Compare Ofertas`,
        description: `Compare ${items.length.toLocaleString('pt-BR')} ofertas de ${categoryHubLabel(categorySlug)} em ${vertical}.`,
        canonical,
      },
    })
    generatedUrls.push({ url, changefreq: 'weekly', priority: 0.6 })
  }

  // --- Páginas institucionais (estáticas, sem dado de produto) ---
  const faqItems = JSON.parse(await readFile(path.join(ROOT, 'src', 'data', 'faq.json'), 'utf-8'))
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'Como criar uma lista de presentes no Compare Ofertas',
    description:
      'Passo a passo para criar uma lista de presentes com produtos de várias lojas parceiras e compartilhar o link — sem presente repetido.',
    step: [
      { '@type': 'HowToStep', name: 'Crie sua lista', text: 'Dê um título, escolha a ocasião e informe seu e-mail. É de graça e sem criar conta.' },
      { '@type': 'HowToStep', name: 'Adicione os presentes', text: 'Busque produtos de qualquer loja parceira ou carregue seus favoritos direto na lista, com quantidade.' },
      { '@type': 'HowToStep', name: 'Compartilhe o link', text: 'Você recebe um link curto e amigável para enviar aos convidados por WhatsApp, Instagram ou e-mail.' },
      { '@type': 'HowToStep', name: 'Os convidados escolhem', text: 'Cada convidado escolhe um presente e compra direto no site da loja parceira.' },
      { '@type': 'HowToStep', name: 'Compra confirmada, sem repetição', text: 'Quando a loja confirma a compra, o presente sai da lista e o responsável recebe um aviso por e-mail.' },
    ],
  }

  const staticPages = [
    {
      routePath: '/como-funciona',
      title: 'Como funciona | Compare Ofertas',
      description: 'Passo a passo do Compare Ofertas: lista de presentes, newsletter de cupons e aviso de queda de preço nos favoritos.',
      jsonLd: [howToJsonLd],
    },
    { routePath: '/sobre', title: 'Sobre nós | Compare Ofertas', description: 'Conheça o Compare Ofertas.' },
    {
      routePath: '/perguntas-frequentes',
      title: 'Perguntas frequentes | Compare Ofertas',
      description: 'Como funciona o Compare Ofertas: preços, cupons, comparador e links de afiliado.',
      jsonLd: [faqJsonLd],
    },
    { routePath: '/termos', title: 'Termos de Uso | Compare Ofertas', description: 'Termos de uso do Compare Ofertas.' },
    { routePath: '/privacidade', title: 'Política de Privacidade | Compare Ofertas', description: 'Política de privacidade e proteção de dados do Compare Ofertas.' },
    { routePath: '/cupons', title: 'Cupons | Compare Ofertas', description: 'Cupons e promoções ativas das lojas parceiras do Compare Ofertas.' },
    {
      routePath: '/lista-de-presentes',
      title: 'Lista de presentes | Compare Ofertas',
      description: 'Crie sua lista de presentes de casamento, chá de bebê ou aniversário e compartilhe o link — ninguém dá presente repetido.',
    },
    { routePath: '/comparar', title: 'Comparar ofertas | Compare Ofertas', description: 'Compare lado a lado até 3 ofertas selecionadas.' },
  ]
  for (const { routePath, title, description, jsonLd } of staticPages) {
    const canonical = `${SITE_URL}${routePath}/`
    const url = await renderPage({
      template,
      renderRoute,
      routePath,
      initialData: undefined,
      head: { title, description, canonical, jsonLd },
    })
    generatedUrls.push({ url, changefreq: 'monthly', priority: 0.3 })
  }

  // --- Páginas de cupom por loja (/cupons/{merchantSlug}) — SEO pra buscas
  // "cupom {loja}" (alta intenção de compra). Uma por loja que tem cupom
  // ativo, com FAQ visível + JSON-LD (BreadcrumbList + FAQPage). ---
  const couponsData = JSON.parse(await readFile(path.join(DATA_DIR, 'coupons.json'), 'utf-8').catch(() => '[]'))
  const couponsByMerchant = new Map()
  for (const c of couponsData) {
    if (!c.merchantSlug) continue
    if (!couponsByMerchant.has(c.merchantSlug)) {
      couponsByMerchant.set(c.merchantSlug, { displayName: c.advertiser || c.merchantSlug, coupons: [] })
    }
    couponsByMerchant.get(c.merchantSlug).coupons.push(c)
  }
  for (const [merchantSlug, { displayName, coupons: merchantCoupons }] of couponsByMerchant) {
    const routePath = `/cupons/${merchantSlug}`
    const canonical = `${SITE_URL}${routePath}/`
    const url = await renderPage({
      template,
      renderRoute,
      routePath,
      initialData: { merchantSlug, displayName, coupons: merchantCoupons },
      head: {
        title: `Cupom ${displayName} — códigos de desconto ativos | Compare Ofertas`,
        description: `${merchantCoupons.length} ${merchantCoupons.length === 1 ? 'cupom/promoção ativo' : 'cupons e promoções ativos'} da ${displayName}, verificados diariamente. Copie o código e use direto na loja.`,
        canonical,
        jsonLd: couponsMerchantJsonLd(displayName, canonical),
      },
    })
    generatedUrls.push({ url, changefreq: 'daily', priority: 0.6 })
  }

  // --- Blog: listagem + um artigo por post (fonte: src/data/blog, a mesma do
  // cliente, reexportada via entry-server — nunca duplica conteúdo). ---
  const blogListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Blog | Compare Ofertas',
    url: `${SITE_URL}/blog/`,
    blogPost: blogPosts.map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      url: `${SITE_URL}/blog/${post.slug}/`,
      datePublished: post.publishedAt,
    })),
  }
  const blogListUrl = await renderPage({
    template,
    renderRoute,
    routePath: '/blog',
    initialData: undefined,
    head: {
      title: 'Blog | Compare Ofertas',
      description: 'Dicas práticas pra organizar lista de presentes, casamento, chá de bebê e casa nova.',
      canonical: `${SITE_URL}/blog/`,
      jsonLd: [blogListJsonLd],
    },
  })
  generatedUrls.push({ url: blogListUrl, changefreq: 'weekly', priority: 0.5, lastmod: buildDate })

  for (const post of blogPosts) {
    const routePath = `/blog/${post.slug}`
    const canonical = `${SITE_URL}${routePath}/`
    const url = await renderPage({
      template,
      renderRoute,
      routePath,
      initialData: undefined,
      head: {
        title: post.metaTitle,
        description: post.metaDescription,
        canonical,
        jsonLd: blogPostJsonLd(post, canonical),
        article: { publishedTime: post.publishedAt, modifiedTime: post.updatedAt },
      },
    })
    generatedUrls.push({ url, changefreq: 'monthly', priority: 0.6, lastmod: post.updatedAt || post.publishedAt })
  }

  await writeFile(path.join(DIST_DIR, '.routes-manifest.json'), JSON.stringify(generatedUrls))

  // Fallback SPA pro GitHub Pages: rotas não pré-renderizadas (ex.: a lista de
  // presentes /lista/:id compartilhada, ou /favoritos) caem no 404.html, que é
  // a casca limpa do app — o router client assume e renderiza a rota certa
  // (em vez do 404 padrão do GitHub). `template` é o index.html do Vite antes
  // de qualquer conteúdo de rota ser injetado.
  await writeFile(path.join(DIST_DIR, '404.html'), template)

  console.log(
    `Pré-renderização concluída: ${productPageCount} páginas de produto, ${byVertical.size} verticais, ${byMerchant.size} lojas, ${byCategory.size} categorias (${generatedUrls.length} URLs no total).`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
