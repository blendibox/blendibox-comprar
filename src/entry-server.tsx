import { renderToStaticMarkup } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { AppRoutes } from './router'
import { setInitialData } from './lib/initialData'

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
