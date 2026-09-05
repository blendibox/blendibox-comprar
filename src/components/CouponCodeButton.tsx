import { useEffect, useState } from 'react'
import { Check, Copy } from './Icon'

// Botão de código de cupom copiável — mesmo comportamento em todo canto que
// mostra um código (CouponCard, o destaque de cupom na página de produto, o
// popup de exit-intent): copia pro clipboard e mostra o check por um tempo.
export function CouponCodeButton({ code, onCopy }: { code: string; onCopy?: () => void }) {
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
      className="coupon-card__code"
      onClick={handleCopy}
      aria-label={copied ? 'Cupom copiado' : `Copiar código do cupom ${code}`}
    >
      {code}
      {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
    </button>
  )
}
