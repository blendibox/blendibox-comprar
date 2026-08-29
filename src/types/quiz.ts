export interface QuizQuestion {
  question: string
  correctAnswer: boolean
  explanation: string
  // Citação legal — só existe pra quizzes sobre lei/regra oficial (ex: o
  // eleitoral). Nos demais (como funciona um recurso do site), a explanation
  // já basta, então esse campo fica de fora.
  legalBasis?: string
}

// Nomes já presentes no sprite de ícones (src/components/Icon.tsx) — cada
// quiz escolhe o que combina com o tema (Vote pro eleitoral, Gift pra lista
// de presentes, etc.), resolvido pro componente real em QuizVerdadeiroFalso.
export type QuizIcon = 'Vote' | 'Gift' | 'Bell' | 'Heart'

export interface Quiz {
  slug: string
  eyebrow: string
  title: string
  subtitle: string
  qualityBadge: string
  icon: QuizIcon
  // Nota de rodapé mostrada antes de responder a primeira pergunta — de onde
  // vêm as respostas (lei, no caso eleitoral; como o recurso funciona hoje,
  // nos demais). Opcional: sem ela, o rodapé simplesmente não aparece.
  footnote?: string
  metaTitle: string
  metaDescription: string
  publishedAt: string
  excerpt: string
  questions: QuizQuestion[]
}
