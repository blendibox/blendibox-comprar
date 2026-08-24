import { useEffect, useState } from 'react'
import type { CouponEntry } from '../types/product'
import { formatBrDate } from '../lib/date'
import { MerchantLogo } from './MerchantLogo'
import { Check, Copy } from './Icon'

export function CouponCard({ coupon }: { coupon: CouponEntry }) {
  const validUntil = formatBrDate(coupon.ends)
  const [copied, setCopied] = useState(false)

  // Some sozinho depois de um tempo — evita "Cupom copiado!" grudado se o
  // usuário voltar pra essa aba depois de ir na loja.
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 2500)
    return () => clearTimeout(t)
  }, [copied])

  // target="_blank" já abre a loja numa aba nova — a aba atual não navega,
  // então dá pra copiar o código e mostrar o aviso aqui mesmo, sem precisar
  // atrasar ou interceptar a navegação.
  function handleUseCoupon() {
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
      {coupon.code && (
        <button
          type="button"
          className="coupon-card__code"
          onClick={handleUseCoupon}
          aria-label={copied ? 'Cupom copiado' : `Copiar código do cupom ${coupon.code}`}
        >
          {coupon.code}
          {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
        </button>
      )}
      {validUntil && <span className="coupon-card__expiry">{`Válido até ${validUntil}`}</span>}
      <a
        className="cta-button"
        href={coupon.deeplink}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={coupon.isVoucher ? handleUseCoupon : undefined}
      >
        {copied ? 'Cupom copiado!' : coupon.isVoucher ? 'Usar cupom' : 'Ver oferta'}
      </a>
    </div>
  )
}
