import { useEffect, useMemo, useState } from 'react'
import { fetchCoupons } from '../lib/api'
import type { CouponEntry } from '../types/product'
import { CouponCard } from '../components/CouponCard'
import { parseBrDate } from '../lib/date'

type LoadState = 'loading' | 'ready' | 'error'

export function CouponsPage() {
  const [coupons, setCoupons] = useState<CouponEntry[]>([])
  const [state, setState] = useState<LoadState>('loading')
  const [merchant, setMerchant] = useState('todas')

  useEffect(() => {
    fetchCoupons()
      .then((data) => {
        // O build já filtra cupons vencidos, mas os dados só são atualizados
        // periodicamente — esse filtro extra evita mostrar um cupom que
        // venceu entre um build e outro.
        const now = new Date()
        const stillValid = data.filter((c) => {
          const ends = parseBrDate(c.ends)
          return !ends || ends >= now
        })
        setCoupons(stillValid)
        setState('ready')
      })
      .catch(() => setState('error'))
  }, [])

  const merchants = useMemo(() => {
    const set = new Set(coupons.map((c) => c.advertiser))
    return ['todas', ...Array.from(set).sort()]
  }, [coupons])

  const filtered = useMemo(
    () => (merchant === 'todas' ? coupons : coupons.filter((c) => c.advertiser === merchant)),
    [coupons, merchant]
  )

  return (
    <div className="page">
      <header className="page__header">
        <h1>Cupons de desconto</h1>
        <p className="page__meta">{filtered.length} cupons/promoções ativos</p>
      </header>

      {state === 'ready' && coupons.length > 0 && (
        <div className="filters">
          <select value={merchant} onChange={(e) => setMerchant(e.target.value)} aria-label="Filtrar por loja">
            {merchants.map((m) => (
              <option key={m} value={m}>
                {m === 'todas' ? 'Todas as lojas' : m}
              </option>
            ))}
          </select>
        </div>
      )}

      {state === 'loading' && <p className="status">Carregando cupons...</p>}
      {state === 'error' && <p className="status status--error">Não foi possível carregar os cupons.</p>}
      {state === 'ready' && filtered.length === 0 && <p className="status">Nenhum cupom ativo no momento.</p>}

      {state === 'ready' && filtered.length > 0 && (
        <div className="coupon-grid">
          {filtered.map((coupon) => (
            <CouponCard key={coupon.id} coupon={coupon} />
          ))}
        </div>
      )}
    </div>
  )
}
