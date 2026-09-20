import { renderToStaticMarkup } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { AppRoutes } from './router'
import { setInitialData } from './lib/initialData'
// Reexporta os posts do blog pro prerender.mjs conseguir gerar uma página
// estática por artigo sem duplicar o conteúdo num JSON à parte — a mesma
// fonte usada pelo cliente.
export { blogPosts } from './data/blog'
// Mesmo motivo do reexport acima, mas pros quizzes (src/data/quizzes).
export { quizzes } from './data/quizzes'
// prerender.mjs usa a MESMA função do cliente pra saber se o build cai dentro
// de uma campanha sazonal (e reservar o espaço do banner) — uma regra só.
export {
  HOME_SECTION_MAX_ITEMS,
  HOME_SECTION_MIN_ITEMS,
  LANDING_MAX_ITEMS,
  SEASONAL_LANDINGS,
  getSeasonalEvent,
  getSeasonalLanding,
  parseSeasonalOverride,
  resolveSeasonalTheme,
  seasonalVerticals,
  selectDrops,
} from './lib/seasonalEvents'

// Texto gerado dos dados (bloco de categoria + FAQ de produto): o prerender usa
// as MESMAS funções pra gravar o JSON-LD, senão o HTML e o schema divergiriam.
export { buildCategoryInsights, buildProductFaq, faqJsonLd, isSitemapCategory } from './lib/priceInsights'

export function renderRoute(routePath: string, initialData?: unknown) {
  if (initialData !== undefined) setInitialData(routePath, initialData)
  const html = renderToStaticMarkup(
    <StaticRouter location={routePath}>
      <AppRoutes />
    </StaticRouter>
  )
  globalThis.__INITIAL_DATA__ = undefined
  return html
}
