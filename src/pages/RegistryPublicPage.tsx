import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { Check, Gift, Lock } from 'lucide-react'
import { formatPrice } from '../components/ProductCard'
import {
  getGuestToken,
  getRegistry,
  recordInterest,
  registerGuest,
  saveGuestToken,
  type RegistryData,
} from '../lib/registry'

const EVENT_LABEL: Record<string, string> = {
  casamento: 'Lista de casamento',
  aniversario: 'Lista de aniversário',
  cha: 'Chá',
  outro: 'Lista de presentes',
}

export function RegistryPublicPage() {
  const { id = '' } = useParams()
  const [data, setData] = useState<RegistryData | null>(null)
  const [loadError, setLoadError] = useState('')
  const [accessToken, setAccessToken] = useState<string | null>(() => getGuestToken(id))
  const [gifting, setGifting] = useState('')

  const reload = () => getRegistry(id).then(setData).catch((e) => setLoadError(e.message))

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const gift = async (itemId: string) => {
    setGifting(itemId)
    try {
      const { deeplink } = await recordInterest(id, itemId, accessToken || undefined)
      // Redireciona pra loja pelo deeplink de afiliado (já com o clickref).
      window.location.href = deeplink
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao registrar')
      setGifting('')
    }
  }

  if (loadError) return <div className="page"><p className="status status--error">{loadError}</p></div>
  if (!data) return <div className="page"><p className="status">Carregando...</p></div>

  // Portão: convidado precisa se cadastrar (e-mail + consentimento) pra ver.
  if (!accessToken) {
    return <GuestGate id={id} title={data.registry.title} onDone={(t) => { saveGuestToken(id, t); setAccessToken(t); reload() }} />
  }

  const available = data.items.filter((i) => i.status !== 'comprado').length

  return (
    <div className="page registry-page">
      <header className="registry-hero">
        <Gift className="registry-hero__icon" size={26} aria-hidden="true" />
        <span className="registry-hero__kicker">{EVENT_LABEL[data.registry.eventType] || 'Lista de presentes'}</span>
        <h1>{data.registry.title}</h1>
        <p>
          {available > 0
            ? `${available} ${available === 1 ? 'presente disponível' : 'presentes disponíveis'}. Escolha um pra presentear — você compra direto na loja parceira.`
            : 'Todos os presentes já foram comprados 🎉'}
        </p>
      </header>

      <div className="registry-grid">
        {data.items.map((it) => {
          const bought = it.status === 'comprado'
          return (
            <div key={it.id} className={`registry-card${bought ? ' registry-card--bought' : ''}`}>
              {it.image && <img className="registry-card__image" src={it.image} alt="" loading="lazy" />}
              <div className="registry-card__body">
                <span className="registry-card__name">{it.name}</span>
                <span className="registry-card__price">{formatPrice(it.price, 'BRL')}</span>
                {bought ? (
                  <span className="registry-card__status registry-card__status--bought">
                    <Check size={15} /> Já comprado
                  </span>
                ) : (
                  <>
                    {it.status === 'interesse' && (
                      <span className="registry-card__hint">Alguém já demonstrou interesse — confirme antes de comprar.</span>
                    )}
                    <button
                      type="button"
                      className="registry-card__gift"
                      onClick={() => gift(it.id)}
                      disabled={gifting === it.id}
                    >
                      {gifting === it.id ? 'Abrindo a loja...' : 'Presentear'}
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="registry-form__note">
        O item só é marcado como <strong>comprado</strong> quando a loja confirma o pedido — não no clique. Assim
        ninguém dá presente repetido por engano.
      </p>
    </div>
  )
}

function GuestGate({ id, title, onDone }: { id: string; title: string; onDone: (token: string) => void }) {
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [subscribe, setSubscribe] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle')
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    setError('')
    try {
      const { accessToken } = await registerGuest(id, { email: email.trim(), consent, subscribeNewsletter: subscribe })
      onDone(accessToken)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao acessar')
      setStatus('error')
    }
  }

  return (
    <div className="page registry-page registry-page--narrow">
      <header className="registry-hero">
        <Lock className="registry-hero__icon" size={26} aria-hidden="true" />
        <h1>{title}</h1>
        <p>Entre com seu e-mail pra acessar a lista de presentes.</p>
      </header>
      <form className="registry-form" onSubmit={submit}>
        <label className="registry-form__field">
          <span>Seu e-mail</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="seu@email.com" />
        </label>
        <label className="registry-form__check">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
          <span>Aceito que meu e-mail seja usado pra acessar e gerenciar minha participação nesta lista.</span>
        </label>
        <label className="registry-form__check">
          <input type="checkbox" checked={subscribe} onChange={(e) => setSubscribe(e.target.checked)} />
          <span>Quero receber ofertas e cupons do Compare Ofertas por e-mail (opcional).</span>
        </label>
        {error && <p className="status status--error">{error}</p>}
        <button type="submit" className="registry-form__submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Entrando...' : 'Acessar a lista'}
        </button>
      </form>
    </div>
  )
}
