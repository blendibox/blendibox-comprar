import { useState } from 'react'
import { Link } from './Link'
import { Clock, Gift, HelpCircle, Heart, ShoppingBag, Tag, Bell, Vote, ShieldCheck, Sparkles } from './Icon'
import { ShareBar } from './ShareBar'
import type { QuizIcon, QuizPersonality } from '../types/quiz'

const HEADER_ICONS: Record<QuizIcon, typeof Vote> = { Vote, Gift, Bell, Heart, Tag, ShoppingBag }

interface QuizPersonalidadeProps {
  eyebrow: string
  title: string
  subtitle: string
  qualityBadge: string
  icon: QuizIcon
  footnote?: string
  personality: QuizPersonality
  url: string
}

// Quiz de perfil: sem resposta certa. Cada opção soma pontos pra um ou mais
// perfis; o resultado é o perfil com mais pontos (empate: o primeiro de
// `results`). Mostra também a mistura de perfis (percentual de pontos), que é o
// que dá graça de comparar com amigos. O link compartilhado leva a pessoa a
// FAZER o quiz (a URL canônica, igual ao Verdadeiro/Falso) — o resultado de
// quem já jogou vai só no texto da mensagem, nunca na URL, pra não divergir do
// HTML pré-renderizado.
export function QuizPersonalidade({ eyebrow, title, subtitle, qualityBadge, icon, footnote, personality, url }: QuizPersonalidadeProps) {
  const { questions, results } = personality
  const total = questions.length
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(() => new Array(total).fill(null))
  const [finished, setFinished] = useState(false)

  const HeaderIcon = HEADER_ICONS[icon]
  const q = questions[current]
  const selected = answers[current]
  const isLast = current === total - 1
  const answeredCount = answers.filter((a) => a !== null).length
  const progressPct = Math.round(((current + (selected !== null ? 1 : 0)) / total) * 100)

  function choose(index: number) {
    setAnswers((prev) => prev.map((v, i) => (i === current ? index : v)))
  }

  function next() {
    if (selected === null) return
    if (isLast) setFinished(true)
    else setCurrent((i) => i + 1)
  }

  function restart() {
    setCurrent(0)
    setAnswers(new Array(total).fill(null))
    setFinished(false)
  }

  // Soma os pontos de cada perfil a partir das opções escolhidas.
  const totals: Record<string, number> = Object.fromEntries(results.map((r) => [r.id, 0]))
  answers.forEach((choice, i) => {
    if (choice === null) return
    for (const [id, pts] of Object.entries(questions[i].options[choice].points)) totals[id] = (totals[id] ?? 0) + pts
  })
  const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0) || 1
  const winner = results.reduce((best, r) => ((totals[r.id] ?? 0) > (totals[best.id] ?? 0) ? r : best), results[0])
  const shareText = `Fiz o quiz da Black Friday e meu perfil é "${winner.title}". E você? Descubra:`

  return (
    <div className="quiz-el">
      <header className="quiz-el__header">
        <div className="quiz-el__header-icon">
          <HeaderIcon size={28} aria-hidden="true" />
        </div>
        <div>
          <span className="quiz-el__eyebrow">{eyebrow}</span>
          <h3 className="quiz-el__title">{title}</h3>
          <p className="quiz-el__subtitle">{subtitle}</p>
        </div>
      </header>

      <div className="quiz-el__stats">
        <div className="quiz-el__stat">
          <HelpCircle size={20} aria-hidden="true" />
          <div>
            <strong>{`${total} perguntas`}</strong>
            <span>Sem resposta certa</span>
          </div>
        </div>
        <div className="quiz-el__stat">
          <Clock size={20} aria-hidden="true" />
          <div>
            <strong>{`~${Math.max(1, Math.round(total * 0.3))} min`}</strong>
            <span>Duração média</span>
          </div>
        </div>
        <div className="quiz-el__stat">
          <ShieldCheck size={20} aria-hidden="true" />
          <div>
            <strong>{`${results.length} perfis`}</strong>
            <span>{qualityBadge}</span>
          </div>
        </div>
      </div>

      {!finished && (
        <div className="quiz-el__card">
          <div className="quiz-el__progress-row">
            <span className="quiz-el__progress-label">{`PERGUNTA ${current + 1} DE ${total}`}</span>
            <span className="quiz-el__progress-pct">{`${progressPct}%`}</span>
          </div>
          <div className="quiz-el__progress-track">
            <div className="quiz-el__progress-fill" style={{ width: `${progressPct}%` }} />
          </div>

          <p className="quiz-el__question" id={`quiz-pers-q-${current}`}>
            {q.question}
          </p>

          <div className="quiz-el__options" role="radiogroup" aria-labelledby={`quiz-pers-q-${current}`}>
            {q.options.map((option, i) => (
              <button
                key={option.text}
                type="button"
                role="radio"
                aria-checked={selected === i}
                className={`quiz-el__option${selected === i ? ' is-selected' : ''}`}
                onClick={() => choose(i)}
              >
                {option.text}
              </button>
            ))}
          </div>

          <button type="button" className="quiz-el__next" onClick={next} disabled={selected === null}>
            {isLast ? 'Ver meu perfil →' : 'Próxima pergunta →'}
          </button>
        </div>
      )}

      {finished && (
        <div className="quiz-el__card quiz-el__profile">
          <span className="quiz-el__profile-kicker">
            <Sparkles size={16} aria-hidden="true" /> Seu perfil de comprador
          </span>
          <h4 className="quiz-el__profile-title">{winner.title}</h4>
          <p className="quiz-el__profile-tagline">{winner.tagline}</p>
          <p className="quiz-el__profile-text">{winner.description}</p>

          <div className="quiz-el__bars" aria-label="Mistura de perfis">
            {[...results]
              .sort((a, b) => (totals[b.id] ?? 0) - (totals[a.id] ?? 0))
              .map((r) => {
                const pct = Math.round(((totals[r.id] ?? 0) / grandTotal) * 100)
                return (
                  <div key={r.id} className={`quiz-el__bar${r.id === winner.id ? ' is-winner' : ''}`}>
                    <span className="quiz-el__bar-label">{r.title}</span>
                    <span className="quiz-el__bar-track">
                      <span className="quiz-el__bar-fill" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="quiz-el__bar-pct">{`${pct}%`}</span>
                  </div>
                )
              })}
          </div>

          <div className="quiz-el__tips">
            <strong>Como comprar melhor com o seu perfil</strong>
            <ul>
              {winner.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>

          <div className="quiz-el__result-actions">
            <Link to={winner.cta.to} className="quiz-el__btn quiz-el__btn--primary">
              {winner.cta.label}
            </Link>
          </div>
          <div className="quiz-el__share">
            <ShareBar url={url} title={shareText} />
          </div>
          <button type="button" className="quiz-el__restart" onClick={restart}>
            Refazer o quiz
          </button>
        </div>
      )}

      {answeredCount === 0 && footnote && (
        <p className="quiz-el__footnote">
          <ShieldCheck size={14} aria-hidden="true" /> {footnote}
        </p>
      )}
    </div>
  )
}
