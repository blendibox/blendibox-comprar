import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from './Link'
import {
  BadgeCheck,
  Check,
  Copy,
  Gift,
  Lock,
  PartyPopper,
  Percent,
  RefreshCw,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
  Ticket,
} from './Icon'
import { EmailField } from './EmailField'
import { fetchCoupons } from '../lib/api'
import type { CouponEntry } from '../types/product'
import { NEWSLETTER_CONFIGURED, NEWSLETTER_SUBSCRIBED_KEY, NEWSLETTER_WORKER_URL } from '../config/newsletter'

const MAX_SEGMENTS = 8
// Mostra a roleta por exit-intent no máximo uma vez por navegador — nunca de
// novo depois disso, pra não ser repetitivo em quem volta ao site.
const EXIT_INTENT_SHOWN_KEY = 'compare-ofertas:coupon-wheel-exit-shown'
// Só arma a detecção depois desse tempo na página — sem isso, um movimento
// reflexo do mouse logo ao chegar (ex: indo fechar uma aba de fundo) dispara
// a roleta pra quem acabou de entrar, o que não é "saindo do site" de verdade.
const EXIT_INTENT_ARM_DELAY_MS = 4000
const SEGMENT_COLORS = ['#14b8a6', '#1e3a5f', '#ec4899', '#0f766e', '#22c55e', '#2563eb', '#14b8a6', '#db2777']
// Ícones só decorativos por fatia (não têm relação com a loja) — dão o visual
// colorido do mockup sem inventar dado nenhum sobre o cupom.
const SEGMENT_ICONS = [Tag, ShoppingBag, Ticket, Store, Shirt, Percent, Gift, Sparkles]
const SPIN_DURATION_MS = 4000
const LABEL_RADIUS = 82

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function isSubscribed() {
  try {
    return Boolean(localStorage.getItem(NEWSLETTER_SUBSCRIBED_KEY))
  } catch {
    return false
  }
}

function hasShownExitIntent() {
  try {
    return Boolean(localStorage.getItem(EXIT_INTENT_SHOWN_KEY))
  } catch {
    return false
  }
}

// Botão flutuante — colocado em qualquer página, abre o popup da roleta sob
// demanda. Também abre sozinho por exit-intent (mouse saindo por cima da
// janela, sinal de que a pessoa está indo fechar a aba) — nunca ao carregar a
// página, que aí sim conta como "interstitial intrusivo" pro Google e
// penaliza ranqueamento mobile. Exit-intent é baseado em mouse saindo por
// cima da viewport, então não existe em touch — não dispara em mobile por
// natureza, o que evita esse risco de qualquer forma nesses acessos.
export function CouponWheelButton() {
  const [open, setOpen] = useState(false)
  const [coupons, setCoupons] = useState<CouponEntry[] | null>(null)

  useEffect(() => {
    fetchCoupons()
      .then(setCoupons)
      .catch(() => setCoupons([]))
  }, [])

  const segments = useMemo(() => {
    if (!coupons) return []
    const withCode = coupons.filter((c) => c.isVoucher && c.code)
    return shuffle(withCode).slice(0, MAX_SEGMENTS)
  }, [coupons])

  // Só mostra o botão (e a roleta) se der pra montar uma roleta de verdade
  // (pelo menos alguns cupons reais e distintos pra sortear) e se o gate por
  // e-mail realmente funciona (depende do Worker de newsletter configurado).
  const canShow = segments.length >= 3 && NEWSLETTER_CONFIGURED

  useEffect(() => {
    if (!canShow || open || isSubscribed() || hasShownExitIntent()) return

    let armed = false
    const armTimer = window.setTimeout(() => {
      armed = true
    }, EXIT_INTENT_ARM_DELAY_MS)

    function handleMouseOut(e: MouseEvent) {
      // relatedTarget nulo + clientY <= 0 é o sinal clássico de mouse saindo
      // por cima da janela (rumo à barra de abas/endereço) — não qualquer
      // movimento entre elementos da própria página.
      if (!armed || e.relatedTarget || e.clientY > 0) return
      setOpen(true)
      try {
        localStorage.setItem(EXIT_INTENT_SHOWN_KEY, '1')
      } catch {
        // segue sem persistir — pior caso, mostra de novo numa próxima visita
      }
    }

    document.addEventListener('mouseout', handleMouseOut)
    return () => {
      window.clearTimeout(armTimer)
      document.removeEventListener('mouseout', handleMouseOut)
    }
  }, [canShow, open])

  if (!canShow) return null

  return (
    <>
      <button className="coupon-wheel-fab" onClick={() => setOpen(true)} aria-label="Girar a roleta de cupons">
        <Gift size={24} aria-hidden="true" />
      </button>
      {open && <CouponWheelModal segments={segments} onClose={() => setOpen(false)} />}
    </>
  )
}

function CouponWheelModal({ segments, onClose }: { segments: CouponEntry[]; onClose: () => void }) {
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<CouponEntry | null>(null)
  const [unlocked, setUnlocked] = useState(isSubscribed)
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [gateStatus, setGateStatus] = useState<'idle' | 'sending' | 'error'>('idle')
  const [codeCopied, setCodeCopied] = useState(false)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    }
  }, [])

  // Som ao abrir o modal (clique no FAB ou exit-intent). Navegador pode
  // bloquear áudio sem interação prévia do usuário (política de autoplay) —
  // nesse caso .play() rejeita a Promise; ignoramos, sem quebrar a roleta.
  useEffect(() => {
    const audio = new Audio('/sounds/roleta.mp3')
    audio.volume = 0.6
    audio.play().catch(() => {})
  }, [])

  // Mesmo comportamento do CouponCard: aba nova abre a loja, essa aba não
  // navega, então dá pra copiar o código e mostrar o aviso aqui mesmo.
  function handleUseCoupon() {
    if (result?.code) {
      navigator.clipboard.writeText(result.code).then(() => setCodeCopied(true)).catch(() => {})
    }
  }

  useEffect(() => {
    if (!codeCopied) return
    const t = setTimeout(() => setCodeCopied(false), 2500)
    return () => clearTimeout(t)
  }, [codeCopied])

  const anglePerSegment = 360 / segments.length

  const spin = () => {
    if (spinning) return
    const chosenIndex = Math.floor(Math.random() * segments.length)
    // O ponteiro fica fixo no topo (0°) — pra o segmento escolhido parar lá,
    // giramos até o meio dele ficar sob o ponteiro, mais algumas voltas
    // inteiras só pro efeito visual de girar de verdade.
    const targetAngle = 360 * 5 - (chosenIndex * anglePerSegment + anglePerSegment / 2)
    setSpinning(true)
    setResult(null)
    setRotation((prev) => prev - (prev % 360) + targetAngle)
    timeoutRef.current = window.setTimeout(() => {
      setSpinning(false)
      setResult(segments[chosenIndex])
    }, SPIN_DURATION_MS)
  }

  const handleUnlock = async (e: FormEvent) => {
    e.preventDefault()
    setGateStatus('sending')
    try {
      const res = await fetch(NEWSLETTER_WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        try {
          localStorage.setItem(NEWSLETTER_SUBSCRIBED_KEY, '1')
        } catch {
          // segue sem persistir
        }
        setUnlocked(true)
        setGateStatus('idle')
      } else {
        setGateStatus('error')
      }
    } catch {
      setGateStatus('error')
    }
  }

  return (
    <div className="coupon-wheel-overlay" onClick={onClose}>
      <div className="coupon-wheel-modal" onClick={(e) => e.stopPropagation()}>
        <button className="coupon-wheel-modal__close" onClick={onClose} aria-label="Fechar">
          {'×'}
        </button>
        <h2 className="coupon-wheel-modal__title">
          <PartyPopper size={20} aria-hidden="true" /> Roleta de Cupons
        </h2>
        <p className="coupon-wheel-modal__hint">Gire e ganhe um cupom de desconto de verdade.</p>

        <div className="coupon-wheel-stage">
          <div className="coupon-wheel">
            <div className="coupon-wheel__pointer">{'▼'}</div>
            <div
              className="coupon-wheel__disc"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.17, 0.67, 0.32, 1)` : 'none',
                background: `conic-gradient(${segments
                  .map((_, i) => `${SEGMENT_COLORS[i % SEGMENT_COLORS.length]} ${i * anglePerSegment}deg ${(i + 1) * anglePerSegment}deg`)
                  .join(', ')})`,
              }}
            >
              {segments.map((s, i) => {
                // O texto fica num wrapper posicionado por trigonometria (segue
                // a fatia colorida ao girar), mas o próprio texto recebe uma
                // rotação inversa à do disco — com a mesma transição — pra
                // cancelar o giro e ficar sempre na horizontal, mesmo durante
                // e depois do spin (sem a diagonal ilegível de antes).
                const midAngleDeg = i * anglePerSegment + anglePerSegment / 2
                const midAngleRad = (midAngleDeg * Math.PI) / 180
                const x = LABEL_RADIUS * Math.sin(midAngleRad)
                const y = -LABEL_RADIUS * Math.cos(midAngleRad)
                const SegIcon = SEGMENT_ICONS[i % SEGMENT_ICONS.length]
                return (
                  <div key={s.id} className="coupon-wheel__label-wrap" style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}>
                    <span
                      className="coupon-wheel__label"
                      style={{
                        transform: `rotate(${-rotation}deg)`,
                        transition: spinning ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.17, 0.67, 0.32, 1)` : 'none',
                      }}
                    >
                      <SegIcon size={18} className="coupon-wheel__label-icon" aria-hidden="true" />
                      <span className="coupon-wheel__label-text">{s.advertiser}</span>
                    </span>
                  </div>
                )
              })}
            </div>
            <button
              className="coupon-wheel__hub"
              onClick={spin}
              disabled={spinning || Boolean(result)}
              aria-label="Girar a roleta"
            >
              <span className="coupon-wheel__hub-label">{spinning ? '...' : 'Girar!'}</span>
            </button>
          </div>
        </div>

        {result && !unlocked && (
          <form className="coupon-wheel__gate" onSubmit={handleUnlock}>
            <p className="coupon-wheel__gate-lead">
              <Lock size={14} aria-hidden="true" /> {`Você caiu em ${result.advertiser}! Digite seu e-mail pra revelar o cupom:`}
            </p>
            <EmailField value={email} onChange={setEmail} placeholder="Seu e-mail" required aria-label="Seu e-mail" />
            <label className="coupon-wheel__consent">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
              {' Aceito a '}
              <Link to="/privacidade">Política de Privacidade</Link>
            </label>
            <button type="submit" disabled={gateStatus === 'sending'}>
              {gateStatus === 'sending' ? 'Enviando...' : 'Revelar cupom'}
            </button>
            {gateStatus === 'error' && <p className="coupon-wheel__error">Erro, tente de novo.</p>}
          </form>
        )}

        {result && unlocked && (
          <div className="coupon-wheel__result">
            <span className="coupon-wheel__result-advertiser">{result.advertiser}</span>
            <p>{result.title}</p>
            <button
              type="button"
              className="coupon-card__code"
              onClick={handleUseCoupon}
              aria-label={codeCopied ? 'Cupom copiado' : `Copiar código do cupom ${result.code}`}
            >
              {result.code}
              {codeCopied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
            </button>
            <a
              className="cta-button"
              href={result.deeplink}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={handleUseCoupon}
            >
              {codeCopied ? 'Cupom copiado!' : 'Usar cupom'}
            </a>
          </div>
        )}

        <ul className="coupon-wheel__benefits">
          <li>
            <ShieldCheck size={22} className="coupon-wheel__benefit-icon coupon-wheel__benefit-icon--pink" aria-hidden="true" />
            <div>
              <strong>Conexão segura</strong>
              <span>Seus dados protegidos</span>
            </div>
          </li>
          <li>
            <BadgeCheck size={22} className="coupon-wheel__benefit-icon coupon-wheel__benefit-icon--teal" aria-hidden="true" />
            <div>
              <strong>Cupons de verdade</strong>
              <span>Direto das lojas parceiras</span>
            </div>
          </li>
          <li>
            <RefreshCw size={22} className="coupon-wheel__benefit-icon coupon-wheel__benefit-icon--blue" aria-hidden="true" />
            <div>
              <strong>Atualizados todo dia</strong>
              <span>Volte sempre pra conferir</span>
            </div>
          </li>
        </ul>
        <p className="coupon-wheel__rules">* Cupons válidos por tempo limitado. Consulte as regras de cada loja.</p>
      </div>
    </div>
  )
}
