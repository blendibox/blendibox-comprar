import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { BadgeCheck, Check, Heart, MessageCircle, Plus, Ticket } from 'lucide-react'
import { fetchCoupons, fetchMerchants, fetchProduct } from '../lib/api'
import { clearInitialData, peekInitialData } from '../lib/initialData'
import { getGalleryImages } from '../lib/images'
import type { CouponEntry, Product, ProductIndexEntry, SimilarRef } from '../types/product'
import { DiscountBadge, OriginalPrice, PriceDropBadge, ProductCard, RatingBadge, formatPrice } from '../components/ProductCard'
import { CouponCard } from '../components/CouponCard'
import { PriceHistoryChart } from '../components/PriceHistoryChart'
import { PriceTargetForm } from '../components/PriceTargetForm'
import { Carousel } from '../components/Carousel'
import { ShareBar } from '../components/ShareBar'
import { ProductNotFound } from '../components/ProductNotFound'
import { useComparator } from '../context/ComparatorContext'
import { useFavorites } from '../context/FavoritesContext'
import { formatSimpleDateBr, parseBrDate } from '../lib/date'
import { SITE_URL } from '../config/site'

type LoadState = 'loading' | 'ready' | 'error'

// Cupons ficam num carrossel (não quebra linha), mas ainda vale limitar o
// total exibido — acima disso, o último item vira um link "ver mais" em
// vez de mais um cupom, pra não deixar um carrossel enorme de rolar.
const MAX_COUPONS_SHOWN = 5

// SimilarRef só tem o subconjunto de campos gravado em `similar[]` (ver
// scripts/fetch-feeds.mjs) — completa com os campos que só existem no
// índice completo (nota, desconto, queda de preço) como null/vazio, já que
// não foram calculados pra essa referência resumida. Permite reusar o
// ProductCard de verdade (com botão de comparar) em vez de duplicar o
// card à mão.
function similarToIndexEntry(s: SimilarRef): ProductIndexEntry {
  return {
    ...s,
    categorySlug: '',
    eligibleForStaticPage: false,
    rating: null,
    storePrice: null,
    discountPercentage: null,
    previousPrice: null,
    priceDropPercent: null,
  }
}

export function ProductPage() {
  const { merchant = '', slug = '' } = useParams()
  const path = `/${merchant}/${slug}/`

  const [initialProduct] = useState<Product | null>(() => peekInitialData<Product>(path))
  const [product, setProduct] = useState<Product | null>(initialProduct)
  const [state, setState] = useState<LoadState>(initialProduct ? 'ready' : 'loading')
  // Rastreia pra qual path o initialProduct já foi "consumido" (usado). Assim,
  // se o usuário navegar (client-side) pra outro produto sem desmontar este
  // componente, o efeito abaixo detecta a mudança de path e busca de novo.
  const consumedPathRef = useRef<string | null>(initialProduct ? path : null)
  const [coupons, setCoupons] = useState<CouponEntry[]>([])
  const [activeImage, setActiveImage] = useState<string | null>(null)
  // Quando o produto não é encontrado, verifica se a LOJA ainda existe entre
  // as parceiras: se existir, a intenção original do visitante era ver algo
  // daquela loja — manda pra página dela em vez do recuperável genérico. Só
  // cai no genérico se a loja também não existir mais.
  const [merchantCheck, setMerchantCheck] = useState<'idle' | 'checking' | 'exists' | 'not-exists'>('idle')

  useEffect(() => {
    clearInitialData(path)
    if (consumedPathRef.current === path) {
      consumedPathRef.current = null
      return
    }
    setState('loading')
    setActiveImage(null)
    setMerchantCheck('idle')
    fetchProduct(merchant, slug)
      .then((data) => {
        setProduct(data)
        setState('ready')
      })
      .catch(() => setState('error'))
  }, [path, merchant, slug])

  useEffect(() => {
    if (state !== 'error') return
    setMerchantCheck('checking')
    fetchMerchants()
      .then((list) => setMerchantCheck(list.some((m) => m.slug === merchant) ? 'exists' : 'not-exists'))
      .catch(() => setMerchantCheck('not-exists'))
  }, [state, merchant])

  useEffect(() => {
    fetchCoupons().then(setCoupons).catch(() => setCoupons([]))
  }, [])

  const { isSelected, toggle, isFull } = useComparator()
  const { isFavorite, toggle: toggleFavorite } = useFavorites()

  if (state === 'loading') return <p className="status">Carregando produto...</p>
  if (state === 'error' || !product) {
    if (merchantCheck === 'exists') return <Navigate to={`/${merchant}`} replace />
    if (merchantCheck !== 'not-exists') return <p className="status">Carregando...</p>
    return <ProductNotFound />
  }

  const isWhatsappReseller = product.awDeepLink?.startsWith('https://wa.me/')
  const selected = isSelected(product.merchantSlug, product.slug)
  const favorited = isFavorite(product.merchantSlug, product.slug)
  const galleryImages = getGalleryImages(product)
  const mainImage = (activeImage && galleryImages.includes(activeImage) ? activeImage : galleryImages[0]) || product.awImageUrl
  // Data real da última checagem de preço (último ponto gravado por
  // scripts/update-price-history.mjs, que roda a cada build) — reflete a
  // realidade (build diário) em vez de uma alegação genérica de frequência.
  const lastPriceCheck = product.priceHistory?.length ? product.priceHistory[product.priceHistory.length - 1].date : null
  // Menor preço já registrado no histórico rastreado (product.priceHistory,
  // já limitado a MAX_POINTS em update-price-history.mjs) — texto visível e
  // renderizado no servidor (sem depender do useEffect/"agora" do gráfico),
  // pra ter conteúdo indexável de verdade sobre o histórico, não só o
  // gráfico SVG (que só aparece depois de hidratar no cliente).
  const lowestPricePoint =
    product.priceHistory && product.priceHistory.length > 1
      ? product.priceHistory.reduce((min, p) => (p.price < min.price ? p : min))
      : null

  const now = new Date()
  const merchantCoupons = coupons.filter((c) => {
    if (c.merchantSlug !== product.merchantSlug) return false
    const ends = parseBrDate(c.ends)
    return !ends || ends >= now
  })
  const hasMoreCoupons = merchantCoupons.length > MAX_COUPONS_SHOWN
  const visibleCoupons = hasMoreCoupons
    ? merchantCoupons.slice(0, MAX_COUPONS_SHOWN - 1)
    : merchantCoupons.slice(0, MAX_COUPONS_SHOWN)

  return (
    <div className="page product-page">
      <nav className="breadcrumbs">
        <Link to="/">Início</Link>
        {' › '}
        <Link to={`/${product.vertical}`}>{product.vertical}</Link>
        {' › '}
        <Link to={`/${product.merchantSlug}`}>{product.merchantDisplayName}</Link>
      </nav>

      <div className="product-detail">
        <div className="product-detail__gallery">
          <div className="product-detail__image-wrap">
            <a href={product.awDeepLink} target="_blank" rel="noopener noreferrer sponsored">
              <img
                className="product-detail__image"
                src={mainImage}
                alt={product.productName}
                // React 18 só reconhece fetchPriority em camelCase a partir do
                // 19 — minúsculo é o jeito que o próprio React recomenda pra
                // ele passar direto como atributo customizado do DOM.
                // @ts-expect-error -- ver comentário acima
                fetchpriority="high"
              />
            </a>
            <span className="product-detail__merchant-badge">
              <BadgeCheck size={15} className="product-detail__merchant-badge-check" aria-hidden="true" />
              {product.merchantDisplayName}
            </span>
            <div className="product-detail__image-actions">
              <button
                type="button"
                className={`product-detail__favorite-icon${favorited ? ' product-detail__favorite-icon--active' : ''}`}
                aria-label={favorited ? `Remover ${product.productName} dos favoritos` : `Favoritar ${product.productName}`}
                aria-pressed={favorited}
                onClick={() =>
                  toggleFavorite({
                    merchantSlug: product.merchantSlug,
                    slug: product.slug,
                    productName: product.productName,
                    merchantDisplayName: product.merchantDisplayName,
                    awImageUrl: product.awImageUrl,
                    searchPrice: product.searchPrice,
                    currency: product.currency,
                  })
                }
              >
                <Heart size={20} fill={favorited ? 'currentColor' : 'none'} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`product-detail__compare-icon${selected ? ' product-detail__compare-icon--active' : ''}`}
                disabled={!selected && isFull}
                onClick={() =>
                  toggle({
                    merchantSlug: product.merchantSlug,
                    slug: product.slug,
                    productName: product.productName,
                    merchantDisplayName: product.merchantDisplayName,
                    awImageUrl: product.awImageUrl,
                    searchPrice: product.searchPrice,
                    currency: product.currency,
                  })
                }
              >
                {selected ? (
                  <>
                    <Check size={16} strokeWidth={2.5} aria-hidden="true" /> Comparando
                  </>
                ) : (
                  <>
                    <Plus size={16} strokeWidth={2.5} aria-hidden="true" /> Comparar
                  </>
                )}
              </button>
            </div>
          </div>
          {galleryImages.length > 1 && (
            <div className="product-detail__thumbs">
              {galleryImages.map((url) => (
                <button
                  key={url}
                  type="button"
                  className={`product-detail__thumb${url === mainImage ? ' product-detail__thumb--active' : ''}`}
                  onClick={() => setActiveImage(url)}
                  aria-label={`Ver esta imagem de ${product.productName}`}
                  aria-pressed={url === mainImage}
                >
                  <img src={url} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="product-detail__body">
          <div className="product-card__merchant-row">
            <span className="product-card__merchant">{product.merchantDisplayName}</span>
            <RatingBadge rating={product.rating ?? product.averageRating} />
          </div>
          <h1>
            <a
              href={product.awDeepLink}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="product-detail__title-link"
            >
              {product.productName}
            </a>
          </h1>
          <div className="product-detail__price">
            <OriginalPrice storePrice={product.storePrice} searchPrice={product.searchPrice} currency={product.currency} />
            {formatPrice(product.searchPrice, product.currency)}
            <DiscountBadge
              storePrice={product.storePrice}
              searchPrice={product.searchPrice}
              discountPercentage={product.discountPercentage}
            />
            <PriceDropBadge priceDropPercent={product.priceDropPercent} href={product.awDeepLink} />
            {merchantCoupons.length > 0 && (
              <Link to={`/cupons/${product.merchantSlug}`} className="product-detail__coupon-badge">
                <Ticket size={14} aria-hidden="true" /> Cupom {product.merchantDisplayName}
              </Link>
            )}
          </div>
          <div className="freshness-badge">
            <Check size={14} strokeWidth={2.5} aria-hidden="true" />
            {lastPriceCheck ? ` Preço verificado em ${formatSimpleDateBr(lastPriceCheck)}` : ' Preço verificado diariamente'}
          </div>
          <div className="product-detail__actions">
            <a
              className="cta-button"
              href={product.awDeepLink}
              target="_blank"
              rel="noopener noreferrer sponsored"
            >
              {isWhatsappReseller ? 'Comprar pelo WhatsApp' : 'Ver produto na '}
              {!isWhatsappReseller && product.merchantDisplayName}
            </a>
          </div>
          {isWhatsappReseller && (
            <p className="reseller-notice">
              <MessageCircle size={15} aria-hidden="true" />
              {' A compra é feita direto com uma representante de vendas autorizada '}
              {product.merchantDisplayName}
              {', via WhatsApp. Ao clicar em "Comprar", vai abrir uma conversa já com esse produto e o valor '}
              {'preenchidos — é só confirmar o pedido por lá.'}
            </p>
          )}
          <ShareBar
            url={`${SITE_URL}/${product.merchantSlug}/${product.slug}/`}
            title={`${product.productName} por ${formatPrice(product.searchPrice, product.currency)} na ${product.merchantDisplayName}`}
          />

          {product.priceHistory && product.priceHistory.length > 1 && (
            <PriceHistoryChart
              points={product.priceHistory}
              currency={product.currency}
              currentPrice={product.searchPrice}
            />
          )}
          {lowestPricePoint && (
            <p className="product-detail__lowest-price">
              Menor preço já registrado: <strong>{formatPrice(lowestPricePoint.price, product.currency)}</strong> em{' '}
              {formatSimpleDateBr(lowestPricePoint.date)}
            </p>
          )}
          <PriceTargetForm
            product={{
              merchantSlug: product.merchantSlug,
              slug: product.slug,
              productName: product.productName,
              merchantDisplayName: product.merchantDisplayName,
              awImageUrl: product.awImageUrl,
              searchPrice: product.searchPrice,
              currency: product.currency,
            }}
          />

          {product.description && (
            <div className="product-detail__description">
              <h2>Descrição do fabricante</h2>
              <p>{`“${product.description}”`}</p>
            </div>
          )}
        </div>
      </div>

      {product.crossChannel && (
        <section className="cross-channel-section">
          <h2>Esse mesmo produto em outro canal</h2>
          <Link
            className="cross-channel-card"
            to={`/${product.crossChannel.merchantSlug}/${product.crossChannel.slug}`}
          >
            <img
              className="cross-channel-card__image"
              src={product.crossChannel.awImageUrl}
              alt={product.crossChannel.productName}
              loading="lazy"
            />
            <div className="cross-channel-card__body">
              <span className="product-card__merchant">{product.crossChannel.merchantDisplayName}</span>
              <h3 className="product-card__name">{product.crossChannel.productName}</h3>
              <div className="product-card__prices">
                <span className="product-card__price">
                  {formatPrice(product.crossChannel.searchPrice, product.crossChannel.currency)}
                </span>
                {product.crossChannel.searchPrice != null &&
                  product.searchPrice != null &&
                  product.crossChannel.searchPrice < product.searchPrice && (
                    <span className="cross-channel-card__cheaper">
                      <Check size={13} strokeWidth={2.5} aria-hidden="true" /> Mais barato
                    </span>
                  )}
              </div>
            </div>
          </Link>
        </section>
      )}

      {product.similar.length > 0 && (
        <section className="similar-section">
          <h2>Produtos similares</h2>
          <Carousel>
            {product.similar.map((s) => (
              <ProductCard key={`${s.merchantSlug}-${s.slug}`} product={similarToIndexEntry(s)} />
            ))}
          </Carousel>
        </section>
      )}

      {merchantCoupons.length > 0 && (
        <section className="product-coupons-section">
          <h2>Cupons {product.merchantDisplayName}</h2>
          <Carousel>
            {visibleCoupons.map((coupon) => (
              <CouponCard key={coupon.id} coupon={coupon} />
            ))}
            {hasMoreCoupons && (
              <Link to={`/cupons?loja=${product.merchantSlug}`} className="coupon-card coupon-card--more">
                <span className="coupon-card__more-count">{`+${merchantCoupons.length - visibleCoupons.length}`}</span>
                <span>Ver mais cupons {product.merchantDisplayName}</span>
              </Link>
            )}
          </Carousel>
        </section>
      )}
    </div>
  )
}
