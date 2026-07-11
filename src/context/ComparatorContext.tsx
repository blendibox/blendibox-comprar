import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export interface ComparatorItem {
  merchantSlug: string
  slug: string
  productName: string
  merchantDisplayName: string
  awImageUrl: string
  searchPrice: number | null
  currency: string
}

const STORAGE_KEY = 'compare-ofertas:comparador'
const MAX_ITEMS = 3

interface ComparatorContextValue {
  items: ComparatorItem[]
  isSelected: (merchantSlug: string, slug: string) => boolean
  toggle: (item: ComparatorItem) => void
  remove: (merchantSlug: string, slug: string) => void
  clear: () => void
  isFull: boolean
}

const ComparatorContext = createContext<ComparatorContextValue | null>(null)

function loadFromStorage(): ComparatorItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function ComparatorProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ComparatorItem[]>(() => loadFromStorage())

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // localStorage indisponível (modo privado etc) — segue sem persistir.
    }
  }, [items])

  const isSelected = (merchantSlug: string, slug: string) =>
    items.some((i) => i.merchantSlug === merchantSlug && i.slug === slug)

  const toggle = (item: ComparatorItem) => {
    setItems((current) => {
      if (current.some((i) => i.merchantSlug === item.merchantSlug && i.slug === item.slug)) {
        return current.filter((i) => !(i.merchantSlug === item.merchantSlug && i.slug === item.slug))
      }
      if (current.length >= MAX_ITEMS) return current
      return [...current, item]
    })
  }

  const remove = (merchantSlug: string, slug: string) => {
    setItems((current) => current.filter((i) => !(i.merchantSlug === merchantSlug && i.slug === slug)))
  }

  const clear = () => setItems([])

  return (
    <ComparatorContext.Provider value={{ items, isSelected, toggle, remove, clear, isFull: items.length >= MAX_ITEMS }}>
      {children}
    </ComparatorContext.Provider>
  )
}

export function useComparator() {
  const ctx = useContext(ComparatorContext)
  if (!ctx) throw new Error('useComparator precisa estar dentro de <ComparatorProvider>')
  return ctx
}
