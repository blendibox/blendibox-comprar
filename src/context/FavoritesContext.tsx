import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export interface FavoriteItem {
  merchantSlug: string
  slug: string
  productName: string
  merchantDisplayName: string
  awImageUrl: string
  searchPrice: number | null
  currency: string
}

const STORAGE_KEY = 'compare-ofertas:favoritos'

interface FavoritesContextValue {
  items: FavoriteItem[]
  isFavorite: (merchantSlug: string, slug: string) => boolean
  toggle: (item: FavoriteItem) => void
  remove: (merchantSlug: string, slug: string) => void
  clear: () => void
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null)

function loadFromStorage(): FavoriteItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  // Mesmo padrão do ComparatorContext (ver comentário lá pro histórico
  // completo): começa vazio igual ao servidor, só carrega de verdade do
  // localStorage depois de montado — ler direto no lazy initializer do
  // useState rodaria também durante a hidratação e divergiria do HTML do
  // servidor (sempre vazio lá), causando o erro #418. `ready` é estado (não
  // ref) de propósito: precisa refletir só depois do re-render com os itens
  // carregados, senão o efeito de persistência abaixo roda ainda na mesma
  // leva de efeitos do mount (com items=[]) e sobrescreve o storage real.
  const [items, setItems] = useState<FavoriteItem[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setItems(loadFromStorage())
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // localStorage indisponível (modo privado etc) — segue sem persistir.
    }
  }, [items, ready])

  const isFavorite = (merchantSlug: string, slug: string) =>
    items.some((i) => i.merchantSlug === merchantSlug && i.slug === slug)

  const toggle = (item: FavoriteItem) => {
    setItems((current) => {
      if (current.some((i) => i.merchantSlug === item.merchantSlug && i.slug === item.slug)) {
        return current.filter((i) => !(i.merchantSlug === item.merchantSlug && i.slug === item.slug))
      }
      return [...current, item]
    })
  }

  const remove = (merchantSlug: string, slug: string) => {
    setItems((current) => current.filter((i) => !(i.merchantSlug === merchantSlug && i.slug === slug)))
  }

  const clear = () => setItems([])

  return (
    <FavoritesContext.Provider value={{ items, isFavorite, toggle, remove, clear }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites precisa estar dentro de <FavoritesProvider>')
  return ctx
}
