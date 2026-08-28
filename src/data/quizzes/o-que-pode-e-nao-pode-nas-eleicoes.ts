import type { Quiz } from '../../types/quiz'

// Cenários e explicações já sourced no guia oficial "Propaganda Eleitoral —
// Pode/Não Pode" do Ministério Público do Rio Grande do Sul (Eleições
// Gerais 2026), com base na Lei nº 9.504/1997 e na Resolução TSE nº
// 23.610/2019 — mesmas fontes já usadas no artigo do blog
// "o-que-vestir-para-votar-eleicoes-2026". Citação de base legal é a que o
// próprio guia associa a cada bloco de conduta, não inventada aqui.
export const oQuePodeENaoPodeNasEleicoes: Quiz = {
  slug: 'o-que-pode-e-nao-pode-nas-eleicoes',
  eyebrow: 'QUIZ ELEITORAL',
  title: 'Você sabe o que pode e o que não pode nas eleições?',
  subtitle: 'Teste seus conhecimentos em 5 perguntas rápidas.',
  qualityBadge: 'Baseado na legislação eleitoral',
  metaTitle: 'Quiz: O Que Pode e Não Pode nas Eleições | Compare Ofertas',
  metaDescription:
    'Teste seus conhecimentos sobre as regras eleitorais de 2026 — o que é permitido e o que é proibido vestir e fazer no dia da votação, baseado na Lei das Eleições e no TSE.',
  publishedAt: '2026-08-27',
  excerpt:
    'Teste seus conhecimentos em 5 perguntas rápidas: o que a lei realmente permite (e proíbe) vestir e fazer no dia da votação.',
  questions: [
    {
      question: 'Você pode vestir a camiseta do seu candidato pra ir votar, sozinho, sem fazer barulho?',
      correctAnswer: true,
      explanation:
        'Pode. A manifestação individual e silenciosa é permitida por lei, inclusive dentro da seção eleitoral.',
      legalBasis: 'Art. 39, § 5º e art. 39-A da Lei nº 9.504/97',
    },
    {
      question: 'Um grupo de 10 pessoas pode ir junto ao local de votação, todos vestindo a mesma camiseta de campanha?',
      correctAnswer: false,
      explanation: 'Não pode. Isso caracteriza aglomeração com vestuário padronizado, expressamente proibida.',
      legalBasis: 'Art. 39, § 5º da Lei nº 9.504/97; Res.-TSE nº 23.610/2019, art. 19, § 7º',
    },
    {
      question: 'Você pode distribuir camisetas do seu candidato pra outros eleitores na fila?',
      correctAnswer: false,
      explanation:
        'Não pode. Mesmo sendo permitido usar individualmente, distribuir material (camiseta, adesivo, santinho) no dia da eleição é proibido.',
      legalBasis: 'Art. 39, § 6º e art. 39-A da Lei nº 9.504/97; Res.-TSE nº 23.610/2019, arts. 18 e 82',
    },
    {
      question: 'O fiscal de partido pode usar um crachá com o nome e a sigla do partido dentro da seção eleitoral?',
      correctAnswer: true,
      explanation: 'Pode, desde que seja só o crachá — sem vestuário padronizado.',
      legalBasis: 'Res.-TSE nº 23.610/2019, art. 87',
    },
    {
      question: 'Você pode ficar conversando com outros eleitores na fila tentando convencê-los a votar no seu candidato?',
      correctAnswer: false,
      explanation: 'Não pode. Abordar ou tentar persuadir outros eleitores no dia da votação é "boca de urna", proibida por lei.',
      legalBasis: 'Res.-TSE nº 23.610/2019, art. 82',
    },
  ],
}
