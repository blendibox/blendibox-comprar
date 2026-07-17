import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { fetchCoupons } from '../lib/api'
import type { CouponEntry } from '../types/product'
import { NEWSLETTER_CONFIGURED, NEWSLETTER_SUBSCRIBED_KEY, NEWSLETTER_WORKER_URL } from '../config/newsletter'

const MAX_SEGMENTS = 8
const SEGMENT_COLORS = ['#14b8a6', '#db2777', '#0a7d3f', '#0f172a']
const SPIN_DURATION_MS = 4000

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

// Botão flutuante — colocado em qualquer página, abre o popup da roleta sob
// demanda (nunca abre sozinho: popup automático ao carregar a página conta
// como "interstitial intrusivo" pro Google, além de ser mais chato).
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

  // Só mostra o botão se der pra montar uma roleta de verdade (pelo menos
  // alguns cupons reais e distintos pra sortear) e se o gate por e-mail
  // realmente funciona (depende do Worker de newsletter configurado).
  if (segments.length < 3 || !NEWSLETTER_CONFIGURED) return null

  return (
    <>
      <button className="coupon-wheel-fab" onClick={() => setOpen(true)} aria-label="Girar a roleta de cupons">
        {'🎡'}
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
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    }
  }, [])

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
        <h2>{'🎉 Roleta de Cupons'}</h2>
        <p className="coupon-wheel-modal__hint">Gire e ganhe um cupom de desconto de verdade.</p>

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
            {segments.map((s, i) => (
              <span
                key={s.id}
                className="coupon-wheel__label"
                style={{ transform: `rotate(${i * anglePerSegment + anglePerSegment / 2}deg)` }}
              >
                {s.advertiser}
              </span>
            ))}
          </div>
        </div>

        {!result && (
          <button className="coupon-wheel__spin-button" onClick={spin} disabled={spinning}>
            {spinning ? 'Girando...' : 'Girar!'}
          </button>
        )}

        {result && !unlocked && (
          <form className="coupon-wheel__gate" onSubmit={handleUnlock}>
            <p>{'🔒 Digite seu e-mail pra revelar o cupom que você ganhou:'}</p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Seu e-mail"
              required
              aria-label="Seu e-mail"
            />
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
            <span className="coupon-card__code">{result.code}</span>
            <a
              className="cta-button"
              href={result.deeplink}
              target="_blank"
              rel="noopener noreferrer sponsored"
            >
              Usar cupom
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
