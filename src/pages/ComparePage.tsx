import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useComparator } from '../context/ComparatorContext'
import { formatPrice } from '../components/ProductCard'
import { CompareChart, type CompareSeries } from '../components/CompareChart'
import { fetchProduct } from '../lib/api'

export function ComparePage() {
  const { items, remove, clear } = useComparator()
  // Os itens do comparador guardam só dado leve (preço atual) — pra desenhar
  // o gráfico de variação precisa do histórico completo de cada produto, que
  // só existe no JSON individual (não no index). Busca sob demanda, igual a
  // página de produto já faz na navegação client-side.
  const [series, setSeries] = useState<CompareSeries[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all(
      items.map(async (item) => {
        try {
          const product = await fetchProduct(item.merchantSlug, item.slug)
          return {
            key: `${item.merchantSlug}/${item.slug}`,
            label: item.productName,
            currentPrice: item.searchPrice ?? 0,
            points: product.priceHistory ?? [],
          }
        } catch {
          return null
        }
      })
    ).then((results) => {
      if (!cancelled) setSeries(results.filter((s): s is CompareSeries => s !== null))
    })
    return () => {
      cancelled = true
    }
  }, [items])

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
          <CompareChart series={series} currency={items[0]?.currency ?? 'BRL'} />
          <div className="load-more">
            <button onClick={clear}>Limpar comparador</button>
          </div>
        </>
      )}
    </div>
  )
}
