// Migração do site antigo (comprar.blendibox.com.br, ~104 mil URLs indexadas
// no Google segundo o Search Console). GitHub Pages não faz redirect 301 de
// verdade (hospedagem 100% estática, sem config de servidor), então geramos
// uma página HTML por URL antiga com meta refresh + JS + canonical apontando
// pra URL nova — o jeito padrão de "redirecionar" em hosts estáticos.
//
// Só gera redirect pra lojas que já estão ativas no feed atual (merchants.config.json
// com active:true); o resto (ex: Telhanorte, pausada) fica sem redirect por
// decisão consciente — não vale o esforço de mapear ~24 mil produtos de uma
// loja que não existe mais em lugar nenhum.
import { readFile, writeFile, mkdir, readdir, access } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { slugify } from './lib/slugify.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DIST_DIR = path.join(ROOT, 'dist')
const DATA_DIR = path.join(ROOT, 'public', 'data')
const SITE_URL = (process.env.SITE_URL || 'https://comprar.blendibox.com.br').replace(/\/$/, '')

async function fileExists(p) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

function redirectHtml(target) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>Redirecionando... | Compare Ofertas</title>
<link rel="canonical" href="${target}" />
<meta http-equiv="refresh" content="0; url=${target}" />
<script>location.replace(${JSON.stringify(target)});</script>
</head>
<body>
<p>Esta página mudou de endereço. <a href="${target}">Clique aqui se não for redirecionado automaticamente</a>.</p>
</body>
</html>
`
}

async function main() {
  const legacyPath = path.join(ROOT, 'data', 'legacy-urls.txt')
  if (!(await fileExists(legacyPath))) {
    console.log('data/legacy-urls.txt não existe — pulando geração de redirects.')
    return
  }
  const legacyUrls = (await readFile(legacyPath, 'utf-8')).split('\n').map((s) => s.trim()).filter(Boolean)

  const merchantsConfig = JSON.parse(await readFile(path.join(__dirname, 'merchants.config.json'), 'utf-8'))
  const activeSlugs = new Set(Object.values(merchantsConfig.merchants).filter((m) => m.active).map((m) => m.slug))

  // Índice "merchantSlug:idSlugificado" -> path novo, construído a partir dos
  // arquivos de produto já gerados (o slug novo usa merchant_product_id como
  // sufixo, então bate na maioria dos casos com o slug antigo já indexado).
  const idIndex = new Map()
  for (const merchantSlug of activeSlugs) {
    const dir = path.join(DATA_DIR, 'products', merchantSlug)
    let files = []
    try {
      files = await readdir(dir)
    } catch {
      continue
    }
    for (const file of files) {
      if (!file.endsWith('.json')) continue
      const product = JSON.parse(await readFile(path.join(dir, file), 'utf-8'))
      const idKey = slugify(product.merchantProductId) || slugify(product.awProductId)
      if (idKey) idIndex.set(`${merchantSlug}:${idKey}`, `/${merchantSlug}/${product.slug}`)
    }
  }

  let exactMatches = 0
  let hubFallbacks = 0
  let alreadyCorrect = 0
  let skipped = 0
  let conflicts = 0
  const toWrite = []

  for (const url of legacyUrls) {
    let u
    try {
      u = new URL(url)
    } catch {
      skipped++
      continue
    }
    const segments = u.pathname.split('/').filter(Boolean)
    if (segments.length < 2) {
      skipped++
      continue
    }

    const merchantSlug = segments[0]
    if (!activeSlugs.has(merchantSlug)) {
      skipped++
      continue
    }

    const oldProductSlug = segments[segments.length - 1]
    if (oldProductSlug === '__dummy__') {
      skipped++
      continue
    }

    const oldPath = `/${segments.join('/')}`
    const lastToken = slugify(oldProductSlug.split('-').pop())
    const candidateKey = `${merchantSlug}:${lastToken}`
    let targetPath = idIndex.get(candidateKey)
    let matched = true
    if (!targetPath) {
      targetPath = `/${merchantSlug}`
      matched = false
    }

    if (oldPath === targetPath) {
      alreadyCorrect++
      continue
    }

    toWrite.push({ oldPath, targetPath })
    if (matched) exactMatches++
    else hubFallbacks++
  }

  for (const { oldPath, targetPath } of toWrite) {
    const outDir = path.join(DIST_DIR, ...oldPath.split('/').filter(Boolean))
    const outFile = path.join(outDir, 'index.html')
    if (await fileExists(outFile)) {
      // Já existe uma página real gerada nesse path — nunca sobrescrever com
      // um stub de redirect.
      conflicts++
      continue
    }
    await mkdir(outDir, { recursive: true })
    const target = `${SITE_URL}${targetPath}/`
    await writeFile(outFile, redirectHtml(target))
  }

  console.log(
    `Redirects: ${exactMatches} com match exato, ${hubFallbacks} caindo no hub da loja, ` +
      `${alreadyCorrect} já corretos (sem redirect necessário), ${skipped} ignorados (loja inativa/dummy), ` +
      `${conflicts} evitados por já existir página real no path. ${toWrite.length - conflicts} arquivos de redirect gravados.`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
