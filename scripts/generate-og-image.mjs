// Gera public/og-image.png — imagem padrão pra og:image/twitter:image nas
// páginas sem foto própria (institucionais, blog). Ferramenta on-demand, roda
// uma vez (não faz parte do build) — o resultado é um PNG estático versionado
// no repo, não dado gerado a cada build. Mesma técnica de SVG→PNG via sharp
// usada em generate-daily-video.mjs, mas cores REAIS do site (ver
// src/index.css: --color-navy/--color-green/--color-pink), não as do vídeo.
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_PATH = path.join(ROOT, 'public', 'og-image.png')

const WIDTH = 1200
const HEIGHT = 630
const COLORS = {
  navy: '#0f172a',
  navyLight: '#1b2947',
  green: '#0a7d3f',
  pink: '#db2777',
  teal: '#14b8a6',
  white: '#ffffff',
  gray: '#94a3b8',
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${COLORS.navyLight}" stop-opacity="0.7" />
      <stop offset="100%" stop-color="${COLORS.navy}" stop-opacity="0" />
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${COLORS.navy}" />
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bgGrad)" />
  <g opacity="0.15" stroke-linecap="round">
    <line x1="60" y1="40" x2="160" y2="140" stroke="${COLORS.teal}" stroke-width="8" />
    <line x1="${WIDTH - 160}" y1="60" x2="${WIDTH - 60}" y2="160" stroke="${COLORS.pink}" stroke-width="8" />
    <line x1="70" y1="${HEIGHT - 150}" x2="170" y2="${HEIGHT - 50}" stroke="${COLORS.pink}" stroke-width="8" />
    <line x1="${WIDTH - 170}" y1="${HEIGHT - 170}" x2="${WIDTH - 70}" y2="${HEIGHT - 70}" stroke="${COLORS.teal}" stroke-width="8" />
  </g>
  <text x="${WIDTH / 2}" y="330" text-anchor="middle" font-family="Arial, sans-serif" font-size="84" font-weight="800">
    <tspan fill="${COLORS.white}">Compare </tspan><tspan fill="${COLORS.green}">Ofertas</tspan><tspan fill="${COLORS.pink}"> ✱</tspan>
  </text>
  <text x="${WIDTH / 2}" y="400" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" fill="${COLORS.gray}">
    Compare preços de várias lojas em um só lugar
  </text>
</svg>`

await sharp(Buffer.from(svg)).png().toFile(OUT_PATH)
console.log(`Gerado: ${OUT_PATH}`)
