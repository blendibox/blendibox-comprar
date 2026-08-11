import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronLeft, ChevronRight, Copy, Gift, Heart, Mail, Search, Share2 } from 'lucide-react'

// Passo a passo interativo da Lista de Presentes. Telas "mock" feitas em
// CSS/JSX (sem prints) pra não envelhecer quando a UI mudar — é só editar aqui.
const STEPS = [
  {
    title: 'Crie sua lista',
    text: 'Dê um título, escolha a ocasião e informe seu e-mail. É de graça e sem criar conta — o e-mail é só pra você gerenciar a lista e receber os avisos de compra.',
  },
  {
    title: 'Adicione os presentes',
    text: 'Busque produtos de qualquer loja parceira ou carregue seus favoritos direto na lista. Dá pra pedir quantidade — ex.: 3 pacotes de fralda.',
  },
  {
    title: 'Compartilhe o link',
    text: 'Você recebe um link curto e amigável. Mande pros convidados por WhatsApp, Instagram, e-mail — onde quiser.',
  },
  {
    title: 'Os convidados escolhem',
    text: 'Cada convidado abre a lista, escolhe um presente e compra direto no site da loja parceira, com a segurança dela. Você não processa pagamento nenhum.',
  },
  {
    title: 'Compra confirmada, sem repetição',
    text: 'Quando a loja confirma a compra, o presente sai da lista e você recebe um aviso por e-mail. Assim ninguém dá presente repetido.',
  },
]

const AUTO_MS = 4800

function Screen({ step }: { step: number }) {
  if (step === 0) {
    return (
      <div className="wt-mock wt-mock--form">
        <div className="wt-mock__title"><Gift size={16} /> Crie sua lista de presentes</div>
        <label className="wt-field"><span>Título</span><div className="wt-input">Casamento da Ana e do João</div></label>
        <div className="wt-field-row">
          <label className="wt-field"><span>Ocasião</span><div className="wt-input">Casamento ▾</div></label>
          <label className="wt-field"><span>Data</span><div className="wt-input">12/10/2026</div></label>
        </div>
        <label className="wt-field"><span>E-mail do responsável</span><div className="wt-input">ana@email.com</div></label>
        <div className="wt-btn wt-btn--primary">Criar lista</div>
      </div>
    )
  }
  if (step === 1) {
    return (
      <div className="wt-mock">
        <div className="wt-searchbar"><Search size={15} /> jogo de panelas</div>
        <div className="wt-row">
          <span className="wt-thumb" />
          <div className="wt-row__body"><b>Jogo de Panelas Antiaderente 5pç</b><small>Tramontina</small></div>
          <span className="wt-btn wt-btn--sm">Adicionar</span>
        </div>
        <div className="wt-row">
          <span className="wt-thumb" />
          <div className="wt-row__body"><b>Air Fryer Digital 5L</b><small>Panasonic</small></div>
          <span className="wt-btn wt-btn--sm">Adicionar</span>
        </div>
        <div className="wt-fav"><Heart size={14} /> Carregar meus favoritos (8)</div>
      </div>
    )
  }
  if (step === 2) {
    return (
      <div className="wt-mock wt-mock--share">
        <div className="wt-mock__title"><Share2 size={16} /> Link pra compartilhar</div>
        <div className="wt-share">
          <span className="wt-share__url">comprar.blendibox.com.br/lista/<b>ana-e-joao</b></span>
          <span className="wt-btn wt-btn--sm"><Copy size={13} /> Copiar</span>
        </div>
        <div className="wt-chips">
          <span className="wt-chip wt-chip--wa">WhatsApp</span>
          <span className="wt-chip">Instagram</span>
          <span className="wt-chip">E-mail</span>
        </div>
      </div>
    )
  }
  if (step === 3) {
    return (
      <div className="wt-mock">
        <div className="wt-mock__title"><Gift size={16} /> Casamento da Ana e do João</div>
        <div className="wt-row">
          <span className="wt-thumb" />
          <div className="wt-row__body"><b>Jogo de Panelas 5pç</b><small>Tramontina · R$ 389,90</small></div>
          <span className="wt-btn wt-btn--sm wt-btn--pink">Presentear</span>
        </div>
        <div className="wt-row">
          <span className="wt-thumb" />
          <div className="wt-row__body"><b>Air Fryer Digital 5L</b><small>Panasonic · R$ 449,00</small></div>
          <span className="wt-btn wt-btn--sm wt-btn--pink">Presentear</span>
        </div>
      </div>
    )
  }
  return (
    <div className="wt-mock">
      <div className="wt-mock__title"><Gift size={16} /> Casamento da Ana e do João</div>
      <div className="wt-row wt-row--done">
        <span className="wt-thumb" />
        <div className="wt-row__body"><b>Jogo de Panelas 5pç</b><small>Tramontina</small></div>
        <span className="wt-badge wt-badge--bought"><Check size={12} /> Comprado</span>
      </div>
      <div className="wt-row">
        <span className="wt-thumb" />
        <div className="wt-row__body"><b>Air Fryer Digital 5L</b><small>Panasonic</small></div>
        <span className="wt-badge wt-badge--available">Disponível</span>
      </div>
      <div className="wt-toast"><Mail size={15} /> Você recebeu um presente! 🎁</div>
    </div>
  )
}

export function WalkthroughPage() {
  const [active, setActive] = useState(0)
  const [auto, setAuto] = useState(true)
  const [hover, setHover] = useState(false)

  useEffect(() => {
    if (!auto || hover) return
    const t = setTimeout(() => setActive((a) => (a + 1) % STEPS.length), AUTO_MS)
    return () => clearTimeout(t)
  }, [active, auto, hover])

  const go = (i: number) => {
    setAuto(false)
    setActive((i + STEPS.length) % STEPS.length)
  }

  return (
    <div className="page walkthrough">
      <header className="walkthrough__hero">
        <h1>Como funciona a lista de presentes</h1>
        <p>Um passo a passo rápido — do "criar" ao "presente comprado", sem repetição.</p>
      </header>

      <div
        className="walkthrough__stage"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <ol className="walkthrough__steps">
          {STEPS.map((s, i) => (
            <li key={s.title} className={`walkthrough__step ${i === active ? 'is-active' : i < active ? 'is-done' : ''}`}>
              <button type="button" onClick={() => go(i)}>
                <span className="walkthrough__num">{i < active ? <Check size={14} /> : i + 1}</span>
                <span className="walkthrough__step-body">
                  <strong>{s.title}</strong>
                  <span>{s.text}</span>
                </span>
              </button>
              {i === active && (
                <span className="walkthrough__progress" aria-hidden="true">
                  <span
                    key={`${active}-${auto}-${hover}`}
                    className="walkthrough__progress-fill"
                    style={{ animationPlayState: auto && !hover ? 'running' : 'paused' }}
                  />
                </span>
              )}
            </li>
          ))}
        </ol>

        <div className="walkthrough__screen">
          <div className="walkthrough__frame">
            <div className="walkthrough__frame-bar">
              <span /><span /><span />
            </div>
            <div key={active} className="walkthrough__frame-body">
              <Screen step={active} />
            </div>
          </div>
          <div className="walkthrough__controls">
            <button type="button" onClick={() => go(active - 1)} aria-label="Anterior"><ChevronLeft size={18} /></button>
            <div className="walkthrough__dots">
              {STEPS.map((s, i) => (
                <button
                  key={s.title}
                  type="button"
                  className={i === active ? 'is-active' : ''}
                  onClick={() => go(i)}
                  aria-label={`Passo ${i + 1}`}
                />
              ))}
            </div>
            <button type="button" onClick={() => go(active + 1)} aria-label="Próximo"><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>

      <section className="walkthrough__cta">
        <h2>Pronto pra montar a sua?</h2>
        <Link to="/listas/nova" className="registry-landing__button">Criar minha lista grátis →</Link>
      </section>
    </div>
  )
}
