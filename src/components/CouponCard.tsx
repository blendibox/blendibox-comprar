import { useState } from 'react'
import type { CouponEntry } from '../types/product'
import { formatBrDate } from '../lib/date'
import { MerchantLogo } from './MerchantLogo'
import { CouponCodeButton } from './CouponCodeButton'

export function CouponCard({ coupon }: { coupon: CouponEntry }) {
  const validUntil = formatBrDate(coupon.ends)
  const [copied, setCopied] = useState(false)

  // "Usar cupom" também copia o código (não só o botão do código em si) —
  // cobre quem vai direto pro botão principal sem notar o código separado.
  function copyAndGo() {
    if (coupon.code) {
      navigator.clipboard.writeText(coupon.code).then(() => setCopied(true)).catch(() => {})
    }
  }

  return (
    <div className="coupon-card">
      <div className="coupon-card__header">
        <MerchantLogo merchantId={coupon.merchantId} displayName={coupon.advertiser} className="coupon-card__logo" />
        <span className="coupon-card__advertiser">{coupon.advertiser}</span>
      </div>
      <p className="coupon-card__title">{coupon.title}</p>
      {coupon.code && <CouponCodeButton code={coupon.code} onCopy={() => setCopied(true)} />}
      {validUntil && <span className="coupon-card__expiry">{`Válido até ${validUntil}`}</span>}
      <a
        className="cta-button"
        href={coupon.deeplink}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={coupon.isVoucher ? copyAndGo : undefined}
      >
        {copied ? 'Cupom copiado!' : coupon.isVoucher ? 'Usar cupom' : 'Ver oferta'}
      </a>
    </div>
  )
}
