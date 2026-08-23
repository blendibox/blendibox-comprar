import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flame, Search, ShoppingBag, TrendingDown, TrendingUp, X } from './Icon'
import { fetchHomeHighlights, fetchMerchants, fetchMeta } from '../lib/api'
import type { FeedMeta, HomeHighlights, MerchantMeta } from '../types/product'
import { Carousel } from './Carousel'
import { ProductCard } from './ProductCard'
import { MerchantLogo } from './MerchantLogo'

// Página de "produto não encontrado" (link antigo indexado, produto saiu do
// catálogo, loja não é mais parceira). Em vez de um beco sem saída, reaproveita
// as mesmas seções curadas da home (destaques, quedas de preço, lojas
// parceiras) — sem inventar "produtos parecidos" por categoria, porque não dá
// pra inferir com segurança a categoria de um produto que já saiu do índice.
export function ProductNotFound() {
  const [highlights, setHighlights] = useState<HomeHighlights | null>(null)
  const [merchants, setMerchants] = useState<MerchantMeta[]>([])
  const [meta, setMeta] = useState<FeedMeta | null>(null)

  useEffect(() => {
    fetchHomeHighlights().then(setHighlights).catch(() => {})
    fetchMerchants()
      .then((data) => setMerchants([...data].sort((a, b) => a.displayName.localeCompare(b.displayName))))
      .catch(() => {})
    fetchMeta().then(setMeta).catch(() => {})
  }, [])

  const featured = highlights?.featured ?? []
  const priceDrops = highlights?.priceDrops ?? []

  return (
    <div className="page product-not-found">
      <header className="product-not-found__header">
        <div className="product-not-found__illustration" aria-hidden="true">
          <span className="product-not-found__blob" />
          <Search size={110} strokeWidth={1.5} className="product-not-found__glass-icon" />
          <ShoppingBag size={34} strokeWidth={1.5} className="product-not-found__bag-icon" />
          <span className="product-not-found__badge">
            <X size={16} strokeWidth={3} />
          </span>
        </div>
        <h1>Este produto não está mais disponível</h1>
        <p>
          O produto que você procurou não faz mais parte do nosso catálogo — mas separamos outras
          ofertas pra você não sair de mãos vazias.
        </p>
        <Link to="/" className="cta-button">
          <Search size={16} aria-hidden="true" /> Buscar outro produto
        </Link>
      </header>

      {(meta || merchants.length > 0) && (
        <div className="home-hero__stats product-not-found__stats">
          {meta && (
            <div className="home-stat">
              <span className="home-stat__icon home-stat__icon--products" aria-hidden="true">
                <TrendingUp size={26} strokeWidth={2.5} />
              </span>
              <span className="home-stat__body">
                <strong>{meta.totalProducts.toLocaleString('pt-BR')}</strong>
                <span className="home-stat__label">produtos monitorados</span>
              </span>
            </div>
          )}
          {merchants.length > 0 && (
            <div className="home-stat">
              <span className="home-stat__icon home-stat__icon--sync" aria-hidden="true">
                <TrendingUp size={26} strokeWidth={2.5} />
              </span>
              <span className="home-stat__body">
                <strong>{merchants.length}</strong>
                <span className="home-stat__label">lojas parceiras</span>
              </span>
            </div>
          )}
        </div>
      )}

      {priceDrops.length > 0 && (
        <section className="price-drop-section">
          <h2 className="section-title">
            <TrendingDown className="section-title__icon section-title__icon--drop" size={22} strokeWidth={2.5} />
            Caiu de preço
          </h2>
          <Carousel>
            {priceDrops.map((product, i) => (
              <ProductCard key={`notfound-drop-${product.merchantSlug}-${product.slug}`} product={product} priority={i === 0} />
            ))}
          </Carousel>
        </section>
      )}

      {featured.length > 0 && (
        <section className="featured-section">
          <h2 className="section-title">
            <Flame className="section-title__icon section-title__icon--fire" size={22} strokeWidth={2.5} />
            Ofertas em destaque
          </h2>
          <Carousel>
            {featured.map((product, i) => (
              <ProductCard
                key={`notfound-featured-${product.merchantSlug}-${product.slug}`}
                product={product}
                priority={i === 0 && priceDrops.length === 0}
              />
            ))}
          </Carousel>
        </section>
      )}

      {merchants.length > 0 && (
        <section>
          <h2>Nossas lojas parceiras</h2>
          <div className="partners-grid">
            {merchants.map((m) => (
              <Link key={m.slug} to={`/${m.slug}`} className="partners-grid__item">
                <MerchantLogo merchantId={m.merchantId} displayName={m.displayName} className="partners-grid__logo" />
                <span>{m.displayName}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
