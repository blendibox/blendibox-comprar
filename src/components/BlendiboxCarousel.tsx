import { useEffect, useRef, useState } from 'react'
import { fetchBlendiboxProducts } from '../lib/api'
import type { BlendiboxProduct } from '../types/product'

const AUTO_SCROLL_INTERVAL_MS = 2500

export function BlendiboxCarousel() {
  const [products, setProducts] = useState<BlendiboxProduct[]>([])
  const trackRef = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(false)

  useEffect(() => {
    fetchBlendiboxProducts()
      .then(setProducts)
      .catch(() => setProducts([]))
  }, [])

  useEffect(() => {
    if (products.length === 0) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const track = trackRef.current
    if (!track) return

    const timer = window.setInterval(() => {
      if (pausedRef.current) return
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4
      if (atEnd) {
        track.scrollTo({ left: 0, behavior: 'smooth' })
      } else {
        const itemWidth = track.firstElementChild?.clientWidth ?? 130
        track.scrollBy({ left: itemWidth + 14, behavior: 'smooth' })
      }
    }, AUTO_SCROLL_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [products])

  if (products.length === 0) return null

  return (
    <div className="blendibox-carousel">
      <h3>Produtos Blendibox</h3>
      <div
        className="blendibox-carousel__track"
        ref={trackRef}
        onMouseEnter={() => (pausedRef.current = true)}
        onMouseLeave={() => (pausedRef.current = false)}
        onTouchStart={() => (pausedRef.current = true)}
        onTouchEnd={() => (pausedRef.current = false)}
      >
        {products.map((product) => (
          <a
            key={product.link}
            className="blendibox-carousel__item"
            href={product.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src={product.image} alt={product.title} loading="lazy" />
            <span className="blendibox-carousel__brand">{product.brand}</span>
            <span className="blendibox-carousel__title">{product.title}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
