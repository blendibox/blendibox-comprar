import { useState } from 'react'
import { Clock, Gift, Heart, Tag } from './Icon'
import { CouponCodeButton } from './CouponCodeButton'
import { useExitIntent } from '../hooks/useExitIntent'
import { formatBrDate } from '../lib/date'
import type { CouponEntry } from '../types/product'

// Exit-intent específico da página de produto: em vez de sortear (como a
// roleta sitewide em CouponWheel.tsx), mostra direto o cupom real daquela
// loja — a pessoa já decidiu o produto, só falta decidir comprar agora.
// Gamificar um cupom que a gente já sabe qual é só atrapalharia esse momento
// de intenção alta. Sem gate de e-mail também por isso: o objetivo aqui é
// tirar fricção bem na hora da saída, não criar mais uma.
//
// Sem persistência nenhuma de propósito (nem entre visitas, nem dentro da
// mesma visita) — reabre a cada nova tentativa de saída, mesmo depois de
// fechado antes. Fechar e continuar navegando não devia gastar a única
// chance da pessoa ver o cupom.
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
  const [redirecting, setRedirecting] = useState(false)

  // Reabre a cada nova tentativa de saída (não só uma vez por visita à
  // página) — fechar e continuar navegando não deveria gastar a única
  // chance; só não pode disparar de novo enquanto já está aberto.
  useExitIntent(
    () => setOpen(true),
    { enabled: !open },
  )

  // Prazo real do próprio cupom (quando existe) — nunca uma urgência
  // inventada tipo "por tempo limitado" sem data nenhuma por trás.
  const validUntil = formatBrDate(coupon.ends)

  function copyCode() {
    if (coupon.code) {
      navigator.clipboard.writeText(coupon.code).catch(() => {})
    }
  }

  // Fecha e limpa o estado de "redirecionando" junto — sem isso, fechar no
  // meio da contagem do ticket (ou depois que ela termina) deixava esse
  // estado grudado, e reabrir mais tarde (agora que dá pra reabrir mais de
  // uma vez) mostrava o ticket já verde antes de a pessoa copiar de novo.
  function closePopup() {
    setOpen(false)
    setRedirecting(false)
  }

  // Botão "COPIAR" do ticket (ou clicar no próprio código, mesmo efeito):
  // copia e, depois de um instante pra pessoa ler "Copiado!", segue sozinho
  // pra loja — o atraso é curto de propósito (perto do que os navegadores
  // ainda toleram como resultado do próprio clique, sem contar como popup
  // inesperado e ser bloqueado).
  function handleTicketCopy() {
    setRedirecting(true)
    window.setTimeout(() => {
      window.open(dealHref, '_blank', 'noopener,noreferrer')
      closePopup()
    }, 1200)
  }

  // O código grande também copia ao clicar (não só o botão "COPIAR" ao
  // lado) — o hover com "Clique para copiar" deixa isso óbvio.
  function handleValueClick() {
    if (!coupon.code || redirecting) return
    navigator.clipboard.writeText(coupon.code).then(handleTicketCopy).catch(() => {})
  }

  if (!open) return null

  return (
    <div className="coupon-wheel-overlay" onClick={closePopup}>
      <div className="coupon-wheel-modal product-exit-coupon" onClick={(e) => e.stopPropagation()}>
        <button className="coupon-wheel-modal__close" onClick={closePopup} aria-label="Fechar">
          {'×'}
        </button>

        <div className="product-exit-coupon__icon-wrap" aria-hidden="true">
          <span className="product-exit-coupon__spark product-exit-coupon__spark--tl" />
          <span className="product-exit-coupon__spark product-exit-coupon__spark--tr" />
          <span className="product-exit-coupon__spark product-exit-coupon__spark--bl" />
          <span className="product-exit-coupon__spark product-exit-coupon__spark--br" />
          <div className="product-exit-coupon__icon">
            <Gift size={28} aria-hidden="true" />
          </div>
        </div>

        <h2 className="product-exit-coupon__title">
          <span>Espera!</span> <strong>{coupon.title}</strong> <Heart size={20} fill="currentColor" aria-hidden="true" />
        </h2>
        <p className="coupon-wheel-modal__hint">{`Só na ${merchantDisplayName}`}</p>

        {coupon.code && (
          <div className={`product-exit-coupon__ticket${redirecting ? ' product-exit-coupon__ticket--success' : ''}`}>
            <div className="product-exit-coupon__ticket-code">
              <button
                type="button"
                className="product-exit-coupon__ticket-value"
                onClick={handleValueClick}
                title="Clique para copiar"
                disabled={redirecting}
              >
                {coupon.code}
              </button>
              <span
                className={`product-exit-coupon__ticket-label${redirecting ? ' product-exit-coupon__ticket-label--success' : ''}`}
              >
                {redirecting ? 'Copiado! Redirecionando...' : 'Seu cupom de desconto'}
              </span>
            </div>
            <CouponCodeButton code={coupon.code} variant="icon" onCopy={handleTicketCopy} />
          </div>
        )}

        <a
          className="cta-button product-exit-coupon__cta"
          href={dealHref}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={() => {
            copyCode()
            closePopup()
          }}
        >
          {coupon.code && <Tag size={17} aria-hidden="true" />}
          <span className="product-exit-coupon__cta-text">
            {coupon.code ? `Copiar e ir para ${merchantDisplayName}` : `Ir para a ${merchantDisplayName}`}
          </span>
          <span className="product-exit-coupon__cta-arrow">→</span>
        </a>

        {validUntil && (
          <p className="product-exit-coupon__expiry">
            <Clock size={14} aria-hidden="true" />{' '}
            {coupon.code ? `Cupom válido até ${validUntil}` : `Oferta válida até ${validUntil}`}
          </p>
        )}

        {/* Só faz sentido "continuar sem o cupom" quando existe um código
            sendo dispensado — sem código, o CTA principal já é só "ir pra
            loja", e esse link viraria um duplicado dele sem propósito. Vai
            pra loja mesmo sem o cupom — quem clicou aqui já ia sair de
            qualquer jeito, então pelo menos aproveita o clique. Fechar o
            popup sem sair é o botão × ali em cima, não este link. */}
        {coupon.code && (
          <a
            className="product-exit-coupon__dismiss"
            href={dealHref}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={closePopup}
          >
            Continuar sem o cupom
          </a>
        )}
      </div>
    </div>
  )
}
