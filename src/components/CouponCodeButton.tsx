import { useEffect, useState } from 'react'
import { Check, Copy } from './Icon'

// Botão de código de cupom copiável — mesmo comportamento em todo canto que
// mostra um código (CouponCard, o destaque de cupom na página de produto, o
// popup de exit-intent): copia pro clipboard e mostra o check por um tempo.
//
// variant "code" (padrão) mostra o código dentro do próprio botão. variant
// "icon" mostra só o ícone + rótulo "Copiar" — pro caso do ticket de
// exit-intent, onde o código já aparece grande ao lado, em texto puro, e
// repetir ele dentro do botão ficaria redundante.
export function CouponCodeButton({
  code,
  onCopy,
  variant = 'code',
}: {
  code: string
  onCopy?: () => void
  variant?: 'code' | 'icon'
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 2500)
    return () => clearTimeout(t)
  }, [copied])

  function handleCopy() {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopied(true)
        onCopy?.()
      })
      .catch(() => {})
  }

  return (
    <button
      type="button"
      className={`coupon-card__code${variant === 'icon' ? ' coupon-card__code--icon' : ''}`}
      onClick={handleCopy}
      aria-label={copied ? 'Cupom copiado' : `Copiar código do cupom ${code}`}
    >
      {variant === 'code' && code}
      {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      {variant === 'icon' && <span>{copied ? 'Copiado' : 'Copiar'}</span>}
    </button>
  )
}
