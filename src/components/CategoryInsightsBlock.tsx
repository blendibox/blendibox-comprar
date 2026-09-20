import { Link } from './Link'
import { formatBRL, formatDateBr, formatPercent } from '../lib/priceInsights'
import type { CategoryInsights } from '../types/product'

// Resumo de preços da categoria no topo da página (dados do build; ver
// buildCategoryInsights): quantos produtos e lojas, faixa de preço e as maiores
// quedas VERIFICADAS. A data é a do build (não o relógio) — hidratação segura.
export function CategoryInsightsBlock({ insights, label }: { insights: CategoryInsights; label: string }) {
  const { count, merchantCount, minPrice, maxPrice, medianPrice, drops, verifiedDropCount, updatedIso } = insights
  return (
    <section className="category-insights" aria-label={`Resumo de preços de ${label}`}>
      <p className="category-insights__facts">
        <strong>{count.toLocaleString('pt-BR')} produtos</strong> de {merchantCount}{' '}
        {merchantCount === 1 ? 'loja' : 'lojas'}, com preços de <strong>{formatBRL(minPrice)}</strong> a{' '}
        <strong>{formatBRL(maxPrice)}</strong>. Metade custa até {formatBRL(medianPrice)}.{' '}
        <span className="category-insights__date">Atualizado em {formatDateBr(updatedIso)}.</span>
      </p>
      {drops.length > 0 && (
        <div className="category-insights__drops">
          <h2>
            Maiores quedas verificadas
            {verifiedDropCount > drops.length ? ` (${drops.length} de ${verifiedDropCount})` : ''}
          </h2>
          <ol>
            {drops.map((drop) => (
              <li key={drop.path}>
                <Link to={drop.path}>{drop.name}</Link>
                <span className="category-insights__drop-meta">
                  {' '}
                  — {formatBRL(drop.price)} · <strong>{formatPercent(drop.percent)}% abaixo do habitual</strong> ({drop.merchant})
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}
