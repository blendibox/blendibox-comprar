import { useState } from 'react'
import type { CouponItem } from '../../lib/coupons'
import { MerchantLogo } from '../MerchantLogo'
import { CouponCodeButton } from '../CouponCodeButton'
import { Ticket } from '../Icon'
import { CouponValidity } from './CouponValidity'

// Cupom COM CÓDIGO, em formato de "bilhete": o código em destaque (toque copia)
// e o botão principal que copia e abre a loja. Visualmente bem diferente da
// oferta sem código (OfferCard), pra ninguém clicar esperando um código.
export function CouponTicket({ coupon, now }: { coupon: CouponItem; now: Date | null }) {
  const [copied, setCopied] = useState(false)
  const description = coupon.description?.trim()
  const extra = description && description !== coupon.title.trim() && description !== coupon.code ? description : null

  function copyAndGo() {
    if (!coupon.code) return
    navigator.clipboard
      .writeText(coupon.code)
      .then(() => setCopied(true))
      .catch(() => {})
  }

  return (
    <article className="ticket">
      <div className="ticket__body">
        <div className="ticket__top">
          <MerchantLogo merchantId={coupon.merchantId} displayName={coupon.advertiser} className="ticket__logo" />
          <span className="ticket__store">{coupon.advertiser}</span>
          <span className="ticket__tag">
            <Ticket size={12} aria-hidden="true" /> Cupom
          </span>
        </div>
        <h3 className="ticket__title">{coupon.title}</h3>
        {extra && <p className="ticket__desc">{extra}</p>}
        <CouponValidity ends={coupon.ends} now={now} />
      </div>
      <div className="ticket__stub">
        {coupon.code && <CouponCodeButton code={coupon.code} onCopy={() => setCopied(true)} />}
        <a className="cta-button ticket__cta" href={coupon.deeplink} target="_blank" rel="noopener noreferrer sponsored" onClick={copyAndGo}>
          {copied ? 'Código copiado · abrir loja' : 'Copiar e ir à loja'}
        </a>
      </div>
    </article>
  )
}
