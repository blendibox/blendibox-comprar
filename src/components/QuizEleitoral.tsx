import { useState } from 'react'
import { BookOpen, Check, Clock, GraduationCap, PartyPopper, Scale, ShieldCheck, Vote, X } from './Icon'
import { ShareBar } from './ShareBar'

interface QuizQuestion {
  question: string
  correctAnswer: boolean
  explanation: string
  legalBasis: string
}

interface QuizEleitoralProps {
  eyebrow: string
  title: string
  subtitle: string
  qualityBadge: string
  questions: QuizQuestion[]
  // URL canônica da página onde o quiz está (a do próprio quiz em
  // /quizzes/:slug, ou a do artigo do blog quando embutido via bloco
  // 'quiz-premium') — usada pro compartilhamento do resultado, mesmo padrão
  // de ProductPage/BlogPostPage (nunca window.location, pra não divergir do
  // HTML pré-renderizado no servidor).
  url: string
}

// Versão "premium" do quiz "pode ou não pode" (ver também QuizPodeNaoPode.tsx,
// mantido como está — este é um componente à parte, não substitui aquele).
// Cabeçalho com estatística ao vivo, barra de progresso visual, citação da
// base legal por pergunta (mesma fonte oficial do texto do artigo — nunca
// inventada aqui), modo "ver todas as respostas" e compartilhar resultado.
//
// Estado guarda a resposta de CADA pergunta (não só a atual) — é o que
// permite montar a tela de revisão no final sem precisar refazer o quiz.
export function QuizEleitoral({ eyebrow, title, subtitle, qualityBadge, questions, url }: QuizEleitoralProps) {
  const [current, setCurrent] = useState(0)
  const [selections, setSelections] = useState<(boolean | null)[]>(() => new Array(questions.length).fill(null))
  const [finished, setFinished] = useState(false)
  const [reviewMode, setReviewMode] = useState(false)

  const total = questions.length
  const score = selections.filter((sel, i) => sel !== null && sel === questions[i].correctAnswer).length
  const answeredCount = selections.filter((s) => s !== null).length

  const q = questions[current]
  const selected = selections[current]
  const isAnswered = selected !== null
  const isCorrect = isAnswered && selected === q.correctAnswer
  const isLast = current === total - 1
  const progressPct = Math.round(((current + (isAnswered ? 1 : 0)) / total) * 100)

  function choose(value: boolean) {
    if (isAnswered) return
    setSelections((prev) => prev.map((v, i) => (i === current ? value : v)))
  }

  function next() {
    if (isLast) {
      setFinished(true)
      return
    }
    setCurrent((i) => i + 1)
  }

  function restart() {
    setCurrent(0)
    setSelections(new Array(total).fill(null))
    setFinished(false)
    setReviewMode(false)
  }

  // Convite pra OUTRA pessoa fazer o quiz — não o resultado/nota de quem já
  // respondeu (o placar não interessa a quem ainda não jogou).
  const shareInviteText = `${title} Teste seus conhecimentos:`

  const resultMessage =
    score === total
      ? 'Você manda muito bem! Sabe exatamente o que pode e o que não pode.'
      : score >= Math.ceil(total * 0.6)
        ? 'Você está bem informado, mas ainda vale revisar algumas regras antes de votar.'
        : 'Vale a pena revisar as regras com calma antes do dia da votação.'

  return (
    <div className="quiz-el">
      <header className="quiz-el__header">
        <div className="quiz-el__header-icon">
          <Vote size={28} aria-hidden="true" />
        </div>
        <div>
          <span className="quiz-el__eyebrow">{eyebrow}</span>
          <h3 className="quiz-el__title">{title}</h3>
          <p className="quiz-el__subtitle">{subtitle}</p>
        </div>
      </header>

      <div className="quiz-el__stats">
        <div className="quiz-el__stat">
          <GraduationCap size={20} aria-hidden="true" />
          <div>
            <strong>{`${score}/${total}`}</strong>
            <span>Seu conhecimento</span>
          </div>
        </div>
        <div className="quiz-el__stat">
          <Clock size={20} aria-hidden="true" />
          <div>
            <strong>{`~${Math.max(1, Math.round(total * 0.4))} min`}</strong>
            <span>Duração média</span>
          </div>
        </div>
        <div className="quiz-el__stat">
          <ShieldCheck size={20} aria-hidden="true" />
          <div>
            <strong>Informação de qualidade</strong>
            <span>{qualityBadge}</span>
          </div>
        </div>
      </div>

      {!finished && !reviewMode && (
        <div className="quiz-el__card">
          <div className="quiz-el__progress-row">
            <span className="quiz-el__progress-label">{`PERGUNTA ${current + 1} DE ${total}`}</span>
            <span className="quiz-el__progress-pct">{`${progressPct}%`}</span>
          </div>
          <div className="quiz-el__progress-track">
            <div className="quiz-el__progress-fill" style={{ width: `${progressPct}%` }} />
          </div>

          <p className="quiz-el__question">{q.question}</p>

          <div className="quiz-el__choices">
            <button
              type="button"
              className={`quiz-el__choice quiz-el__choice--pode${isAnswered && q.correctAnswer === true ? ' is-correct' : ''}${selected === true && !isCorrect ? ' is-wrong' : ''}`}
              onClick={() => choose(true)}
              disabled={isAnswered}
            >
              <Check size={18} aria-hidden="true" /> Pode
            </button>
            <button
              type="button"
              className={`quiz-el__choice quiz-el__choice--nao-pode${isAnswered && q.correctAnswer === false ? ' is-correct' : ''}${selected === false && !isCorrect ? ' is-wrong' : ''}`}
              onClick={() => choose(false)}
              disabled={isAnswered}
            >
              <X size={18} aria-hidden="true" /> Não pode
            </button>
          </div>

          {isAnswered && (
            <div className={`quiz-el__feedback${isCorrect ? ' is-correct' : ' is-wrong'}`}>
              <div className="quiz-el__feedback-head">
                {isCorrect ? <Check size={18} aria-hidden="true" /> : <X size={18} aria-hidden="true" />}
                <strong>{isCorrect ? 'Acertou!' : q.correctAnswer ? 'Pode.' : 'Não pode.'}</strong>
                <span className="quiz-el__feedback-tag">{isCorrect ? 'RESPOSTA CORRETA' : 'RESPOSTA INCORRETA'}</span>
              </div>
              <p className="quiz-el__feedback-text">{q.explanation}</p>
              <div className="quiz-el__legal">
                <Scale size={16} aria-hidden="true" />
                <div>
                  <strong>Base legal</strong>
                  <span>{q.legalBasis}</span>
                </div>
              </div>
              <button type="button" className="quiz-el__next" onClick={next}>
                {isLast ? 'Ver resultado →' : 'Próxima pergunta →'}
              </button>
            </div>
          )}
        </div>
      )}

      {finished && !reviewMode && (
        <div className="quiz-el__card quiz-el__result">
          <svg width="130" height="130" viewBox="0 0 130 130" className="quiz-el__donut">
            <circle cx="65" cy="65" r="54" fill="none" stroke="#e5e7eb" strokeWidth="12" />
            <circle
              cx="65"
              cy="65"
              r="54"
              fill="none"
              stroke="var(--color-green)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 54}
              strokeDashoffset={2 * Math.PI * 54 * (1 - score / total)}
              transform="rotate(-90 65 65)"
            />
            <text x="65" y="62" textAnchor="middle" fontSize="30" fontWeight="900" fill="var(--color-navy)">
              {score}
            </text>
            <text x="65" y="86" textAnchor="middle" fontSize="16" fill="#6b6b6b">
              {`/${total}`}
            </text>
          </svg>
          <div className="quiz-el__result-text">
            <p className="quiz-el__result-title">
              <PartyPopper size={20} aria-hidden="true" /> {`Parabéns! Você fez ${score} de ${total}!`}
            </p>
            <p className="quiz-el__result-msg">{resultMessage}</p>
          </div>
          <div className="quiz-el__result-actions">
            <button type="button" className="quiz-el__btn quiz-el__btn--primary" onClick={() => setReviewMode(true)}>
              <BookOpen size={16} aria-hidden="true" /> Ver todas as respostas
            </button>
          </div>
          <div className="quiz-el__share">
            <ShareBar url={url} title={shareInviteText} />
          </div>
          <button type="button" className="quiz-el__restart" onClick={restart}>
            Refazer quiz
          </button>
        </div>
      )}

      {reviewMode && (
        <div className="quiz-el__card quiz-el__review">
          {questions.map((item, i) => {
            const userAnswer = selections[i]
            const correct = userAnswer === item.correctAnswer
            return (
              <div key={item.question} className={`quiz-el__review-item${correct ? ' is-correct' : ' is-wrong'}`}>
                <div className="quiz-el__feedback-head">
                  {correct ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />}
                  <strong>{`${i + 1}. ${item.question}`}</strong>
                </div>
                <p className="quiz-el__feedback-text">{item.explanation}</p>
                <div className="quiz-el__legal">
                  <Scale size={16} aria-hidden="true" />
                  <span>{item.legalBasis}</span>
                </div>
              </div>
            )
          })}
          <button type="button" className="quiz-el__restart" onClick={restart}>
            Refazer quiz
          </button>
        </div>
      )}

      {answeredCount === 0 && (
        <p className="quiz-el__footnote">
          <ShieldCheck size={14} aria-hidden="true" /> Todas as respostas são baseadas na Lei das Eleições (Lei nº 9.504/97) e nas
          resoluções do TSE.
        </p>
      )}
    </div>
  )
}
