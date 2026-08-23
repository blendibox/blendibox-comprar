import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Check, Heart, Mail, ShieldCheck } from './Icon'
import { NEWSLETTER_CONFIGURED, NEWSLETTER_WORKER_URL } from '../config/newsletter'
import { useFavorites, type FavoriteItem } from '../context/FavoritesContext'

const DISMISSED_KEY = 'compare-ofertas:pricedrop-dismissed'
const DONE_KEY = 'compare-ofertas:pricedrop-done'

type Status = 'idle' | 'sending' | 'done' | 'error'
// price = preço no momento em que a pessoa começou a acompanhar (baseline). O
// worker só avisa quando o preço cair ABAIXO disso — não pra um desconto que
// já existia antes de ela favoritar.
type WatchItem = { merchantSlug: string; slug: string; price?: number | null }

// Barra fixa no rodapé pra "avise-me quando baixar de preço".
// - Em Favoritos: monitora todos os favoritos (passa `items`).
// - Na página de produto: passa `product` — o botão favorita ESTE produto e
//   já ativa o monitoramento dele, num clique (quem chega buscando um produto
//   específico quer acompanhar o preço dele).
// Some sozinha se já foi fechada ou já assinou. O ícone de coração deixa claro
// que o aviso é sobre favoritos. Enquanto visível, esconde o FAB da roleta de
// cupons (classe no body) pra não colidir; some a barra, o FAB volta.
export function PriceDropWatchForm({ items, product }: { items?: WatchItem[]; product?: FavoriteItem }) {
  const { isFavorite, toggle } = useFavorites()
  const [visible, setVisible] = useState(true)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISSED_KEY) || localStorage.getItem(DONE_KEY)) setVisible(false)
    } catch {
      // localStorage indisponível — mantém visível
    }
  }, [])

  const watchItems: WatchItem[] = product
    ? [{ merchantSlug: product.merchantSlug, slug: product.slug, price: product.searchPrice }]
    : items ?? []
  const shown = NEWSLETTER_CONFIGURED && watchItems.length > 0 && visible

  // Reserva no rodapé a altura real da barra (pra não cobrir o footer) e marca
  // o body pra esconder o FAB da roleta enquanto a barra estiver visível.
  useEffect(() => {
    if (!shown) {
      document.body.style.paddingBottom = ''
      document.body.classList.remove('has-fixed-bottombar')
      return
    }
    const apply = () => {
      document.body.style.paddingBottom = `${barRef.current?.offsetHeight ?? 0}px`
    }
    apply()
    document.body.classList.add('has-fixed-bottombar')
    window.addEventListener('resize', apply)
    return () => {
      window.removeEventListener('resize', apply)
      document.body.style.paddingBottom = ''
      document.body.classList.remove('has-fixed-bottombar')
    }
  }, [shown, status, watchItems.length])

  if (!shown) return null

  const productMode = !!product
  const count = watchItems.length
  const plural = count === 1 ? 'favorito' : 'favoritos'

  const dismiss = () => {
    setVisible(false)
    try {
      localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // segue sem persistir
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    try {
      // Modo produto: garante que ele entre nos favoritos junto do aviso.
      if (product && !isFavorite(product.merchantSlug, product.slug)) toggle(product)
      const res = await fetch(`${NEWSLETTER_WORKER_URL}/watch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, items: watchItems, subscribeNewsletter: false }),
      })
      if (res.ok) {
        setStatus('done')
        try {
          localStorage.setItem(DONE_KEY, '1')
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
      <div className="pricedrop-bar pricedrop-bar--done" ref={barRef}>
        <span className="pricedrop-bar__pitch">
          <Check size={18} aria-hidden="true" /> Prontinho! Avisamos por e-mail quando o preço baixar.
        </span>
        <button type="button" className="pricedrop-bar__close" onClick={dismiss} aria-label="Fechar">
          {'×'}
        </button>
      </div>
    )
  }

  return (
    <div className="pricedrop-bar" ref={barRef}>
      <span className="pricedrop-bar__badge" aria-hidden="true">
        <Heart size={22} fill="currentColor" />
      </span>
      <div className="pricedrop-bar__text">
        <strong>{productMode ? 'Acompanhe o preço deste produto' : 'Ative seu radar de preços'}</strong>
        <span>
          {productMode
            ? 'A gente favorita pra você e manda um e-mail quando ele baixar de preço.'
            : `Você salvou ${count} ${plural}. A gente te avisa quando algum ficar mais barato.`}
        </span>
      </div>
      <form className="pricedrop-bar__form" onSubmit={handleSubmit}>
        <div className="pricedrop-bar__field">
          <Mail size={16} aria-hidden="true" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Seu melhor e-mail"
            required
            aria-label="Seu e-mail"
            className="pricedrop-bar__input"
          />
        </div>
        <button type="submit" className="pricedrop-bar__submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Enviando...' : productMode ? 'Favoritar e acompanhar' : 'Ativar meu radar'}
        </button>
        <div className="pricedrop-bar__meta">
          <span className="pricedrop-bar__trust">
            <ShieldCheck size={13} aria-hidden="true" />{' '}
            {productMode
              ? 'Sem spam · cancele quando quiser'
              : `${count} ${plural} monitorado${count === 1 ? '' : 's'} · sem spam`}
          </span>
          <label className="pricedrop-bar__consent">
            <input type="checkbox" required />
            {' Aceito a '}
            <Link to="/privacidade">Política de Privacidade</Link>
          </label>
          {status === 'error' && <span className="pricedrop-bar__error">Erro, tente de novo.</span>}
        </div>
      </form>
      <button type="button" className="pricedrop-bar__close" onClick={dismiss} aria-label="Fechar">
        {'×'}
      </button>
    </div>
  )
}
