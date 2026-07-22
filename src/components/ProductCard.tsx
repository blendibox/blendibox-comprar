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

// Só aparece quando a fonte realmente informa nota (hoje, só a Shopee) — não
// inventamos avaliação pra loja que não manda esse dado.
export function RatingBadge({ rating }: { rating: number | null | undefined }) {
  if (rating == null || rating <= 0) return null
  return (
    <span className="rating-badge" aria-label={`Avaliação ${rating.toFixed(1)} de 5`}>
      {'★ '}
      {rating.toFixed(1)}
    </span>
  )
}

function discountPercent(storePrice: number | null | undefined, searchPrice: number | null | undefined, discountPercentage: number | null | undefined) {
  if (storePrice == null || searchPrice == null || storePrice <= searchPrice) return null
  const pct = discountPercentage && discountPercentage > 0 ? Math.round(discountPercentage) : Math.round((1 - searchPrice / storePrice) * 100)
  return pct > 0 ? pct : null
}

export function DiscountBadge({
  storePrice,
  searchPrice,
  discountPercentage,
}: {
  storePrice: number | null | undefined
  searchPrice: number | null | undefined
  discountPercentage: number | null | undefined
}) {
  const pct = discountPercent(storePrice, searchPrice, discountPercentage)
  if (pct == null) return null
  return <span className="discount-badge">{`-${pct}%`}</span>
}

export function OriginalPrice({
  storePrice,
  searchPrice,
  currency,
}: {
  storePrice: number | null | undefined
  searchPrice: number | null | undefined
  currency: string
}) {
  if (storePrice == null || searchPrice == null || storePrice <= searchPrice) return null
  return <span className="product-card__price-original">{formatPrice(storePrice, currency)}</span>
}

export function ProductCard({
  product,
  caption,
  priority,
}: {
  product: ProductIndexEntry
  caption?: string
  // Card que provavelmente é o LCP da página (ex: primeiro item de uma
  // grade/carrossel acima da dobra) — carrega eager + fetchPriority alta em
  // vez do lazy padrão, senão o Lighthouse acusa a imagem de LCP não
  // detectável/lazy (mesmo ajuste já feito na imagem principal da página de
  // produto).
  priority?: boolean
}) {
  const href = `/${product.merchantSlug}/${product.slug}`
  const { isSelected, toggle, isFull } = useComparator()
  const selected = isSelected(product.merchantSlug, product.slug)

  return (
    <Link className="product-card" to={href}>
      {caption && <span className="product-card__caption">{caption}</span>}
      <DiscountBadge
        storePrice={product.storePrice}
        searchPrice={product.searchPrice}
        discountPercentage={product.discountPercentage}
      />
      <img
        className="product-card__image"
        src={product.awImageUrl}
        alt={product.productName}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
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
        <div className="product-card__merchant-row">
          <span className="product-card__merchant">{product.merchantDisplayName}</span>
          <RatingBadge rating={product.rating} />
        </div>
        <h3 className="product-card__name">{product.productName}</h3>
        <div className="product-card__prices">
          <OriginalPrice storePrice={product.storePrice} searchPrice={product.searchPrice} currency={product.currency} />
          <span className="product-card__price">{formatPrice(product.searchPrice, product.currency)}</span>
        </div>
      </div>
    </Link>
  )
}
