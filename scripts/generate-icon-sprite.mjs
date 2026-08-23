// Gera public/icons-sprite.svg: um arquivo único com a definição real (path
// completo) de cada ícone lucide-react usado no site, uma vez só. Cada uso
// no app referencia essa definição via <use href="/icons-sprite.svg#nome">
// em vez de reimprimir o SVG inteiro — antes, uma página de produto sozinha
// chegava a 41 ícones inline, ~15,5KB (33% do peso da página), repetidos de
// forma IDÊNTICA nas 145 mil páginas do catálogo. Um sprite injetado dentro
// de cada página teria o mesmo problema (a definição se repetiria a cada
// arquivo); um arquivo externo existe uma vez só no dist/ inteiro.
//
// Roda ANTES do vite build (ver npm script "predev"/"build") — o resultado
// cai em public/, que o vite copia verbatim pro dist/ na build normal; em
// dev, o próprio Vite serve estático de public/ direto.
//
// Lista de ícones mantida em sincronia manualmente com
// src/components/Icon.tsx (mesmo padrão de scripts/lib/images.mjs vs.
// src/lib/images.ts) — rodar "npm run generate-icon-sprite" depois de
// adicionar um ícone novo em qualquer lugar do site.
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as lucide from 'lucide-react'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ICON_NAMES } from './lib/iconNames.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function toKebab(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

async function main() {
  const symbols = ICON_NAMES.map((name) => {
    const IconComponent = lucide[name]
    if (!IconComponent) {
      throw new Error(`Ícone "${name}" não existe em lucide-react (ver scripts/lib/iconNames.mjs)`)
    }
    const svg = renderToStaticMarkup(createElement(IconComponent, { size: 24 }))
    const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')
    return `<symbol id="lucide-${toKebab(name)}" viewBox="0 0 24 24">${inner}</symbol>`
  })

  const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">${symbols.join('')}</svg>\n`

  const outPath = path.join(ROOT, 'public', 'icons-sprite.svg')
  await writeFile(outPath, sprite)
  console.log(`Sprite de ícones gerado: ${ICON_NAMES.length} ícones, ${(sprite.length / 1024).toFixed(1)}KB (public/icons-sprite.svg).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
