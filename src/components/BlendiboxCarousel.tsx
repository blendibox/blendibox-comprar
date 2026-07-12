import { useEffect, useState } from 'react'
import { fetchBlendiboxProducts } from '../lib/api'
import type { BlendiboxProduct } from '../types/product'

export function BlendiboxCarousel() {
  const [products, setProducts] = useState<BlendiboxProduct[]>([])

  useEffect(() => {
    fetchBlendiboxProducts()
      .then(setProducts)
      .catch(() => setProducts([]))
  }, [])

  if (products.length === 0) return null

  return (
    <div className="blendibox-carousel">
      <h4>Produtos Blendibox</h4>
      <div className="blendibox-carousel__track">
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
