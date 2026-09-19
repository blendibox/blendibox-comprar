// Contexto sazonal pros scripts do build (vídeo diário, posts do Telegram,
// resumo semanal): a MESMA tabela de épocas do site (src/lib/seasonalEvents.ts),
// então banner, home, vídeo, Telegram e e-mail nunca discordam de qual época
// estamos. O arquivo da tabela é TypeScript puro (sem React), então dá pra
// compilar na hora com o esbuild que o build já usa — mesma ideia do
// prerender.mjs.
//
// Só épocas COM página de campanha (`landing`) viram conteúdo aqui; as só-banner
// (Páscoa, Dia da Mulher, Volta às Aulas, Dia das Crianças) não mudam nada.
//
// SEASONAL_OVERRIDE=<id ou apelido, ex.: maes | black | off> força a época
// (pra testar títulos antes da data), igual ao ?tema= do site.
import { build } from 'esbuild'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const SITE_URL = (process.env.SITE_URL || 'https://comprar.blendibox.com.br').replace(/\/$/, '')

let tablePromise
function loadTable() {
  tablePromise ??= build({
    entryPoints: [path.join(ROOT, 'src', 'lib', 'seasonalEvents.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    absWorkingDir: ROOT,
    logLevel: 'silent',
  }).then((result) => {
    // Sem imports em runtime (o .ts só importa tipos), então um data: URL
    // evita gravar arquivo temporário.
    const source = Buffer.from(result.outputFiles[0].text).toString('base64')
    return import(`data:text/javascript;base64,${source}`)
  })
  return tablePromise
}

/**
 * @returns {Promise<null | {
 *   id: string, label: string, hashtag: string,
 *   verticals: string[] | null, landingPath: string, landingUrl: string,
 * }>}
 */
export async function getSeasonalContext(now = new Date()) {
  const table = await loadTable()
  let id = table.resolveSeasonalTheme(now)
  const override = process.env.SEASONAL_OVERRIDE?.trim()
  if (override) {
    const parsed = table.parseSeasonalOverride(override)
    if (parsed === undefined) console.warn(`[sazonal] SEASONAL_OVERRIDE="${override}" não é uma época conhecida — ignorado.`)
    else id = parsed
  }
  const event = table.getSeasonalEvent(id)
  if (!event?.landing) return null
  const landing = table.getSeasonalLanding(event.landing)
  return {
    id: event.id,
    label: event.banner.badge,
    hashtag: event.hashtag,
    verticals: landing.verticals ? [...landing.verticals] : null,
    landingPath: landing.path,
    landingUrl: `${SITE_URL}${landing.path}`,
  }
}

/**
 * Quedas de preço do dia (price-drops-today.json) focadas na época.
 *
 * - Época sem departamento (Black Friday, Natal, Dia do Consumidor): as quedas
 *   do catálogo todo já SÃO o conteúdo da campanha.
 * - Época com departamentos (Dia das Mães = joias/beleza/casa...): só usa o
 *   recorte se ele tiver `minItems` produtos — senão o vídeo/post "de Dia das
 *   Mães" listaria tênis e celular. Sem produto suficiente, volta ao conteúdo
 *   genérico do dia, sem nenhuma menção à época.
 *
 * @returns {{ drops: any[], season: object | null }}
 */
export function focusDropsOnSeason(drops, season, minItems) {
  if (!season) return { drops, season: null }
  if (!season.verticals) return { drops, season }
  const focused = drops.filter((d) => season.verticals.includes(d.vertical))
  if (focused.length >= minItems) return { drops: focused, season }
  console.log(
    `[sazonal] ${season.label}: só ${focused.length} queda(s) nos departamentos da época (mínimo ${minItems}) — publicando o conteúdo genérico do dia.`
  )
  return { drops, season: null }
}
