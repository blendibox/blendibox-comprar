// Roda depois do `vite build`. Gera HTML estático real (não só o shell SPA)
// pra cada produto elegível/prioritário e pra cada hub de loja/categoria/vertical,
// com <title>/meta/OG/JSON-LD próprios — importante pra SEO e pra crawlers que
// não executam JS (redes sociais, etc). O React é o mesmo usado no cliente
// (src/router.tsx), bundlado sob demanda aqui via esbuild pra rodar em Node.
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DIST_DIR = path.join(ROOT, 'dist')
const DATA_DIR = path.join(ROOT, 'public', 'data')
const SITE_URL = (process.env.SITE_URL || 'https://comprar.blendibox.com.br').replace(/\/$/, '')
const PAGE_SIZE = 60

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
  return mod.renderRoute
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildHead({ title, description, canonical, image, jsonLd }) {
  const tags = [
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:type" content="website" />`,
  ]
  if (image) tags.push(`<meta property="og:image" content="${escapeHtml(image)}" />`)
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

function productJsonLd(product, canonical) {
  const offer = {
    '@type': 'Offer',
    url: canonical,
    priceCurrency: product.currency || 'BRL',
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
    image: [product.awImageUrl || product.merchantImageUrl].filter(Boolean),
    sku: product.merchantProductId || product.awProductId,
    brand: { '@type': 'Brand', name: product.merchantDisplayName },
    offers: offer,
  }
  if (product.description) productLd.description = product.description

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: `${SITE_URL}/` },
      {
        '@type': 'ListItem',
        position: 2,
        name: product.merchantDisplayName,
        item: `${SITE_URL}/${product.merchantSlug}/`,
      },
      { '@type': 'ListItem', position: 3, name: product.productName, item: canonical },
    ],
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
  const renderRoute = await buildEntryServer()

  const index = JSON.parse(await readFile(path.join(DATA_DIR, 'index.json'), 'utf-8'))
  const generatedUrls = []

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
  generatedUrls.push({ url: homeUrl, changefreq: 'daily', priority: 1.0 })

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

    const routePath = `/${product.merchantSlug}/${product.slug}`
    const canonical = `${SITE_URL}${routePath}/`
    const description = `Compare o preço de ${product.productName} na ${product.merchantDisplayName}. Veja detalhes e produtos similares no Compare Ofertas.`

    const url = await renderPage({
      template,
      renderRoute,
      routePath,
      initialData: product,
      head: {
        title: `${product.productName} – ${product.merchantDisplayName} | Compare Ofertas`,
        description,
        canonical,
        image: product.awImageUrl || product.merchantImageUrl,
        jsonLd: productJsonLd(product, canonical),
      },
    })
    generatedUrls.push({ url, changefreq: 'weekly', priority: 0.7 })
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
        title: `${categorySlug.replace(/-/g, ' ')} em ${vertical} | Compare Ofertas`,
        description: `Compare ${items.length.toLocaleString('pt-BR')} ofertas de ${categorySlug.replace(/-/g, ' ')} em ${vertical}.`,
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
      title: 'Como funciona a lista de presentes | Compare Ofertas',
      description: 'Passo a passo para criar sua lista de presentes com produtos de várias lojas e compartilhar o link — sem presente repetido.',
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
