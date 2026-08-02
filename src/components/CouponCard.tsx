import type { CouponEntry } from '../types/product'
import { formatBrDate } from '../lib/date'
import { MerchantLogo } from './MerchantLogo'

export function CouponCard({ coupon }: { coupon: CouponEntry }) {
  const validUntil = formatBrDate(coupon.ends)

  return (
    <div className="coupon-card">
      <div className="coupon-card__header">
        <MerchantLogo merchantId={coupon.merchantId} displayName={coupon.advertiser} className="coupon-card__logo" />
        <span className="coupon-card__advertiser">{coupon.advertiser}</span>
      </div>
      <p className="coupon-card__title">{coupon.title}</p>
      {coupon.code && <span className="coupon-card__code">{coupon.code}</span>}
      {validUntil && <span className="coupon-card__expiry">{`Válido até ${validUntil}`}</span>}
      <a className="cta-button" href={coupon.deeplink} target="_blank" rel="noopener noreferrer sponsored">
        {coupon.isVoucher ? 'Usar cupom' : 'Ver oferta'}
      </a>
    </div>
  )
}
