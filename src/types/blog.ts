export type BlogContentBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'quote'; text: string }

export type BlogFaqItem = { q: string; a: string }

export type BlogPost = {
  slug: string
  title: string
  metaTitle: string
  metaDescription: string
  keyword: string
  secondaryKeywords: string[]
  publishedAt: string
  updatedAt?: string
  excerpt: string
  blocks: BlogContentBlock[]
  faq?: BlogFaqItem[]
  relatedSlugs?: string[]
}
