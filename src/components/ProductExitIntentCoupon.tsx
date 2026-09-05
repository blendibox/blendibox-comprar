import { useState } from 'react'
import { Ticket } from './Icon'
import { CouponCodeButton } from './CouponCodeButton'
import { useExitIntent } from '../hooks/useExitIntent'
import type { CouponEntry } from '../types/product'

// Exit-intent específico da página de produto: em vez de sortear (como a
// roleta sitewide em CouponWheel.tsx), mostra direto o cupom real daquela
// loja — a pessoa já decidiu o produto, só falta decidir comprar agora.
// Gamificar um cupom que a gente já sabe qual é só atrapalharia esse momento
// de intenção alta. Sem gate de e-mail também por isso: o objetivo aqui é
// tirar fricção bem na hora da saída, não criar mais uma.
//
// Sem persistência entre visitas de propósito — cada página de produto é uma
// decisão de compra à parte, então faz sentido poder aparecer de novo numa
// visita futura a outro produto (ou a esse mesmo, mais tarde).
export function ProductExitIntentCoupon({
  coupon,
  merchantDisplayName,
  dealHref,
}: {
  coupon: CouponEntry
  merchantDisplayName: string
  dealHref: string
}) {
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState(false)

  useExitIntent(
    () => {
      setShown(true)
      setOpen(true)
    },
    { enabled: !shown },
  )

  if (!open) return null

  return (
    <div className="coupon-wheel-overlay" onClick={() => setOpen(false)}>
      <div className="coupon-wheel-modal product-exit-coupon" onClick={(e) => e.stopPropagation()}>
        <button className="coupon-wheel-modal__close" onClick={() => setOpen(false)} aria-label="Fechar">
          {'×'}
        </button>
        <div className="product-exit-coupon__icon">
          <Ticket size={28} aria-hidden="true" />
        </div>
        <h2 className="coupon-wheel-modal__title">Espera! Não saia sem seu cupom</h2>
        <p className="coupon-wheel-modal__hint">{`${coupon.title} — só na ${merchantDisplayName}`}</p>
        {coupon.code && <CouponCodeButton code={coupon.code} />}
        <a className="cta-button" href={dealHref} target="_blank" rel="noopener noreferrer sponsored" onClick={() => setOpen(false)}>
          {`Ir para a ${merchantDisplayName}`}
        </a>
      </div>
    </div>
  )
}
