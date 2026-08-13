import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Check, Gift, Mail, ShieldCheck } from 'lucide-react'
import { NEWSLETTER_CONFIGURED, NEWSLETTER_SUBSCRIBED_KEY, NEWSLETTER_WORKER_URL } from '../config/newsletter'

const DISMISSED_KEY = 'compare-ofertas:topbar-dismissed'

// Confete decorativo do fundo (puramente visual, aria-hidden). Flutua suave.
const CONFETTI: { top: string; left: string; color: string; rot: number }[] = [
  { top: '20%', left: '3%', color: 'rgba(255,255,255,0.65)', rot: 18 },
  { top: '64%', left: '8%', color: '#ffe08a', rot: -14 },
  { top: '26%', left: '42%', color: 'rgba(255,255,255,0.5)', rot: 24 },
  { top: '72%', left: '52%', color: '#ffd6e8', rot: -20 },
  { top: '18%', left: '84%', color: '#ffe08a', rot: 12 },
  { top: '68%', left: '90%', color: 'rgba(255,255,255,0.6)', rot: -24 },
]

type Status = 'idle' | 'sending' | 'done' | 'error'

// Barra fixa acima do header — mais visível que um link no menu, menos
// invasiva que popup. Some sozinha se o usuário já assinou ou já fechou
// antes (guardado em localStorage, não precisa fechar de novo a cada visita).
export function TopBar() {
  // Começa visível (igual no servidor e no primeiro render do cliente, antes
  // do efeito rodar) — sem isso, a maioria dos visitantes (primeira visita,
  // sem nada salvo ainda) via a barra "pular" pra dentro depois da hidratação
  // e empurrar a página inteira pra baixo (CLS). Só quem já dispensou ou já
  // assinou (minoria) sente o ajuste, escondendo a barra depois de montado.
  const [visible, setVisible] = useState(true)
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [status, setStatus] = useState<Status>('idle')

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(DISMISSED_KEY)
      const subscribed = localStorage.getItem(NEWSLETTER_SUBSCRIBED_KEY)
      if (dismissed || subscribed) setVisible(false)
    } catch {
      // localStorage indisponível — mantém visível
    }
  }, [])

  if (!NEWSLETTER_CONFIGURED || !visible) return null

  const dismiss = () => {
    setVisible(false)
    try {
      localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // localStorage indisponível — só não persiste entre visitas
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch(NEWSLETTER_WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setStatus('done')
        try {
          localStorage.setItem(NEWSLETTER_SUBSCRIBED_KEY, '1')
        } catch {
          // segue sem persistir
        }
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  const deco = (
    <span className="topbar__deco" aria-hidden="true">
      {CONFETTI.map((c, i) => (
        <span
          key={i}
          className="topbar__confetti"
          style={
            {
              top: c.top,
              left: c.left,
              background: c.color,
              '--rot': `${c.rot}deg`,
              animationDuration: `${4 + (i % 3) * 0.9}s`,
              animationDelay: `${(i % 4) * 0.4}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  )

  if (status === 'done') {
    return (
      <div className="topbar topbar--done">
        {deco}
        <span className="topbar__pitch">
          <Check size={18} aria-hidden="true" /> Cadastro feito! Confira seu e-mail.
        </span>
        <button type="button" className="topbar__close" onClick={dismiss} aria-label="Fechar">
          {'×'}
        </button>
      </div>
    )
  }

  return (
    <div className="topbar">
      {deco}
      <span className="topbar__badge" aria-hidden="true">
        <Gift size={22} />
      </span>
      <div className="topbar__text">
        <strong>Não perca uma oferta!</strong>
        <span>Cupons e as maiores quedas de preço no seu e-mail.</span>
      </div>
      <form className="topbar__form" onSubmit={handleSubmit}>
        <div className="topbar__field">
          <Mail size={16} aria-hidden="true" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Seu melhor e-mail"
            required
            aria-label="Seu e-mail"
            className="topbar__input"
          />
        </div>
        <button type="submit" className="topbar__submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Enviando...' : 'Quero receber →'}
        </button>
        <div className="topbar__meta">
          <span className="topbar__trust">
            <ShieldCheck size={13} aria-hidden="true" /> Sem spam · cancele quando quiser
          </span>
          <label className="topbar__consent">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
            {' Aceito a '}
            <Link to="/privacidade">Política de Privacidade</Link>
          </label>
          {status === 'error' && <span className="topbar__error">Erro, tente de novo.</span>}
        </div>
      </form>
      <button type="button" className="topbar__close" onClick={dismiss} aria-label="Fechar">
        {'×'}
      </button>
    </div>
  )
}
