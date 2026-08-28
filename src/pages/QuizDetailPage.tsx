import { useParams } from 'react-router-dom'
import { Link } from '../components/Link'
import { getQuiz } from '../data/quizzes'
import { QuizEleitoral } from '../components/QuizEleitoral'
import { ShareBar } from '../components/ShareBar'
import { SITE_URL } from '../config/site'

export function QuizDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const quiz = slug ? getQuiz(slug) : undefined

  if (!quiz) {
    return (
      <div className="page blog-page">
        <p className="status status--error">Quiz não encontrado.</p>
        <Link to="/quizzes">← Voltar pros quizzes</Link>
      </div>
    )
  }

  const url = `${SITE_URL}/quizzes/${quiz.slug}/`

  return (
    <article className="page blog-post">
      <nav className="blog-post__breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Início</Link> <span aria-hidden="true">›</span> <Link to="/quizzes">Quiz</Link>{' '}
        <span aria-hidden="true">›</span> <span aria-current="page">{quiz.title}</span>
      </nav>

      <ShareBar url={url} title={quiz.title} />

      <QuizEleitoral
        eyebrow={quiz.eyebrow}
        title={quiz.title}
        subtitle={quiz.subtitle}
        qualityBadge={quiz.qualityBadge}
        questions={quiz.questions}
        url={url}
      />

      <ShareBar url={url} title={quiz.title} />
    </article>
  )
}
