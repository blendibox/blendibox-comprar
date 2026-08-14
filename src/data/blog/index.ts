import type { BlogPost } from '../../types/blog'
import { listaDePresentesOnlineGratis } from './lista-de-presentes-online-gratis'

// Cada artigo mora no próprio arquivo (facilita adicionar/revisar um por vez).
// Lista central agregada aqui, ordenada do mais recente pro mais antigo.
export const blogPosts: BlogPost[] = [listaDePresentesOnlineGratis].sort((a, b) =>
  a.publishedAt < b.publishedAt ? 1 : -1
)

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug)
}

// Posts relacionados: usa relatedSlugs quando existem (link interno
// intencional), completa com os mais recentes se faltar — nunca quebra
// quando um artigo referenciado ainda não foi publicado.
export function getRelatedPosts(post: BlogPost, limit = 3): BlogPost[] {
  const related = (post.relatedSlugs ?? [])
    .map((slug) => blogPosts.find((p) => p.slug === slug))
    .filter((p): p is BlogPost => !!p)
  if (related.length >= limit) return related.slice(0, limit)
  const fallback = blogPosts.filter((p) => p.slug !== post.slug && !related.includes(p))
  return [...related, ...fallback].slice(0, limit)
}
