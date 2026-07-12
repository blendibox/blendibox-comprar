import type { ProductIndexEntry } from '../types/product'

export type SortOption = 'relevancia' | 'menor-preco' | 'maior-preco'

export const SORT_LABELS: Record<SortOption, string> = {
  relevancia: 'Relevância',
  'menor-preco': 'Menor preço',
  'maior-preco': 'Maior preço',
}

export function sortProducts<T extends Pick<ProductIndexEntry, 'searchPrice'>>(
  items: T[],
  sort: SortOption
): T[] {
  if (sort === 'relevancia') return items
  const withPrice = items.filter((i) => i.searchPrice != null)
  const withoutPrice = items.filter((i) => i.searchPrice == null)
  withPrice.sort((a, b) =>
    sort === 'menor-preco' ? a.searchPrice! - b.searchPrice! : b.searchPrice! - a.searchPrice!
  )
  return [...withPrice, ...withoutPrice]
}
