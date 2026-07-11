import { Link } from 'react-router-dom'
import { useComparator } from '../context/ComparatorContext'
import { formatPrice } from '../components/ProductCard'

export function ComparePage() {
  const { items, remove, clear } = useComparator()

  return (
    <div className="page">
      <header className="page__header">
        <h1>Comparar ofertas</h1>
        <p className="page__meta">
          {items.length === 0
            ? 'Selecione até 3 produtos na listagem clicando em "+ Comparar" pra ver lado a lado aqui.'
            : `${items.length} de 3 produtos selecionados`}
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
                  aria-label={`Remover ${item.productName}`}
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
            <button onClick={clear}>Limpar comparador</button>
          </div>
        </>
      )}
    </div>
  )
}
