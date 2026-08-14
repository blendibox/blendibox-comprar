import { Link, useParams } from 'react-router-dom'
import { CalendarDays, Gift } from 'lucide-react'
import { getBlogPost, getRelatedPosts } from '../data/blog'
import { ShareBar } from '../components/ShareBar'
import { formatSimpleDateBr } from '../lib/date'
import { SITE_URL } from '../config/site'
import type { BlogContentBlock } from '../types/blog'

function Block({ block }: { block: BlogContentBlock }) {
  switch (block.type) {
    case 'h2':
      return <h2>{block.text}</h2>
    case 'h3':
      return <h3>{block.text}</h3>
    case 'p':
      return <p>{block.text}</p>
    case 'ul':
      return (
        <ul>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )
    case 'ol':
      return (
        <ol>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      )
    case 'quote':
      return <blockquote>{block.text}</blockquote>
  }
}

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>()
  const post = slug ? getBlogPost(slug) : undefined

  if (!post) {
    return (
      <div className="page blog-page">
        <p className="status status--error">Artigo não encontrado.</p>
        <Link to="/blog">← Voltar pro blog</Link>
      </div>
    )
  }

  const url = `${SITE_URL}/blog/${post.slug}/`
  const related = getRelatedPosts(post)

  return (
    <article className="page blog-post">
      <header className="blog-post__header">
        <span className="blog-post__date">
          <CalendarDays size={13} aria-hidden="true" /> {formatSimpleDateBr(post.publishedAt)}
        </span>
        <h1>{post.title}</h1>
      </header>

      <ShareBar url={url} title={post.title} />

      <div className="blog-post__body">
        {post.blocks.map((block, i) => (
          <Block key={i} block={block} />
        ))}
      </div>

      {post.faq && post.faq.length > 0 && (
        <section className="blog-post__faq">
          <h2>Perguntas frequentes</h2>
          <div className="faq-list">
            {post.faq.map((item) => (
              <div key={item.q} className="faq-item">
                <h3>{item.q}</h3>
                <p>{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="blog-post__cta">
        <Gift size={20} aria-hidden="true" />
        <div>
          <strong>Pronto pra montar a sua lista?</strong>
          <p>Grátis, sem cadastro, com produtos de qualquer loja parceira.</p>
        </div>
        <Link to="/listas/nova" className="registry-landing__button">
          Criar minha lista grátis →
        </Link>
      </section>

      <ShareBar url={url} title={post.title} />

      {related.length > 0 && (
        <section className="blog-post__related">
          <h2>Leia também</h2>
          <div className="blog-list blog-list--compact">
            {related.map((r) => (
              <Link key={r.slug} to={`/blog/${r.slug}`} className="blog-card blog-card--compact">
                <div className="blog-card__body">
                  <h3>{r.title}</h3>
                  <p>{r.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  )
}
