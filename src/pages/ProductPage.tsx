import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchProduct } from '../lib/api'
import { clearInitialData, peekInitialData } from '../lib/initialData'
import type { Product } from '../types/product'
import { formatPrice } from '../components/ProductCard'
import { PriceHistoryChart } from '../components/PriceHistoryChart'

type LoadState = 'loading' | 'ready' | 'error'

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

  useEffect(() => {
    clearInitialData(path)
    if (consumedPathRef.current === path) {
      consumedPathRef.current = null
      return
    }
    setState('loading')
    fetchProduct(merchant, slug)
      .then((data) => {
        setProduct(data)
        setState('ready')
      })
      .catch(() => setState('error'))
  }, [path, merchant, slug])

  if (state === 'loading') return <p className="status">Carregando produto...</p>
  if (state === 'error' || !product) return <p className="status status--error">Produto não encontrado.</p>

  const isOuiParis = product.merchantSlug === 'ouiparis'

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
        <a href={product.awDeepLink} target="_blank" rel="noopener noreferrer sponsored">
          <img className="product-detail__image" src={product.awImageUrl} alt={product.productName} />
        </a>
        <div className="product-detail__body">
          <span className="product-card__merchant">{product.merchantDisplayName}</span>
          <h1>{product.productName}</h1>
          <div className="product-detail__price">
            {formatPrice(product.searchPrice, product.currency)}
          </div>
          <div className="freshness-badge">✓ Preço atualizado toda semana</div>
          <a
            className="cta-button"
            href={product.awDeepLink}
            target="_blank"
            rel="noopener noreferrer sponsored"
          >
            {isOuiParis ? 'Comprar pelo WhatsApp' : 'Ver produto na '}
            {!isOuiParis && product.merchantDisplayName}
          </a>
          {isOuiParis && (
            <p className="reseller-notice">
              {'💬 A compra é feita direto com uma representante de vendas autorizada O.U.i Paris, via '}
              {'WhatsApp. Ao clicar em "Comprar", vai abrir uma conversa já com esse produto e o valor '}
              {'preenchidos — é só confirmar o pedido por lá.'}
            </p>
          )}
          <p className="disclaimer">
            {'* Valor '}
            {product.lastUpdated ? `na data de atualização (${product.lastUpdated})` : 'na data de publicação'}
            {'. Oferta válida enquanto durarem os estoques.'}
          </p>

          {product.priceHistory && product.priceHistory.length > 1 && (
            <PriceHistoryChart points={product.priceHistory} currency={product.currency} />
          )}

          {product.description && (
            <div className="product-detail__description">
              <h2>Descrição do fabricante</h2>
              <p>{`“${product.description}”`}</p>
            </div>
          )}
        </div>
      </div>

      {product.similar.length > 0 && (
        <section className="similar-section">
          <h2>Produtos similares</h2>
          <div className="product-grid">
            {product.similar.map((s) => (
              <Link
                key={`${s.merchantSlug}-${s.slug}`}
                className="product-card"
                to={`/${s.merchantSlug}/${s.slug}`}
              >
                <img className="product-card__image" src={s.awImageUrl} alt={s.productName} loading="lazy" />
                <div className="product-card__body">
                  <span className="product-card__merchant">{s.merchantDisplayName}</span>
                  <h3 className="product-card__name">{s.productName}</h3>
                  <div className="product-card__prices">
                    <span className="product-card__price">{formatPrice(s.searchPrice, s.currency)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
