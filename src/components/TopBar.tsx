import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { NEWSLETTER_CONFIGURED, NEWSLETTER_SUBSCRIBED_KEY, NEWSLETTER_WORKER_URL } from '../config/newsletter'

const DISMISSED_KEY = 'compare-ofertas:topbar-dismissed'

type Status = 'idle' | 'sending' | 'done' | 'error'

// Barra fixa acima do header — mais visível que um link no menu, menos
// invasiva que popup. Some sozinha se o usuário já assinou ou já fechou
// antes (guardado em localStorage, não precisa fechar de novo a cada visita).
export function TopBar() {
  const [visible, setVisible] = useState(false)
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [status, setStatus] = useState<Status>('idle')

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(DISMISSED_KEY)
      const subscribed = localStorage.getItem(NEWSLETTER_SUBSCRIBED_KEY)
      if (!dismissed && !subscribed) setVisible(true)
    } catch {
      setVisible(true)
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

  if (status === 'done') {
    return (
      <div className="topbar topbar--done">
        <span>{'✓ Cadastro feito! Confira seu e-mail.'}</span>
        <button type="button" className="topbar__close" onClick={dismiss} aria-label="Fechar">
          {'×'}
        </button>
      </div>
    )
  }

  return (
    <div className="topbar">
      <form className="topbar__form" onSubmit={handleSubmit}>
        <span className="topbar__pitch">{'📩 Receba cupons exclusivos por e-mail — grátis'}</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Seu e-mail"
          required
          aria-label="Seu e-mail"
          className="topbar__input"
        />
        <label className="topbar__consent">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            required
          />
          {' Aceito a '}
          <Link to="/privacidade">Política de Privacidade</Link>
        </label>
        <button type="submit" className="topbar__submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Enviando...' : 'Assinar'}
        </button>
        {status === 'error' && <span className="topbar__error">Erro, tente de novo.</span>}
      </form>
      <button type="button" className="topbar__close" onClick={dismiss} aria-label="Fechar">
        {'×'}
      </button>
    </div>
  )
}
