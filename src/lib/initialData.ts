// Ponte entre o script de pré-renderização (scripts/prerender.mjs, roda em Node,
// sem `window`) e a hidratação no navegador: os dois usam `globalThis` pra
// depositar o dado já carregado da rota atual, evitando repetir o fetch e
// evitando que a página estática mostre "Carregando..." antes de qualquer JS
// rodar (o que anularia o propósito da pré-renderização pra SEO).
declare global {
  // eslint-disable-next-line no-var
  var __INITIAL_DATA__: { path: string; data: unknown } | undefined
}

export function consumeInitialData<T>(path: string): T | null {
  const stash = globalThis.__INITIAL_DATA__
  if (stash && stash.path === path) {
    globalThis.__INITIAL_DATA__ = undefined
    return stash.data as T
  }
  return null
}

export function setInitialData(path: string, data: unknown) {
  globalThis.__INITIAL_DATA__ = { path, data }
}
