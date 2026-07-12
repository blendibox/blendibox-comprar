import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { NEWSLETTER_CONFIGURED, NEWSLETTER_WORKER_URL } from '../config/newsletter'

type Status = 'idle' | 'sending' | 'done' | 'error'

export function NewsletterSignup() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  if (!NEWSLETTER_CONFIGURED) {
    return (
      <div className="newsletter">
        <h4>Newsletter</h4>
        <p className="newsletter__soon">Cadastro de cupons por e-mail em breve.</p>
      </div>
    )
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
      setStatus(res.ok ? 'done' : 'error')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <div className="newsletter">
        <h4>Receba cupons por e-mail</h4>
        <p className="newsletter__soon">Cadastro feito! Confira seu e-mail.</p>
      </div>
    )
  }

  return (
    <div className="newsletter">
      <h4>Receba cupons por e-mail</h4>
      <form className="newsletter__form" onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Seu e-mail"
          required
          aria-label="Seu e-mail"
        />
        <label className="newsletter__consent">
          <input type="checkbox" required />
          {' Concordo em receber e-mails com cupons e ofertas, e li e aceito a '}
          <Link to="/privacidade">Política de Privacidade</Link>
          {'.'}
        </label>
        <button type="submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Enviando...' : 'Cadastrar'}
        </button>
        {status === 'error' && <p className="newsletter__error">Não foi possível cadastrar. Tente de novo.</p>}
      </form>
    </div>
  )
}
