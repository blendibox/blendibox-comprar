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
  // Versão "premium" do quiz acima — cabeçalho com estatística, barra de
  // progresso visual, citação da base legal por pergunta, modo "ver todas
  // as respostas" e compartilhar resultado. Componente à parte
  // (QuizEleitoral.tsx), não substitui o 'quiz' simples — os dois convivem.
  // Referencia por slug o mesmo quiz da seção /quizzes (src/data/quizzes) —
  // nunca duplica os dados das perguntas dentro do artigo.
  | { type: 'quiz-premium'; quizSlug: string }
  // Cartões de produto com foto, pra ilustrar uma menção no texto (ex: a bolsa
  // na cor citada). O link é INTERNO (página do produto no próprio site), então
  // sem rel="sponsored". Sem preço de propósito: o texto do artigo é estático e
  // o preço muda — quem quer o valor atual abre a página do produto.
  | { type: 'product-showcase'; items: BlogProductShowcaseItem[] }

export type BlogProductShowcaseItem = {
  href: string
  imgSrc: string
  alt: string
  name: string
  color: string
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
