import { useEffect, useState, type ComponentType } from 'react'
import { Link } from '../components/Link'
import { Bell, Check, ChevronLeft, ChevronRight, Copy, Gift, Heart, Mail, Search, Share2, Tag, TrendingDown } from '../components/Icon'

type IconComponent = ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>

// Passo a passo interativo do site. Telas "mock" em CSS/JSX (sem prints que
// envelhecem). Um seletor de tópico dirige o mesmo carrossel — evita empilhar
// vários carrosséis e mantém tudo num layout só. Toda descrição reflete o
// comportamento real das features (nada inventado).

// ---- Telas mock por tópico ----
function ScreenLista({ step }: { step: number }) {
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
        <div className="wt-searchbar"><Search size={15} /> buscar presente</div>
        <div className="wt-row">
          <span className="wt-thumb" />
          <div className="wt-row__body"><b>Air Fryer Digital 5L</b><small>Panasonic</small></div>
          <span className="wt-btn wt-btn--sm">Adicionar</span>
        </div>
        <div className="wt-row">
          <span className="wt-thumb" />
          <div className="wt-row__body"><b>Smart TV 50"</b><small>LG</small></div>
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
          <div className="wt-row__body"><b>Air Fryer Digital 5L</b><small>Panasonic · R$ 449,00</small></div>
          <span className="wt-btn wt-btn--sm wt-btn--pink">Presentear</span>
        </div>
        <div className="wt-row">
          <span className="wt-thumb" />
          <div className="wt-row__body"><b>Smart TV 50"</b><small>LG · R$ 2.199,00</small></div>
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
        <div className="wt-row__body"><b>Air Fryer Digital 5L</b><small>Panasonic</small></div>
        <span className="wt-badge wt-badge--bought"><Check size={12} /> Comprado</span>
      </div>
      <div className="wt-row">
        <span className="wt-thumb" />
        <div className="wt-row__body"><b>Smart TV 50"</b><small>LG</small></div>
        <span className="wt-badge wt-badge--available">Disponível</span>
      </div>
      <div className="wt-toast"><Mail size={15} /> Você recebeu um presente! 🎁</div>
    </div>
  )
}

function ScreenNews({ step }: { step: number }) {
  if (step === 0) {
    return (
      <div className="wt-mock wt-mock--form">
        <div className="wt-mock__title"><Mail size={16} /> Receba cupons por e-mail</div>
        <label className="wt-field"><span>Seu e-mail</span><div className="wt-input">voce@email.com</div></label>
        <label className="wt-check"><span className="wt-check__box"><Check size={12} /></span> Aceito receber e-mails e a Política de Privacidade</label>
        <div className="wt-btn wt-btn--primary">Cadastrar</div>
      </div>
    )
  }
  if (step === 1) {
    return (
      <div className="wt-mock wt-email">
        <div className="wt-email__from"><span className="wt-email__avatar"><Mail size={14} /></span> Compare Ofertas</div>
        <div className="wt-email__subj">Inscrição confirmada ✓</div>
        <p className="wt-email__body">Boas-vindas! Você está na lista. A partir de agora recebe cupons e as melhores ofertas da semana.</p>
      </div>
    )
  }
  if (step === 2) {
    return (
      <div className="wt-mock wt-email">
        <div className="wt-email__from"><span className="wt-email__avatar"><Tag size={14} /></span> Resumo da semana</div>
        <div className="wt-email__subj">As maiores quedas de preço 📉</div>
        <div className="wt-row">
          <span className="wt-thumb" />
          <div className="wt-row__body"><b>Tênis Corrida</b><small>Nike</small></div>
          <span className="wt-price"><s>R$ 499</s> <b>R$ 379</b></span>
        </div>
        <div className="wt-row">
          <span className="wt-thumb" />
          <div className="wt-row__body"><b>Perfume 100ml</b><small>O Boticário</small></div>
          <span className="wt-price"><s>R$ 219</s> <b>R$ 169</b></span>
        </div>
      </div>
    )
  }
  return (
    <div className="wt-mock wt-email">
      <div className="wt-email__from"><span className="wt-email__avatar"><Mail size={14} /></span> Compare Ofertas</div>
      <p className="wt-email__body">Não quer mais receber? É um clique — todo e-mail tem o link de descadastro no rodapé.</p>
      <div className="wt-email__foot">Cancelar inscrição</div>
    </div>
  )
}

function ScreenDrop({ step }: { step: number }) {
  if (step === 0) {
    return (
      <div className="wt-mock">
        <div className="wt-card">
          <span className="wt-card__heart"><Heart size={16} fill="currentColor" /></span>
          <span className="wt-thumb wt-thumb--lg" />
          <b>Tênis de Corrida Wave</b>
          <small>Mizuno</small>
          <span className="wt-card__price">R$ 499,90</span>
        </div>
        <div className="wt-note"><Heart size={13} fill="currentColor" /> Salvo nos favoritos (no seu navegador)</div>
      </div>
    )
  }
  if (step === 1) {
    return (
      <div className="wt-mock wt-mock--form">
        <div className="wt-mock__title"><Bell size={16} /> Avise-me quando baixar de preço</div>
        <label className="wt-field"><span>Seu e-mail</span><div className="wt-input">voce@email.com</div></label>
        <label className="wt-check"><span className="wt-check__box"><Check size={12} /></span> Aceito receber esse aviso e a Política de Privacidade</label>
        <label className="wt-check wt-check--off"><span className="wt-check__box" /> Também quero o resumo semanal (opcional)</label>
        <div className="wt-btn wt-btn--primary">Avisar quando baixar</div>
      </div>
    )
  }
  if (step === 2) {
    return (
      <div className="wt-mock wt-watch">
        <div className="wt-mock__title"><TrendingDown size={16} /> Preço acompanhado todo dia</div>
        <svg className="wt-spark" viewBox="0 0 220 70" preserveAspectRatio="none" aria-hidden="true">
          <polyline points="0,20 40,24 80,18 120,30 160,34 220,52" fill="none" stroke="var(--color-green)" strokeWidth="3" />
        </svg>
        <div className="wt-note"><TrendingDown size={13} /> Conferido junto com a reconstrução diária do catálogo</div>
      </div>
    )
  }
  return (
    <div className="wt-mock wt-email">
      <div className="wt-email__from"><span className="wt-email__avatar"><TrendingDown size={14} /></span> Compare Ofertas</div>
      <div className="wt-email__subj">Baixou de preço! 📉</div>
      <div className="wt-row">
        <span className="wt-thumb" />
        <div className="wt-row__body"><b>Tênis de Corrida Wave</b><small>Mizuno</small></div>
        <span className="wt-price"><s>R$ 499</s> <b>R$ 399</b></span>
      </div>
      <div className="wt-btn wt-btn--sm wt-btn--pink" style={{ alignSelf: 'flex-start' }}>Ver oferta</div>
    </div>
  )
}

type Topic = {
  id: string
  label: string
  Icon: IconComponent
  cta: { to: string; label: string }
  steps: { title: string; text: string }[]
  Screen: ComponentType<{ step: number }>
}

const TOPICS: Topic[] = [
  {
    id: 'lista',
    label: 'Lista de presentes',
    Icon: Gift,
    cta: { to: '/listas/nova', label: 'Criar minha lista grátis →' },
    Screen: ScreenLista,
    steps: [
      { title: 'Crie sua lista', text: 'Dê um título, escolha a ocasião e informe seu e-mail. É de graça e sem criar conta — o e-mail é só pra você gerenciar a lista e receber os avisos de compra.' },
      { title: 'Adicione os presentes', text: 'Busque produtos de qualquer loja parceira ou carregue seus favoritos direto na lista. Dá pra pedir quantidade — ex.: 3 pacotes de fralda.' },
      { title: 'Compartilhe o link', text: 'Você recebe um link curto e amigável. Mande pros convidados por WhatsApp, Instagram, e-mail — onde quiser.' },
      { title: 'Os convidados escolhem', text: 'Cada convidado abre a lista, escolhe um presente e compra direto no site da loja parceira, com a segurança dela. Você não processa pagamento nenhum.' },
      { title: 'Compra confirmada, sem repetição', text: 'Quando a loja confirma a compra, o presente sai da lista e você recebe um aviso por e-mail. Assim ninguém dá presente repetido.' },
    ],
  },
  {
    id: 'newsletter',
    label: 'Newsletter',
    Icon: Mail,
    cta: { to: '/', label: 'Ver ofertas e assinar →' },
    Screen: ScreenNews,
    steps: [
      { title: 'Assine com seu e-mail', text: 'No rodapé de qualquer página, coloque seu e-mail e marque o consentimento (LGPD). Sem criar conta.' },
      { title: 'Confirmação de boas-vindas', text: 'Você recebe um e-mail confirmando a inscrição. Pronto — já está na lista.' },
      { title: 'Resumo semanal de ofertas', text: 'Toda semana enviamos um resumo com cupons e as maiores quedas de preço das lojas parceiras.' },
      { title: 'Cancele quando quiser', text: 'Todo e-mail tem link de descadastro no rodapé — é um clique pra sair, sem precisar falar com ninguém.' },
    ],
  },
  {
    id: 'precos',
    label: 'Alerta de preço',
    Icon: Bell,
    cta: { to: '/favoritos', label: 'Ir pros meus favoritos →' },
    Screen: ScreenDrop,
    steps: [
      { title: 'Favorite os produtos', text: 'Clique no coração de qualquer produto na listagem. Ele fica salvo em Favoritos, no seu próprio navegador — sem login.' },
      { title: 'Ative o alerta com seu e-mail', text: 'Na página Favoritos, deixe seu e-mail em "Avise-me quando baixar de preço" e aceite o consentimento. O resumo semanal é opcional e à parte.' },
      { title: 'A gente monitora todo dia', text: 'O preço dos seus favoritos é conferido diariamente, junto com a reconstrução do catálogo.' },
      { title: 'Caiu? Você recebe o e-mail', text: 'Quando há uma queda de preço real, chega um aviso por e-mail (único por queda, sem virar spam) com o novo valor e o link da oferta.' },
    ],
  },
]

const AUTO_MS = 4800

export function WalkthroughPage() {
  const [topicIdx, setTopicIdx] = useState(0)
  const [active, setActive] = useState(0)
  const [auto, setAuto] = useState(true)
  const [hover, setHover] = useState(false)

  const topic = TOPICS[topicIdx]
  const total = topic.steps.length

  useEffect(() => {
    if (!auto || hover) return
    const t = setTimeout(() => setActive((a) => (a + 1) % total), AUTO_MS)
    return () => clearTimeout(t)
  }, [active, auto, hover, total])

  const go = (i: number) => {
    setAuto(false)
    setActive((i + total) % total)
  }

  const selectTopic = (i: number) => {
    setTopicIdx(i)
    setActive(0)
    setAuto(true)
  }

  const Screen = topic.Screen

  return (
    <div className="page walkthrough">
      <header className="walkthrough__hero">
        <h1>Como funciona o Compare Ofertas</h1>
        <p>Escolha um tema e veja o passo a passo — da lista de presentes aos avisos por e-mail.</p>
      </header>

      <div className="wt-tabs" role="tablist" aria-label="Temas">
        {TOPICS.map((t, i) => {
          const TabIcon = t.Icon
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={i === topicIdx}
              className={`wt-tab ${i === topicIdx ? 'is-active' : ''}`}
              onClick={() => selectTopic(i)}
            >
              <TabIcon size={16} aria-hidden={true} />
              {t.label}
            </button>
          )
        })}
      </div>

      <div
        className="wt-carousel"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <div key={`${topicIdx}-${active}`} className="wt-slide">
          <div className="walkthrough__frame">
            <div className="walkthrough__frame-bar">
              <span /><span /><span />
            </div>
            <div className="walkthrough__frame-body">
              <Screen step={active} />
            </div>
          </div>

          <div className="wt-slide__caption">
            <span className="wt-slide__badge">
              <span className="wt-slide__num">{active + 1}</span>
              Passo {active + 1} de {total}
            </span>
            <h2>{topic.steps[active].title}</h2>
            <p>{topic.steps[active].text}</p>
            <span className="wt-slide__progress" aria-hidden="true">
              <span
                key={`${topicIdx}-${active}-${auto}-${hover}`}
                className="walkthrough__progress-fill"
                style={{ animationPlayState: auto && !hover ? 'running' : 'paused' }}
              />
            </span>
          </div>
        </div>

        <div className="walkthrough__controls">
          <button type="button" onClick={() => go(active - 1)} aria-label="Anterior"><ChevronLeft size={18} /></button>
          <div className="walkthrough__dots">
            {topic.steps.map((s, i) => (
              <button
                key={s.title}
                type="button"
                className={i === active ? 'is-active' : ''}
                onClick={() => go(i)}
                aria-label={`Passo ${i + 1}: ${s.title}`}
              />
            ))}
          </div>
          <button type="button" onClick={() => go(active + 1)} aria-label="Próximo"><ChevronRight size={18} /></button>
        </div>
      </div>

      <section className="walkthrough__cta">
        <h2>Pronto pra começar?</h2>
        <Link to={topic.cta.to} className="registry-landing__button">{topic.cta.label}</Link>
      </section>
    </div>
  )
}
