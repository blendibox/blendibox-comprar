import { Link } from 'react-router-dom'
import type { ProductIndexEntry } from '../types/product'
import { useComparator } from '../context/ComparatorContext'

export function formatPrice(value: number | null | undefined, currency: string) {
  if (value === null || value === undefined) return '—'
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency || 'BRL' }).format(value)
  } catch {
    return `${value} ${currency}`
  }
}

export function ProductCard({ product }: { product: ProductIndexEntry }) {
  const href = `/${product.merchantSlug}/${product.slug}`
  const { isSelected, toggle, isFull } = useComparator()
  const selected = isSelected(product.merchantSlug, product.slug)

  return (
    <Link className="product-card" to={href}>
      <img
        className="product-card__image"
        src={product.awImageUrl}
        alt={product.productName}
        loading="lazy"
      />
      <button
        className={`product-card__compare${selected ? ' product-card__compare--active' : ''}`}
        disabled={!selected && isFull}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          toggle({
            merchantSlug: product.merchantSlug,
            slug: product.slug,
            productName: product.productName,
            merchantDisplayName: product.merchantDisplayName,
            awImageUrl: product.awImageUrl,
            searchPrice: product.searchPrice,
            currency: product.currency,
          })
        }}
      >
        {selected ? '✓ Comparando' : '+ Comparar'}
      </button>
      <div className="product-card__body">
        <span className="product-card__merchant">{product.merchantDisplayName}</span>
        <h3 className="product-card__name">{product.productName}</h3>
        <div className="product-card__prices">
          <span className="product-card__price">{formatPrice(product.searchPrice, product.currency)}</span>
        </div>
      </div>
    </Link>
  )
}
