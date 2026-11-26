import type { CouponItem } from '../../lib/coupons'
import { MerchantLogo } from '../MerchantLogo'
import { CouponValidity } from './CouponValidity'

// Oferta SEM CÓDIGO: cartão compacto (no celular cabem várias na tela). Quando o
// mesmo produto vem em 127V e 220V, é um cartão só com um botão por voltagem.
// showStore={false} dentro do bloco de uma loja, onde o nome já está no topo.
export function OfferCard({ coupon, now, showStore = true }: { coupon: CouponItem; now: Date | null; showStore?: boolean }) {
  return (
    <article className="offer">
      {showStore && (
        <div className="offer__top">
          <MerchantLogo merchantId={coupon.merchantId} displayName={coupon.advertiser} className="offer__logo" />
          <span className="offer__store">{coupon.advertiser}</span>
        </div>
      )}
      <h3 className="offer__title">{coupon.title}</h3>
      <div className="offer__footer">
        <CouponValidity ends={coupon.ends} now={now} prefix="Desconto automático" />
        <div className="offer__actions">
          {coupon.variants ? (
            coupon.variants.map((variant) => (
              <a
                key={variant.label}
                className="offer__cta"
                href={variant.deeplink}
                target="_blank"
                rel="noopener noreferrer sponsored"
                aria-label={`Ver oferta ${variant.label}: ${coupon.title}`}
              >
                {variant.label}
              </a>
            ))
          ) : (
            <a className="offer__cta" href={coupon.deeplink} target="_blank" rel="noopener noreferrer sponsored">
              Ver oferta
            </a>
          )}
        </div>
      </div>
    </article>
  )
}
