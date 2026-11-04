// Confere se os links de produto da Blendibox que os artigos do blog usam
// (/blendibox/<slug>/) ainda existem no catálogo do dia. Cada variação de cor é
// uma página própria; quando uma cor esgota, a página some no próximo build e o
// link do artigo viraria 404. Este script NÃO derruba o build (uma cor esgotada
// não pode travar o deploy do site inteiro): só escreve um aviso — no GitHub
// Actions aparece como anotação ::warning:: no resumo do run — pra alguém trocar
// a cor no artigo.
//
// Lê os artigos compilando src/data/blog na hora com o esbuild (mesma técnica
// de scripts/lib/price-drop.mjs) e o catálogo em public/data/index.json
// (INDEX_PATH troca o arquivo, útil pra testar).
import { build } from 'esbuild'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const INDEX_PATH = process.env.INDEX_PATH || path.join(ROOT, 'public', 'data', 'index.json')
const BLENDIBOX_LINK = /\/blendibox\/([a-z0-9-]+)\//g

async function loadBlogPosts() {
  const result = await build({
    entryPoints: [path.join(ROOT, 'src', 'data', 'blog', 'index.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    absWorkingDir: ROOT,
    logLevel: 'silent',
  })
  const source = Buffer.from(result.outputFiles[0].text).toString('base64')
  return (await import(`data:text/javascript;base64,${source}`)).blogPosts
}

// Todo texto de bloco que pode carregar link: parágrafos, listas, tabelas e os
// cartões de produto.
function* blockStrings(block) {
  if (block.text) yield block.text
  if (block.items) {
    for (const item of block.items) yield typeof item === 'string' ? item : item.href
  }
  if (block.rows) for (const row of block.rows) for (const cell of row) yield cell
}

async function main() {
  let index
  try {
    index = JSON.parse(await readFile(INDEX_PATH, 'utf-8'))
  } catch {
    console.log(`[blog-links] sem catálogo em ${INDEX_PATH} — checagem de links de produto ignorada.`)
    return
  }
  const entries = Array.isArray(index) ? index : index.products || []
  const available = new Set(entries.filter((p) => p.merchantSlug === 'blendibox').map((p) => p.slug))
  if (available.size === 0) {
    // catálogo sem nenhum produto da Blendibox (loja fora do ar nesta rodada): não dá pra concluir nada
    console.log('[blog-links] nenhum produto da Blendibox no catálogo de hoje — checagem ignorada.')
    return
  }

  const posts = await loadBlogPosts()
  const missing = []
  let checked = 0
  for (const post of posts) {
    const seen = new Set()
    for (const block of post.blocks) {
      for (const text of blockStrings(block)) {
        for (const match of String(text).matchAll(BLENDIBOX_LINK)) {
          const slug = match[1]
          if (seen.has(slug)) continue
          seen.add(slug)
          checked++
          if (!available.has(slug)) missing.push({ post: post.slug, slug })
        }
      }
    }
  }

  if (missing.length === 0) {
    console.log(`[blog-links] ${checked} links de produto da Blendibox nos artigos, todos com página no ar.`)
    return
  }
  for (const m of missing) {
    // ::warning:: vira anotação no resumo do run do GitHub Actions
    console.log(`::warning title=Link de produto quebrado no blog::O artigo "${m.post}" aponta pra /blendibox/${m.slug}/, que não existe mais no catálogo (cor esgotada ou despublicada). Troque a cor no artigo.`)
  }
  console.log(`[blog-links] ${missing.length} de ${checked} links de produto apontam pra página que saiu do ar.`)
}

main().catch((err) => {
  // verificação auxiliar: nunca derruba o build
  console.warn('[blog-links] falha ao checar os links:', err?.message || err)
})
