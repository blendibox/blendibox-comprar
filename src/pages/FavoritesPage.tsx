import { Link } from 'react-router-dom'
import { useFavorites } from '../context/FavoritesContext'
import { formatPrice } from '../components/ProductCard'
import { PriceDropWatchForm } from '../components/PriceDropWatchForm'

export function FavoritesPage() {
  const { items, remove, clear } = useFavorites()

  return (
    <div className="page">
      <header className="page__header">
        <h1>Favoritos</h1>
        <p className="page__meta">
          {items.length === 0
            ? 'Clique no coração de um produto na listagem pra salvar aqui e acompanhar depois.'
            : `${items.length} produto${items.length === 1 ? '' : 's'} salvo${items.length === 1 ? '' : 's'}`}
        </p>
      </header>

      {items.length === 0 ? (
        <p className="status">
          <Link to="/">Voltar pra listagem</Link>
        </p>
      ) : (
        <>
          <div className="compare-grid">
            {items.map((item) => (
              <div key={`${item.merchantSlug}-${item.slug}`} className="compare-card">
                <button
                  className="compare-card__remove"
                  onClick={() => remove(item.merchantSlug, item.slug)}
                  aria-label={`Remover ${item.productName} dos favoritos`}
                >
                  ×
                </button>
                <img src={item.awImageUrl} alt={item.productName} />
                <span className="product-card__merchant">{item.merchantDisplayName}</span>
                <h3>{item.productName}</h3>
                <div className="compare-card__price">{formatPrice(item.searchPrice, item.currency)}</div>
                <Link className="cta-button" to={`/${item.merchantSlug}/${item.slug}`}>
                  Ver detalhes
                </Link>
              </div>
            ))}
          </div>
          <div className="load-more">
            <button onClick={clear}>Limpar favoritos</button>
          </div>
          <PriceDropWatchForm
            items={items.map((item) => ({
              merchantSlug: item.merchantSlug,
              slug: item.slug,
              price: item.searchPrice,
            }))}
          />
        </>
      )}
    </div>
  )
}
