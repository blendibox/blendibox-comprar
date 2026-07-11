import type { CouponEntry } from '../types/product'

export function CouponCard({ coupon }: { coupon: CouponEntry }) {
  return (
    <div className="coupon-card">
      <span className="coupon-card__advertiser">{coupon.advertiser}</span>
      <p className="coupon-card__title">{coupon.title}</p>
      {coupon.code && <span className="coupon-card__code">{coupon.code}</span>}
      <a className="cta-button" href={coupon.deeplink} target="_blank" rel="noopener noreferrer sponsored">
        {coupon.isVoucher ? 'Usar cupom' : 'Ver oferta'}
      </a>
    </div>
  )
}
