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

function productJsonLd(product, canonical) {
  const offer = {
    '@type': 'Offer',
    url: canonical,
    priceCurrency: product.currency || 'BRL',
  }
  if (product.searchPrice != null) offer.price = product.searchPrice

  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.productName,
    image: [product.awImageUrl || product.merchantImageUrl].filter(Boolean),
    sku: product.merchantProductId || product.awProductId,
    brand: { '@type': 'Brand', name: product.merchantDisplayName },
    offers: offer,
  }

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
  const staticPages = [
    { routePath: '/sobre', title: 'Sobre nós | Compare Ofertas', description: 'Conheça o Compare Ofertas.' },
    { routePath: '/termos', title: 'Termos de Uso | Compare Ofertas', description: 'Termos de uso do Compare Ofertas.' },
    { routePath: '/privacidade', title: 'Política de Privacidade | Compare Ofertas', description: 'Política de privacidade e proteção de dados do Compare Ofertas.' },
  ]
  for (const { routePath, title, description } of staticPages) {
    const canonical = `${SITE_URL}${routePath}/`
    const url = await renderPage({
      template,
      renderRoute,
      routePath,
      initialData: undefined,
      head: { title, description, canonical },
    })
    generatedUrls.push({ url, changefreq: 'monthly', priority: 0.3 })
  }

  generatedUrls.push({ url: `${SITE_URL}/`, changefreq: 'daily', priority: 1.0 })

  await writeFile(path.join(DIST_DIR, '.routes-manifest.json'), JSON.stringify(generatedUrls))

  console.log(
    `Pré-renderização concluída: ${productPageCount} páginas de produto, ${byVertical.size} verticais, ${byMerchant.size} lojas, ${byCategory.size} categorias (${generatedUrls.length} URLs no total).`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
