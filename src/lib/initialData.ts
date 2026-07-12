// Ponte entre o script de pré-renderização (scripts/prerender.mjs, roda em Node,
// sem `window`) e a hidratação no navegador: os dois usam `globalThis` pra
// depositar o dado já carregado da rota atual, evitando repetir o fetch e
// evitando que a página estática mostre "Carregando..." antes de qualquer JS
// rodar (o que anularia o propósito da pré-renderização pra SEO).
declare global {
  // eslint-disable-next-line no-var
  var __INITIAL_DATA__: { path: string; data: unknown } | undefined
}

// Só LEITURA, sem efeito colateral — precisa ser assim porque o React 18 pode
// chamar o inicializador do useState mais de uma vez (StrictMode em dev, e
// possivelmente em tentativas de hidratação); se essa função apagasse o dado
// global na primeira chamada, a segunda chamada (com o mesmo resultado
// esperado) encontraria tudo vazio — foi exatamente esse bug que causava o
// erro de hidratação (React #418).
export function peekInitialData<T>(path: string): T | null {
  const stash = globalThis.__INITIAL_DATA__
  if (stash && stash.path === path) return stash.data as T
  return null
}

// Efeito colateral de verdade — só deve ser chamado de dentro de um
// useEffect, nunca de um inicializador de estado.
export function clearInitialData(path: string) {
  const stash = globalThis.__INITIAL_DATA__
  if (stash && stash.path === path) globalThis.__INITIAL_DATA__ = undefined
}

export function setInitialData(path: string, data: unknown) {
  globalThis.__INITIAL_DATA__ = { path, data }
}
