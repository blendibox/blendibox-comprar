import type { Quiz } from '../../types/quiz'

// Afirmações e explicações sourced direto no comportamento real do recurso
// (src/components/PriceDropWatchForm.tsx, PriceTargetForm.tsx) e no FAQ do
// site (src/data/faq.json, perguntas sobre "aviso de queda de preço") —
// nunca inventado. Sem base legal aqui, a explanation já basta.
export const comoFuncionaOAvisoDeQuedaDePreco: Quiz = {
  slug: 'como-funciona-o-aviso-de-queda-de-preco',
  eyebrow: 'COMO FUNCIONA',
  title: 'Você sabe como funciona o aviso de queda de preço?',
  subtitle: 'Teste seus conhecimentos em 5 perguntas rápidas.',
  qualityBadge: 'Direto de como o recurso funciona',
  icon: 'Bell',
  footnote: 'Todas as respostas são baseadas em como o aviso de queda de preço do Compare Ofertas funciona hoje.',
  metaTitle: 'Quiz: Como Funciona o Aviso de Queda de Preço | Compare Ofertas',
  metaDescription:
    'Teste seus conhecimentos sobre o aviso de queda de preço do Compare Ofertas: é a mesma coisa que a newsletter? Com que frequência o preço é conferido? Dá pra escolher um valor?',
  publishedAt: '2026-08-28',
  excerpt:
    'Teste seus conhecimentos em 5 perguntas rápidas: como funciona o aviso de queda de preço — quando dispara, com que frequência, e se é a mesma coisa que a newsletter.',
  questions: [
    {
      question: 'O aviso de queda de preço é a mesma coisa que assinar a newsletter semanal.',
      correctAnswer: false,
      explanation:
        'Falso. São coisas separadas: o aviso de queda é um e-mail único, enviado só quando há uma queda real confirmada num produto que você está acompanhando — a newsletter semanal é uma assinatura à parte e opcional.',
    },
    {
      question: 'Na página de um produto, dá pra escolher um preço específico e só ser avisado quando ele chegar nesse valor.',
      correctAnswer: true,
      explanation:
        'Verdadeiro. Em "Defina quanto quer pagar", você escolhe o valor (ou usa uma sugestão rápida de -5%, -10% ou -15%) e o alerta dispara quando o preço chega lá, ou baixa ainda mais.',
    },
    {
      question: 'O preço dos itens monitorados é conferido só uma vez por semana.',
      correctAnswer: false,
      explanation: 'Falso. O preço dos itens acompanhados é conferido diariamente.',
    },
    {
      question: 'Se o produto já estava com desconto quando você começou a acompanhar, você recebe um aviso na hora.',
      correctAnswer: false,
      explanation:
        'Falso. O aviso só dispara se o preço cair ABAIXO do valor de quando você começou a acompanhar — não pro desconto que já existia antes disso.',
    },
    {
      question: 'Ativar o alerta de preço na página de um produto também adiciona ele automaticamente aos seus favoritos.',
      correctAnswer: true,
      explanation:
        'Verdadeiro. Ativar o alerta já favorita o produto, pra ele aparecer junto na sua lista de Favoritos.',
    },
  ],
}
