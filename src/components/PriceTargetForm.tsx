import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Check, ChevronDown, ShieldCheck, TrendingDown } from './Icon'
import { NEWSLETTER_CONFIGURED, NEWSLETTER_WORKER_URL } from '../config/newsletter'
import { useFavorites, type FavoriteItem } from '../context/FavoritesContext'
import { formatPrice } from './ProductCard'

type Status = 'idle' | 'sending' | 'done' | 'error'

// Alerta de preço na página de produto — "defina quanto quer pagar". Recolhido
// por padrão (só título + seta) pra não empurrar o gráfico de histórico no
// mobile; expande no clique. Mostra economia esperada e sugestões rápidas
// (tudo calculado do preço atual — nada de dado inventado). Favorita o produto
// junto, pra o acompanhamento também aparecer nos Favoritos.
export function PriceTargetForm({ product }: { product: FavoriteItem }) {
  const { isFavorite, toggle } = useFavorites()
  const current = product.searchPrice
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [target, setTarget] = useState(current != null ? String(Math.round(current * 0.9)) : '')
  const [status, setStatus] = useState<Status>('idle')

  if (!NEWSLETTER_CONFIGURED || current == null) return null

  const parsed = parseFloat(target.replace(/[^\d,]/g, '').replace(',', '.'))
  const targetPrice = Number.isFinite(parsed) && parsed > 0 && parsed < current ? parsed : null
  const savings = targetPrice != null ? current - targetPrice : null
  const chips = [5, 10, 15].map((pct) => ({ pct, value: Math.round(current * (1 - pct / 100)) }))

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
        <Check size={18} aria-hidden="true" />
        {targetPrice != null
          ? ` Alerta ativado! Avisamos quando chegar a ${formatPrice(targetPrice, product.currency)} (ou baixar antes).`
          : ' Alerta ativado! Avisamos quando este produto baixar de preço.'}
      </div>
    )
  }

  return (
    <div className={`price-target${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="price-target__toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="price-target__badge" aria-hidden="true">
          <Bell size={18} />
        </span>
        <span className="price-target__title">
          <strong>Defina quanto quer pagar</strong>
          <span>A gente avisa quando o preço chegar no valor que você escolher.</span>
          <span className="price-target__current">Preço atual: {formatPrice(current, product.currency)}</span>
        </span>
        <ChevronDown size={20} className="price-target__chevron" aria-hidden="true" />
      </button>

      {open && (
        <form className="price-target__body" onSubmit={submit}>
          <div className="price-target__target-row">
            <label className="price-target__field">
              <span>Me avise quando chegar a</span>
              <span className="price-target__price-input">
                <em>R$</em>
                <input
                  inputMode="decimal"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  aria-label="Preço desejado"
                />
              </span>
            </label>
            {savings != null && savings > 0 && (
              <span className="price-target__savings">
                Economia esperada: {formatPrice(savings, product.currency)}
              </span>
            )}
          </div>

          <div className="price-target__chips">
            <span className="price-target__chips-label">Sugestões rápidas:</span>
            {chips.map((c) => (
              <button
                key={c.pct}
                type="button"
                className="price-target__chip"
                onClick={() => setTarget(String(c.value))}
              >
                {formatPrice(c.value, product.currency)} (-{c.pct}%)
              </button>
            ))}
          </div>

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
            <Bell size={16} aria-hidden="true" /> {status === 'sending' ? 'Enviando...' : 'Ativar alerta de preço'}
          </button>

          <label className="price-target__consent">
            <input type="checkbox" required /> Aceito a <Link to="/privacidade">Política de Privacidade</Link>
          </label>

          <div className="price-target__trust">
            <span>
              <Check size={13} aria-hidden="true" /> Avisamos ao atingir seu preço
            </span>
            <span>
              <TrendingDown size={13} aria-hidden="true" /> Histórico monitorado
            </span>
            <span>
              <ShieldCheck size={13} aria-hidden="true" /> Sem spam · cancele fácil
            </span>
          </div>

          {status === 'error' && <p className="price-target__error">Não foi possível ativar. Tente de novo.</p>}
        </form>
      )}
    </div>
  )
}
