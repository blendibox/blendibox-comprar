// Roda depois do prerender.mjs, que já deixou dist/.routes-manifest.json com
// todas as URLs reais geradas (produto/loja/categoria/vertical — nunca inclui
// os stubs de redirect do generate-redirects.mjs). Protocolo de sitemap.xml
// tem limite de 50.000 URLs por arquivo, então particiona em vários
// sitemap-N.xml + um sitemap.xml índice, do mesmo jeito que o site antigo fazia.
import { readFile, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DIST_DIR = path.join(ROOT, 'dist')
const SITE_URL = (process.env.SITE_URL || 'https://comprar.blendibox.com.br').replace(/\/$/, '')
// Bem abaixo do limite técnico do protocolo (50 mil), pra dar diagnóstico mais
// granular por lote no Search Console (indexação de um grupo de URLs isolado
// do resto, útil pra identificar se algum lote específico indexa mal).
const MAX_URLS_PER_SITEMAP = 10000

function escapeXml(value) {
  return String(value).replace(/&/g, '&amp;')
}

async function main() {
  const manifestPath = path.join(DIST_DIR, '.routes-manifest.json')
  const routes = JSON.parse(await readFile(manifestPath, 'utf-8'))

  const chunks = []
  for (let i = 0; i < routes.length; i += MAX_URLS_PER_SITEMAP) {
    chunks.push(routes.slice(i, i + MAX_URLS_PER_SITEMAP))
  }

  const sitemapFiles = []
  for (let i = 0; i < chunks.length; i++) {
    const body = chunks[i]
      .map(
        (r) =>
          `  <url><loc>${escapeXml(r.url)}</loc><changefreq>${r.changefreq}</changefreq><priority>${r.priority}</priority></url>`
      )
      .join('\n')
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
    const fileName = `sitemap-${i}.xml`
    await writeFile(path.join(DIST_DIR, fileName), xml)
    sitemapFiles.push(fileName)
  }

  const indexBody = sitemapFiles
    .map((f) => `  <sitemap><loc>${SITE_URL}/${f}</loc></sitemap>`)
    .join('\n')
  const indexXml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexBody}\n</sitemapindex>\n`
  await writeFile(path.join(DIST_DIR, 'sitemap.xml'), indexXml)

  const robotsTxt = `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`
  await writeFile(path.join(DIST_DIR, 'robots.txt'), robotsTxt)

  // O manifesto só serve pra esse script montar o sitemap — não faz sentido
  // ficar publicado dentro do site.
  await rm(manifestPath, { force: true })

  console.log(`Sitemap: ${routes.length} URLs em ${sitemapFiles.length} arquivo(s), + robots.txt.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
