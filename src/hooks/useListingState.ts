import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom'

// Busca e filtros das listagens (home, loja/departamento, categoria) vivem na URL
// (?busca=bolsa&ordem=menor-preco&queda=1), e não só no estado do componente. Duas
// consequências que a gente quer:
//   - o link com a busca já pronta funciona (compartilhar, rede social, a própria loja);
//   - ao abrir um produto e clicar em "voltar", a listagem volta com a mesma busca:
//     o React Router restaura a URL e o estado é lido dela.

interface UrlParamOptions<T extends string> {
  // Nomes antigos/alternativos aceitos só na LEITURA (ex.: ?search= e ?q= pra ?busca=).
  aliases?: string[]
  // Escreve na URL só depois de a pessoa parar de digitar (a busca em si filtra na hora).
  debounceMs?: number
  // A página veio pré-renderizada (HTML estático do build): a primeira renderização
  // PRECISA ser igual à do servidor (sem busca), senão dá o erro de hidratação #418.
  // Nesse caso o valor da URL é aplicado logo depois de montar, em vez de no estado inicial.
  deferInitial?: boolean
  // Valida o texto vindo da URL; devolver null cai no valor padrão (?ordem=lixo).
  parse?: (raw: string) => T | null
}

export function useUrlParam<T extends string>(
  key: string,
  fallback: T,
  options: UrlParamOptions<T> = {}
): [T, (next: T) => void] {
  const { aliases = [], debounceMs = 0, deferInitial = false, parse } = options
  const { pathname, search } = useLocation()
  const navigate = useNavigate()

  const read = (query: string): T => {
    const params = new URLSearchParams(query)
    for (const name of [key, ...aliases]) {
      const raw = params.get(name)
      if (raw == null) continue
      return (parse ? parse(raw) : (raw as T)) ?? fallback
    }
    return fallback
  }
  const urlValue = read(search)

  const [value, setValue] = useState<T>(deferInitial ? fallback : urlValue)
  // Último valor que o estado e a URL combinaram. Evita o ping-pong: quando a gente mesmo
  // escreve na URL, o efeito abaixo vê "nada mudou" e não sobrescreve o que a pessoa digita.
  const synced = useRef<T>(deferInitial ? fallback : urlValue)
  const timer = useRef<number | undefined>(undefined)
  const navigateRef = useRef(navigate)
  const pathRef = useRef(pathname)
  useEffect(() => {
    navigateRef.current = navigate
    pathRef.current = pathname
  })

  // URL mudou por fora (voltar/avançar, link) → o estado acompanha.
  useEffect(() => {
    if (urlValue !== synced.current) {
      synced.current = urlValue
      setValue(urlValue)
    }
  }, [urlValue])

  // Trocou de página com o mesmo componente (/vivara/ → /natura/) ou saiu dela: descarta
  // uma escrita pendente, pra não jogar a busca antiga na URL da página nova.
  useEffect(() => () => window.clearTimeout(timer.current), [pathname])

  const set = useCallback(
    (next: T) => {
      setValue(next)
      window.clearTimeout(timer.current)
      const startedAt = pathRef.current
      const write = () => {
        if (window.location.pathname !== startedAt) return
        synced.current = next
        const params = new URLSearchParams(window.location.search)
        for (const alias of aliases) params.delete(alias)
        if (next === fallback || next === '') params.delete(key)
        else params.set(key, next)
        const query = params.toString()
        if (query === window.location.search.replace(/^\?/, '')) return
        // replace: cada tecla/filtro não vira uma entrada nova no histórico (o "voltar"
        // sai da listagem, não desfaz letra por letra).
        navigateRef.current({ search: query ? `?${query}` : '' }, { replace: true })
      }
      if (debounceMs > 0) timer.current = window.setTimeout(write, debounceMs)
      else write()
    },
    // aliases é uma lista literal nova a cada render; key/fallback/debounceMs é que importam
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, fallback, debounceMs]
  )

  return [value, set]
}

// Lembra, por URL de listagem, quantos itens estavam abertos ("Carregar mais") e onde a
// página estava rolada, e devolve isso quando a pessoa VOLTA (POP) pra ela. O navegador
// sozinho não dá conta: a lista só existe depois que o índice (dezenas de MB) termina de
// carregar, bem depois de ele tentar restaurar a rolagem numa página ainda vazia.
const STORAGE_PREFIX = 'blx:listing:'

interface SavedListing {
  y: number
  visible: number
}

function storageKey() {
  return STORAGE_PREFIX + window.location.pathname + window.location.search
}

function readSaved(): SavedListing | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(storageKey())
    if (!raw) return null
    const parsed = JSON.parse(raw) as SavedListing
    return Number.isFinite(parsed.y) && Number.isFinite(parsed.visible) ? parsed : null
  } catch {
    return null
  }
}

export function useListingScroll(ready: boolean, visibleCount: number, setVisibleCount: (n: number) => void) {
  const navigationType = useNavigationType()
  const { pathname } = useLocation()
  const [pending] = useState<SavedListing | null>(() => (navigationType === 'POP' ? readSaved() : null))
  const [stage, setStage] = useState<'waiting' | 'growing' | 'done'>(pending ? 'waiting' : 'done')
  const savingEnabled = useRef(!pending)
  const visibleRef = useRef(visibleCount)

  const save = useCallback(() => {
    if (!savingEnabled.current) return
    try {
      const entry: SavedListing = { y: window.scrollY, visible: visibleRef.current }
      window.sessionStorage.setItem(storageKey(), JSON.stringify(entry))
    } catch {
      /* sessionStorage bloqueado: segue sem lembrar */
    }
  }, [])

  useEffect(() => {
    visibleRef.current = visibleCount
    save()
  }, [visibleCount, save])

  useEffect(() => {
    let frame = 0
    const onScroll = () => {
      // Só grava enquanto a URL ainda é a da listagem. Ao clicar num produto o navegador
      // troca a URL, a página encolhe e "rola" sozinha pro topo — isso não pode apagar a posição.
      if (window.location.pathname !== pathname || frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        if (window.location.pathname === pathname) save()
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [pathname, save])

  // 1) com a lista pronta, reabre os itens que estavam abertos
  useEffect(() => {
    if (stage !== 'waiting' || !ready || !pending) return
    if (pending.visible > visibleCount) setVisibleCount(pending.visible)
    setStage('growing')
  }, [stage, ready, pending, visibleCount, setVisibleCount])

  // 2) quando eles estão na tela, volta pra posição
  useEffect(() => {
    if (stage !== 'growing' || !pending || visibleCount < pending.visible) return
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo(0, pending.y)
      savingEnabled.current = true
      setStage('done')
    })
    return () => window.cancelAnimationFrame(frame)
  }, [stage, pending, visibleCount])
}
