import { useEffect, useState } from 'react'
import { fetchIndex, fetchMeta } from '../lib/api'
import type { FeedMeta, ProductIndexEntry } from '../types/product'

type LoadState = 'loading' | 'ready' | 'error'

export function useIndex() {
  const [products, setProducts] = useState<ProductIndexEntry[]>([])
  const [meta, setMeta] = useState<FeedMeta | null>(null)
  const [state, setState] = useState<LoadState>('loading')

  useEffect(() => {
    Promise.all([fetchIndex(), fetchMeta().catch(() => null)])
      .then(([indexData, metaData]) => {
        setProducts(indexData)
        setMeta(metaData)
        setState('ready')
      })
      .catch(() => setState('error'))
  }, [])

  return { products, meta, state }
}
