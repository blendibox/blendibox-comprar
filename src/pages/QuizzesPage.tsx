import { Link } from '../components/Link'
import { CalendarDays, Vote } from '../components/Icon'
import { quizzes } from '../data/quizzes'
import { formatSimpleDateBr } from '../lib/date'

export function QuizzesPage() {
  return (
    <div className="page blog-page">
      <header className="page__header">
        <h1>Quiz</h1>
        <p className="blog-page__subtitle">Teste seus conhecimentos em quizzes rápidos, sempre baseados em fonte oficial.</p>
      </header>

      <section className="blog-list">
        {quizzes.map((quiz) => (
          <Link key={quiz.slug} to={`/quizzes/${quiz.slug}`} className="blog-card">
            <div className="blog-card__body">
              <span className="blog-card__date">
                <CalendarDays size={13} aria-hidden="true" /> {formatSimpleDateBr(quiz.publishedAt)}
              </span>
              <h2>{quiz.title}</h2>
              <p>{quiz.excerpt}</p>
              <span className="blog-card__cta">
                <Vote size={14} aria-hidden="true" /> Fazer o quiz →
              </span>
            </div>
          </Link>
        ))}
      </section>
    </div>
  )
}
