import type { Quiz } from '../../types/quiz'

// Afirmações e explicações sourced direto no comportamento real do recurso
// (src/context/FavoritesContext, src/pages/FavoritesPage.tsx) e no FAQ do
// site (src/data/faq.json, pergunta sobre "salvar favoritos") — nunca
// inventado. Sem base legal aqui, a explanation já basta.
export const comoFuncionamOsFavoritos: Quiz = {
  slug: 'como-funcionam-os-favoritos',
  eyebrow: 'COMO FUNCIONA',
  title: 'Você sabe como funcionam os Favoritos?',
  subtitle: 'Teste seus conhecimentos em 5 perguntas rápidas.',
  qualityBadge: 'Direto de como o recurso funciona',
  icon: 'Heart',
  footnote: 'Todas as respostas são baseadas em como os Favoritos do Compare Ofertas funcionam hoje.',
  metaTitle: 'Quiz: Como Funcionam os Favoritos | Compare Ofertas',
  metaDescription:
    'Teste seus conhecimentos sobre os Favoritos do Compare Ofertas: precisa de login? Os itens salvos aparecem em qualquer aparelho? É a mesma coisa que o comparador?',
  publishedAt: '2026-08-28',
  excerpt:
    'Teste seus conhecimentos em 5 perguntas rápidas: como funcionam os Favoritos — onde ficam salvos, e o que dá pra fazer com eles.',
  questions: [
    {
      question: 'Pra favoritar um produto, é preciso fazer login.',
      correctAnswer: false,
      explanation: 'Falso. Não precisa de conta nem login — é só clicar no coração do produto.',
    },
    {
      question: 'Seus favoritos ficam salvos num servidor e aparecem em qualquer aparelho que você usar pra acessar o site.',
      correctAnswer: false,
      explanation:
        'Falso. Os favoritos ficam guardados só no seu próprio navegador, não em servidor nenhum — se você limpar os dados do navegador ou trocar de aparelho, a lista não acompanha.',
    },
    {
      question: 'Na página de Favoritos, dá pra ativar de uma vez um alerta de queda de preço pra todos os itens salvos.',
      correctAnswer: true,
      explanation:
        'Verdadeiro. O formulário "Ative seu radar de preços", no final da página de Favoritos, monitora todos os itens salvos de uma vez, com um e-mail só.',
    },
    {
      question: 'Favoritar um produto e adicionar ele ao comparador (+ Comparar) é a mesma ação.',
      correctAnswer: false,
      explanation:
        'Falso. São recursos diferentes: favoritar salva o produto pra acompanhar depois, enquanto o comparador coloca até 3 produtos lado a lado numa página separada, pra comparar na hora.',
    },
    {
      question: 'Dá pra remover um único produto dos favoritos sem precisar limpar a lista inteira.',
      correctAnswer: true,
      explanation:
        'Verdadeiro. Cada item tem seu próprio botão de remover — o botão "Limpar favoritos" é só pra quem quer apagar a lista toda de uma vez.',
    },
  ],
}
