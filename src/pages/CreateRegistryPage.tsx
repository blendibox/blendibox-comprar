import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Gift } from 'lucide-react'
import { addMyList, createRegistry, saveOwnerToken, type RegistryEventType } from '../lib/registry'

const EVENT_OPTIONS: { value: RegistryEventType; label: string }[] = [
  { value: 'casamento', label: 'Casamento' },
  { value: 'cha-bebe', label: 'Chá de bebê' },
  { value: 'cha-casa', label: 'Chá de panela / casa nova' },
  { value: 'aniversario', label: 'Aniversário' },
  { value: 'mesversario', label: 'Mêsversário' },
  { value: 'quinze-anos', label: '15 anos (debutante)' },
  { value: 'pet', label: 'Aniversário do pet' },
  { value: 'formatura', label: 'Formatura / bodas' },
  { value: 'outro', label: 'Outro' },
]

export function CreateRegistryPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [eventType, setEventType] = useState<RegistryEventType>('casamento')
  const [eventDate, setEventDate] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [customId, setCustomId] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle')
  const [error, setError] = useState('')

  // Prévia do endereço (mesma lógica de slug do worker) — só pra mostrar como
  // vai ficar a URL enquanto digita.
  const slugPreview = customId
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    setError('')
    try {
      const { id, editToken } = await createRegistry({
        title: title.trim(),
        eventType,
        eventDate: eventDate || undefined,
        ownerEmail: ownerEmail.trim(),
        customId: customId.trim() || undefined,
      })
      saveOwnerToken(id, editToken)
      addMyList({ id, editToken, title: title.trim() })
      navigate(`/lista/${id}/editar?token=${editToken}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar a lista')
      setStatus('error')
    }
  }

  return (
    <div className="page registry-page registry-page--narrow">
      <header className="registry-hero">
        <Gift className="registry-hero__icon" size={28} aria-hidden="true" />
        <h1>Crie sua lista de presentes</h1>
        <p>Monte a lista com produtos das lojas parceiras e compartilhe o link. Os convidados marcam o que já compraram — ninguém repete presente.</p>
      </header>

      <form className="registry-form" onSubmit={submit}>
        <label className="registry-form__field">
          <span>Título da lista</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Casamento da Ana e do João"
            required
            maxLength={120}
          />
        </label>

        <div className="registry-form__row">
          <label className="registry-form__field">
            <span>Tipo</span>
            <select value={eventType} onChange={(e) => setEventType(e.target.value as RegistryEventType)}>
              {EVENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="registry-form__field">
            <span>Data do evento (opcional)</span>
            <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </label>
        </div>

        <label className="registry-form__field">
          <span>Seu e-mail</span>
          <input
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            placeholder="Pra você gerenciar a lista"
            required
          />
        </label>

        <label className="registry-form__field">
          <span>Endereço da lista (opcional)</span>
          <input
            type="text"
            value={customId}
            onChange={(e) => setCustomId(e.target.value)}
            placeholder="ex.: ana-e-joao"
            maxLength={60}
          />
          <small className="registry-form__addr">
            comprar.blendibox.com.br/lista/<strong>{slugPreview || 'gerado-do-título'}</strong>
          </small>
        </label>

        {error && <p className="status status--error">{error}</p>}

        <button type="submit" className="registry-form__submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Criando...' : 'Criar lista'}
        </button>
        <p className="registry-form__note">
          Ao criar, você aceita a nossa <Link to="/privacidade">Política de Privacidade</Link>. Guardamos seu e-mail só
          pra você gerenciar a lista.
        </p>
      </form>
    </div>
  )
}
