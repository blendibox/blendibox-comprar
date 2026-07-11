import { Link } from 'react-router-dom'
import { useComparator } from '../context/ComparatorContext'

export function ComparatorTray() {
  const { items, remove } = useComparator()

  if (items.length === 0) return null

  return (
    <div className="comparator-tray">
      <div className="comparator-tray__items">
        {items.map((item) => (
          <div key={`${item.merchantSlug}-${item.slug}`} className="comparator-tray__item">
            <img src={item.awImageUrl} alt={item.productName} />
            <button
              className="comparator-tray__remove"
              aria-label={`Remover ${item.productName} do comparador`}
              onClick={() => remove(item.merchantSlug, item.slug)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <Link to="/comparar" className="comparator-tray__cta">
        Comparar ({items.length})
      </Link>
    </div>
  )
}
