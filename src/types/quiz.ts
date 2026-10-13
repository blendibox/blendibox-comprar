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
export type QuizIcon = 'Vote' | 'Gift' | 'Bell' | 'Heart' | 'Tag' | 'ShoppingBag'

// 'verdadeiro-falso' (padrão): afirmações com resposta certa. 'personalidade':
// sem resposta certa — cada opção soma pontos pra um perfil, e o resultado é o
// perfil com mais pontos (ver QuizPersonalidade).
export type QuizKind = 'verdadeiro-falso' | 'personalidade'

export interface PersonalityOption {
  text: string
  // id do perfil -> pontos que essa opção dá a ele
  points: Record<string, number>
}

export interface PersonalityQuestion {
  question: string
  options: PersonalityOption[]
}

export interface PersonalityResult {
  id: string
  title: string
  tagline: string
  description: string
  tips: string[]
  // Pra onde levar quem terminou: a ferramenta do site que mais combina com o perfil
  cta: { label: string; to: string }
}

export interface QuizPersonality {
  questions: PersonalityQuestion[]
  results: PersonalityResult[]
}

export interface Quiz {
  slug: string
  eyebrow: string
  title: string
  subtitle: string
  qualityBadge: string
  icon: QuizIcon
  // Padrão 'verdadeiro-falso'. Em 'personalidade', `questions` fica vazio e o
  // conteúdo vem de `personality`.
  kind?: QuizKind
  // Rótulos dos dois botões (e do vídeo) — padrão "Verdadeiro"/"Falso". O
  // quiz de Black Friday usa "Verdade"/"Mito".
  trueLabel?: string
  falseLabel?: string
  // Nota de rodapé mostrada antes de responder a primeira pergunta — de onde
  // vêm as respostas (lei, no caso eleitoral; como o recurso funciona hoje,
  // nos demais). Opcional: sem ela, o rodapé simplesmente não aparece.
  footnote?: string
  metaTitle: string
  metaDescription: string
  publishedAt: string
  excerpt: string
  questions: QuizQuestion[]
  personality?: QuizPersonality
}
