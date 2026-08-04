import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { NEWSLETTER_CONFIGURED, NEWSLETTER_WORKER_URL } from '../config/newsletter'

type Status = 'idle' | 'sending' | 'done' | 'error'

// "Avise-me quando baixar de preço" pros itens favoritados — separado da
// newsletter geral (finalidade específica, LGPD): o checkbox de newsletter é
// opcional e desmarcado por padrão, só assina quem marcar explicitamente.
export function PriceDropWatchForm({ items }: { items: { merchantSlug: string; slug: string }[] }) {
  const [email, setEmail] = useState('')
  const [subscribeNewsletter, setSubscribeNewsletter] = useState(false)
  const [status, setStatus] = useState<Status>('idle')

  if (!NEWSLETTER_CONFIGURED || items.length === 0) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch(`${NEWSLETTER_WORKER_URL}/watch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, items, subscribeNewsletter }),
      })
      setStatus(res.ok ? 'done' : 'error')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <div className="price-drop-watch">
        <h3>Aviso de queda de preço</h3>
        <p className="newsletter__soon">
          Prontinho! Avisamos por e-mail assim que algum desses favoritos baixar de preço.
        </p>
      </div>
    )
  }

  return (
    <div className="price-drop-watch">
      <h3>Avise-me quando baixar de preço</h3>
      <p className="price-drop-watch__hint">
        Recebe um e-mail (único, sem spam) assim que um desses {items.length} favorito
        {items.length === 1 ? '' : 's'} baixar de preço.
      </p>
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
          {' Concordo em receber esse aviso por e-mail e li e aceito a '}
          <Link to="/privacidade">Política de Privacidade</Link>
          {'.'}
        </label>
        <label className="newsletter__consent">
          <input
            type="checkbox"
            checked={subscribeNewsletter}
            onChange={(e) => setSubscribeNewsletter(e.target.checked)}
          />
          {' Também quero receber o resumo semanal de ofertas por e-mail.'}
        </label>
        <button type="submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Enviando...' : 'Avisar quando baixar'}
        </button>
        {status === 'error' && <p className="newsletter__error">Não foi possível cadastrar. Tente de novo.</p>}
      </form>
    </div>
  )
}
