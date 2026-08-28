export interface QuizQuestion {
  question: string
  correctAnswer: boolean
  explanation: string
  legalBasis: string
}

export interface Quiz {
  slug: string
  eyebrow: string
  title: string
  subtitle: string
  qualityBadge: string
  metaTitle: string
  metaDescription: string
  publishedAt: string
  excerpt: string
  questions: QuizQuestion[]
}
