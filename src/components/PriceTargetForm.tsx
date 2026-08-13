import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Check } from 'lucide-react'
import { NEWSLETTER_CONFIGURED, NEWSLETTER_WORKER_URL } from '../config/newsletter'
import { useFavorites, type FavoriteItem } from '../context/FavoritesContext'
import { formatPrice } from './ProductCard'

type Status = 'idle' | 'sending' | 'done' | 'error'

// Campo "meta de preço" inline, logo abaixo do botão de compra — onde numa
// loja estaria o "avise-me quando voltar ao estoque". Aqui é "me avise quando
// chegar a R$X" (ou, sem meta, quando baixar de qualquer valor). Pedir o e-mail
// no momento de maior intenção de compra. Favorita o produto junto, pra o
// acompanhamento também aparecer nos Favoritos.
export function PriceTargetForm({ product }: { product: FavoriteItem }) {
  const { isFavorite, toggle } = useFavorites()
  const [email, setEmail] = useState('')
  const [target, setTarget] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  const current = product.searchPrice
  if (!NEWSLETTER_CONFIGURED || current == null) return null

  // Aceita "450", "450,90", "1.050,00" — só vale se for um número positivo
  // ABAIXO do preço atual (senão a meta já estaria batida).
  const parsed = parseFloat(target.replace(/[^\d,]/g, '').replace(',', '.'))
  const targetPrice = Number.isFinite(parsed) && parsed > 0 && parsed < current ? parsed : null
  const suggested = Math.max(1, Math.floor(current * 0.9))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    try {
      if (!isFavorite(product.merchantSlug, product.slug)) toggle(product)
      const res = await fetch(`${NEWSLETTER_WORKER_URL}/watch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          items: [{ merchantSlug: product.merchantSlug, slug: product.slug, price: current, targetPrice }],
          subscribeNewsletter: false,
        }),
      })
      setStatus(res.ok ? 'done' : 'error')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <div className="price-target price-target--done">
        <Check size={16} aria-hidden="true" />
        {targetPrice != null
          ? ` Prontinho! Avisamos quando chegar a ${formatPrice(targetPrice, product.currency)}.`
          : ' Prontinho! Avisamos quando este produto baixar de preço.'}
      </div>
    )
  }

  return (
    <form className="price-target" onSubmit={submit}>
      <div className="price-target__head">
        <Bell size={16} aria-hidden="true" /> <strong>Quer pagar menos?</strong>
      </div>
      <p className="price-target__hint">
        Deixe seu e-mail e a gente te avisa quando este produto chegar no preço que você quer — ou baixar de
        qualquer valor.
      </p>
      <div className="price-target__fields">
        <label className="price-target__target">
          <span>Me avise ao chegar a</span>
          <span className="price-target__price-input">
            <em>R$</em>
            <input
              inputMode="decimal"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={String(suggested)}
              aria-label={`Preço desejado (atual ${formatPrice(current, product.currency)})`}
            />
          </span>
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Seu melhor e-mail"
          required
          aria-label="Seu e-mail"
          className="price-target__email"
        />
        <button type="submit" className="price-target__submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Enviando...' : 'Me avise'}
        </button>
      </div>
      <label className="price-target__consent">
        <input type="checkbox" required /> Aceito a <Link to="/privacidade">Política de Privacidade</Link>
      </label>
      {status === 'error' && <p className="price-target__error">Não foi possível cadastrar. Tente de novo.</p>}
    </form>
  )
}
