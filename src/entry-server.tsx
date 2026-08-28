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
