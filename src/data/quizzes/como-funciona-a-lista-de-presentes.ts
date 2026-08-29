import type { Quiz } from '../../types/quiz'

// Afirmações e explicações sourced direto no comportamento real do recurso
// (src/pages/RegistryLandingPage.tsx, RegistryPublicPage.tsx) e no FAQ do
// site (src/data/faq.json, perguntas sobre "lista de presentes") — nunca
// inventado. Sem base legal aqui (não é conteúdo de lei), a explanation já
// basta.
export const comoFuncionaAListaDePresentes: Quiz = {
  slug: 'como-funciona-a-lista-de-presentes',
  eyebrow: 'COMO FUNCIONA',
  title: 'Você sabe como funciona a lista de presentes?',
  subtitle: 'Teste seus conhecimentos em 5 perguntas rápidas.',
  qualityBadge: 'Direto de como o recurso funciona',
  icon: 'Gift',
  footnote: 'Todas as respostas são baseadas em como a lista de presentes do Compare Ofertas funciona hoje.',
  metaTitle: 'Quiz: Como Funciona a Lista de Presentes | Compare Ofertas',
  metaDescription:
    'Teste seus conhecimentos sobre a lista de presentes do Compare Ofertas: precisa de conta? Como funciona a confirmação de compra? Dá pra misturar lojas diferentes?',
  publishedAt: '2026-08-28',
  excerpt:
    'Teste seus conhecimentos em 5 perguntas rápidas: como funciona a lista de presentes, de graça e sem conta, com produtos de qualquer loja parceira.',
  questions: [
    {
      question: 'Pra criar uma lista de presentes, é preciso criar uma conta com senha.',
      correctAnswer: false,
      explanation:
        'Falso. Não precisa de conta nem senha — você informa só um e-mail pra gerenciar a lista e receber os avisos de compra, e recebe um link de gestão.',
    },
    {
      question: 'Dá pra misturar produtos de lojas parceiras diferentes numa mesma lista.',
      correctAnswer: true,
      explanation:
        'Verdadeiro. É o diferencial da lista: reunir produtos de várias lojas parceiras — de eletrodoméstico a fralda — num link só, em vez de mandar um link por loja.',
    },
    {
      question: 'O convidado precisa criar uma conta na loja parceira pra comprar o presente.',
      correctAnswer: false,
      explanation:
        'Falso. O convidado não cria conta em lugar nenhum — informa o e-mail (pra evitar presente repetido) e é levado direto ao site da loja parceira pra concluir a compra.',
    },
    {
      question: 'Um presente só é marcado como "comprado" na lista depois que a própria loja confirma a compra.',
      correctAnswer: true,
      explanation:
        'Verdadeiro. A compra é confirmada pela loja parceira, não no "chute" — é assim que ninguém dá presente repetido. Antes da confirmação, o item aparece só como "alguém demonstrou interesse".',
    },
    {
      question: 'O Compare Ofertas processa o pagamento da compra do presente.',
      correctAnswer: false,
      explanation:
        'Falso. A compra é sempre finalizada direto no site da loja parceira (ou pelo WhatsApp de uma representante, em casos específicos) — o Compare Ofertas nunca processa pagamento.',
    },
  ],
}
