import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { Link } from '../components/Link'
import { CalendarDays, Gift } from '../components/Icon'
import { getBlogPost, getRelatedPosts } from '../data/blog'
import { ShareBar } from '../components/ShareBar'
import { formatSimpleDateBr } from '../lib/date'
import { SITE_URL } from '../config/site'
import type { BlogContentBlock } from '../types/blog'

// Suporte a link dentro do texto: [rótulo](/caminho) vira link interno da
// SPA; [rótulo](https://...) vira link externo de verdade — sem isso, um
// href absoluto passado pro <Link> do react-router não navega pra fora do
// site. Deixa o artigo referenciar tanto páginas internas (categoria, loja)
// quanto sites de terceiros sem precisar de um tipo de bloco à parte.
const INLINE_LINK = /\[([^\]]+)\]\(([^)]+)\)/g

function renderInline(text: string): ReactNode {
  const parts: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0
  INLINE_LINK.lastIndex = 0
  while ((match = INLINE_LINK.exec(text))) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    const [, label, href] = match
    parts.push(
      /^https?:\/\//.test(href) ? (
        // sponsored (não só noopener/noreferrer): todo link externo em
        // artigo do blog aqui é link de afiliado — é o rel correto pra isso,
        // recomendado pelo próprio Google.
        <a key={key++} href={href} target="_blank" rel="sponsored noopener noreferrer">
          {label}
        </a>
      ) : (
        <Link key={key++} to={href}>
          {label}
        </Link>
      ),
    )
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts.length > 1 ? parts : text
}

function Block({ block }: { block: BlogContentBlock }) {
  switch (block.type) {
    case 'h2':
      return <h2>{block.text}</h2>
    case 'h3':
      return <h3>{block.text}</h3>
    case 'p':
      return <p>{renderInline(block.text)}</p>
    case 'ul':
      return (
        <ul>
          {block.items.map((item) => (
            <li key={item}>{renderInline(item)}</li>
          ))}
        </ul>
      )
    case 'ol':
      return (
        <ol>
          {block.items.map((item) => (
            <li key={item}>{renderInline(item)}</li>
          ))}
        </ol>
      )
    case 'quote':
      return <blockquote>{block.text}</blockquote>
    case 'table':
      return (
        <div className="blog-post__table-wrap">
          <table>
            <thead>
              <tr>
                {block.headers.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'banner':
      return (
        <a
          className="blog-post__banner"
          href={block.href}
          target="_blank"
          rel="sponsored noopener noreferrer"
        >
          <img src={block.imgSrc} alt={block.alt} loading="lazy" />
        </a>
      )
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
      <nav className="blog-post__breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Início</Link> <span aria-hidden="true">›</span> <Link to="/blog">Blog</Link>{' '}
        <span aria-hidden="true">›</span> <span aria-current="page">{post.title}</span>
      </nav>
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
