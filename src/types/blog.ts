export type BlogContentBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  // Banner/botão de afiliado com imagem (ex: creative da Awin) — rel
  // "sponsored" por padrão, é link pago/afiliado por definição.
  | { type: 'banner'; href: string; imgSrc: string; alt: string }
  // Quiz "pode ou não pode" — cada pergunta é um cenário real, resposta
  // certa é sempre PODE/NÃO PODE (nunca opinião), com explicação sourced
  // no próprio texto do artigo. Interativo, mas nunca a única fonte do fato
  // — o mesmo conteúdo já está escrito em prosa no artigo.
  | {
      type: 'quiz'
      title: string
      questions: { question: string; correctAnswer: boolean; explanation: string }[]
    }

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
