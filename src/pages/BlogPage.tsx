import { Link } from 'react-router-dom'
import { CalendarDays, Gift } from 'lucide-react'
import { blogPosts } from '../data/blog'
import { formatSimpleDateBr } from '../lib/date'

export function BlogPage() {
  return (
    <div className="page blog-page">
      <header className="page__header">
        <h1>Blog</h1>
        <p className="blog-page__subtitle">
          Dicas práticas pra organizar lista de presentes, casamento, chá de bebê e casa nova — sem enrolação.
        </p>
      </header>

      <section className="blog-list">
        {blogPosts.map((post) => (
          <Link key={post.slug} to={`/blog/${post.slug}`} className="blog-card">
            <div className="blog-card__body">
              <span className="blog-card__date">
                <CalendarDays size={13} aria-hidden="true" /> {formatSimpleDateBr(post.publishedAt)}
              </span>
              <h2>{post.title}</h2>
              <p>{post.excerpt}</p>
              <span className="blog-card__cta">Ler artigo →</span>
            </div>
          </Link>
        ))}
      </section>

      <section className="blog-page__cta">
        <Gift size={20} aria-hidden="true" />
        <div>
          <strong>Já sabe o que quer? Crie sua lista de presentes grátis.</strong>
          <p>Produtos de várias lojas, link único pra compartilhar, sem presente repetido.</p>
        </div>
        <Link to="/listas/nova" className="registry-landing__button">
          Criar minha lista →
        </Link>
      </section>
    </div>
  )
}
