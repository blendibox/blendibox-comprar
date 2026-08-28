import { useState } from 'react'
import { Check, X } from './Icon'

interface QuizQuestion {
  question: string
  correctAnswer: boolean
  explanation: string
}

// Quiz "pode ou não pode" embutido em artigo do blog (ver 'quiz' em
// src/types/blog.ts) — cada pergunta já vem com a resposta e a explicação
// prontas no conteúdo do artigo (nunca inventadas aqui), só a interação é
// nova. Sem dependência de relógio/localStorage — estado inicial é sempre
// "pergunta 1, sem resposta", igual no servidor e no cliente.
export function QuizPodeNaoPode({ title, questions }: { title: string; questions: QuizQuestion[] }) {
  const [index, setIndex] = useState(0)
  const [answered, setAnswered] = useState<boolean | null>(null)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)

  const current = questions[index]
  const isLast = index === questions.length - 1

  function answer(choice: boolean) {
    if (answered !== null) return
    setAnswered(choice)
    if (choice === current.correctAnswer) setScore((s) => s + 1)
  }

  function next() {
    if (isLast) {
      setFinished(true)
      return
    }
    setIndex((i) => i + 1)
    setAnswered(null)
  }

  function restart() {
    setIndex(0)
    setAnswered(null)
    setScore(0)
    setFinished(false)
  }

  if (finished) {
    return (
      <div className="quiz-pnp">
        <h3 className="quiz-pnp__title">{title}</h3>
        <div className="quiz-pnp__result">
          <p className="quiz-pnp__score">
            Você acertou <strong>{score}</strong> de <strong>{questions.length}</strong>
          </p>
          <button type="button" className="quiz-pnp__restart" onClick={restart}>
            Refazer quiz
          </button>
        </div>
      </div>
    )
  }

  const isCorrect = answered !== null && answered === current.correctAnswer

  return (
    <div className="quiz-pnp">
      <h3 className="quiz-pnp__title">{title}</h3>
      <p className="quiz-pnp__progress">{`Pergunta ${index + 1} de ${questions.length}`}</p>
      <p className="quiz-pnp__question">{current.question}</p>

      <div className="quiz-pnp__choices">
        <button
          type="button"
          className={`quiz-pnp__choice quiz-pnp__choice--pode${answered !== null && current.correctAnswer === true ? ' quiz-pnp__choice--reveal-correct' : ''}${answered === true && !isCorrect ? ' quiz-pnp__choice--reveal-wrong' : ''}`}
          onClick={() => answer(true)}
          disabled={answered !== null}
        >
          Pode
        </button>
        <button
          type="button"
          className={`quiz-pnp__choice quiz-pnp__choice--nao-pode${answered !== null && current.correctAnswer === false ? ' quiz-pnp__choice--reveal-correct' : ''}${answered === false && !isCorrect ? ' quiz-pnp__choice--reveal-wrong' : ''}`}
          onClick={() => answer(false)}
          disabled={answered !== null}
        >
          Não pode
        </button>
      </div>

      {answered !== null && (
        <div className={`quiz-pnp__feedback${isCorrect ? ' quiz-pnp__feedback--correct' : ' quiz-pnp__feedback--wrong'}`}>
          {isCorrect ? <Check size={18} aria-hidden="true" /> : <X size={18} aria-hidden="true" />}
          <div>
            <strong>{isCorrect ? 'Isso mesmo!' : 'Não é bem assim.'}</strong>
            <p>{current.explanation}</p>
          </div>
        </div>
      )}

      {answered !== null && (
        <button type="button" className="quiz-pnp__next" onClick={next}>
          {isLast ? 'Ver resultado' : 'Próxima pergunta →'}
        </button>
      )}
    </div>
  )
}
