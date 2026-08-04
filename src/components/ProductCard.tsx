import { Link } from 'react-router-dom'
import type { ProductIndexEntry } from '../types/product'
import { useComparator } from '../context/ComparatorContext'
import { useFavorites } from '../context/FavoritesContext'

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

// Preenchido só quando scripts/update-price-history.mjs confirma uma queda
// real de ≥5% em relação ao preço de ~7 dias atrás — não é o mesmo dado do
// DiscountBadge (que compara contra o preço "de loja" informado no feed).
export function PriceDropBadge({ priceDropPercent }: { priceDropPercent: number | null | undefined }) {
  if (priceDropPercent == null) return null
  return <span className="price-drop-badge">{`↓ ${priceDropPercent}% essa semana`}</span>
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
  const { isFavorite, toggle: toggleFavorite } = useFavorites()
  const favorited = isFavorite(product.merchantSlug, product.slug)

  const itemPayload = {
    merchantSlug: product.merchantSlug,
    slug: product.slug,
    productName: product.productName,
    merchantDisplayName: product.merchantDisplayName,
    awImageUrl: product.awImageUrl,
    searchPrice: product.searchPrice,
    currency: product.currency,
  }

  return (
    <Link className="product-card" to={href}>
      <div className="product-card__badges">
        <DiscountBadge
          storePrice={product.storePrice}
          searchPrice={product.searchPrice}
          discountPercentage={product.discountPercentage}
        />
      </div>
      <div className="product-card__image-wrap">
        <img
          className="product-card__image"
          src={product.awImageUrl}
          alt={product.productName}
          loading={priority ? 'eager' : 'lazy'}
          // React 18 (só reconhece fetchPriority em camelCase a partir do 19) —
          // minúsculo é o jeito que o próprio React recomenda pra ele passar
          // direto como atributo customizado do DOM nessa versão.
          // @ts-expect-error -- ver comentário acima
          fetchpriority={priority ? 'high' : undefined}
        />
        {/* Canto inferior esquerdo da imagem, não do card inteiro — de
            propósito longe do canto superior (badge de desconto) e do canto
            oposto (comparar/favoritar), pra não sobrepor nenhum. Texto longo
            (legenda de venda, queda de preço) fica melhor embaixo do que
            espremido em cima ao lado dos botões. */}
        <div className="product-card__bottom-badges">
          {caption && <span className="product-card__caption">{caption}</span>}
          <PriceDropBadge priceDropPercent={product.priceDropPercent} />
        </div>
      </div>
      <div className="product-card__actions">
        <button
          className={`product-card__favorite${favorited ? ' product-card__favorite--active' : ''}`}
          aria-label={favorited ? `Remover ${product.productName} dos favoritos` : `Favoritar ${product.productName}`}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            toggleFavorite(itemPayload)
          }}
        >
          {favorited ? '♥' : '♡'}
        </button>
        <button
          className={`product-card__compare${selected ? ' product-card__compare--active' : ''}`}
          disabled={!selected && isFull}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            toggle(itemPayload)
          }}
        >
          {selected ? '✓ Comparando' : '+ Comparar'}
        </button>
      </div>
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
        {/* Só reforço visual — o card inteiro já é o link (<Link> acima),
            isso não é um <button> separado nem muda o destino do clique. */}
        <span className="product-card__cta">Ver oferta</span>
      </div>
    </Link>
  )
}
