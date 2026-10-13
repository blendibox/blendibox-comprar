import type { Quiz } from '../../types/quiz'

// Respostas baseadas no Código de Defesa do Consumidor (Lei nº 8.078/1990) e na
// Lei nº 13.455/2017 (preço diferente por forma de pagamento) — cada pergunta
// traz o artigo. Informação geral, não orientação jurídica (ver footnote).
export const blackFridayMitoOuVerdade: Quiz = {
  slug: 'black-friday-mito-ou-verdade',
  eyebrow: 'BLACK FRIDAY',
  title: 'Black Friday: mito ou verdade?',
  subtitle: 'Teste seus conhecimentos em 7 perguntas rápidas e compre sem cair em pegadinha.',
  qualityBadge: 'Baseado no Código de Defesa do Consumidor',
  icon: 'Tag',
  trueLabel: 'Verdade',
  falseLabel: 'Mito',
  footnote:
    'As respostas se baseiam no Código de Defesa do Consumidor (Lei nº 8.078/1990) e na Lei nº 13.455/2017. É informação geral e não substitui orientação jurídica.',
  metaTitle: 'Quiz: Black Friday, Mito ou Verdade? | Compare Ofertas',
  metaDescription:
    'Você sabe seus direitos na Black Friday? Teste 7 mitos e verdades: arrependimento em 7 dias, preço riscado, garantia, atraso na entrega e mais — com a base legal de cada resposta.',
  publishedAt: '2026-10-13',
  excerpt:
    '7 afirmações sobre a Black Friday: mito ou verdade? Direito de arrependimento, preço riscado, garantia, atraso na entrega — com a lei de cada resposta.',
  questions: [
    {
      question: 'Black Friday é sempre a melhor época do ano pra comprar qualquer produto.',
      correctAnswer: false,
      explanation:
        'Mito. Nem todo item fica mais barato na Black Friday: alguns custam o mesmo que em outros meses, ou até um pouco mais. A pergunta certa é "está abaixo do preço de sempre?", não "tem etiqueta de promoção?". É por isso que o Compare Ofertas só mostra queda comparada ao preço habitual do produto.',
    },
    {
      question: 'Compra feita pela internet na Black Friday pode ser cancelada em até 7 dias, sem precisar explicar o motivo.',
      correctAnswer: true,
      explanation:
        'Verdade. Compras feitas fora da loja física (internet, telefone) dão direito de arrependimento: são 7 dias, contados da compra ou do recebimento do produto, pra desistir e receber de volta o que pagou. Na loja física esse direito não existe por lei — só se a loja oferecer.',
      legalBasis: 'Código de Defesa do Consumidor (Lei nº 8.078/1990), art. 49.',
    },
    {
      question: 'Quando o preço aparece riscado — "de R$ 1.000 por R$ 700" —, o produto custava mesmo R$ 1.000 antes.',
      correctAnswer: false,
      explanation:
        'Mito. Nada garante que o preço riscado foi o praticado antes. A lei proíbe a propaganda enganosa (a famosa "metade do dobro"), mas quem confere é você: o jeito mais seguro é comparar com o histórico de preço do produto.',
      legalBasis: 'Código de Defesa do Consumidor, art. 37, § 1º — publicidade enganosa.',
    },
    {
      question: 'A loja pode cobrar preços diferentes para pagamento à vista e no cartão de crédito.',
      correctAnswer: true,
      explanation:
        'Verdade. A lei permite diferenciar o preço conforme o prazo ou a forma de pagamento — desde que isso seja informado de forma clara, antes da compra.',
      legalBasis: 'Lei nº 13.455/2017.',
    },
    {
      question: 'Produto comprado na Black Friday tem garantia menor do que o comprado em outra época do ano.',
      correctAnswer: false,
      explanation:
        'Mito. A garantia legal não muda por causa da promoção: você tem 30 dias pra reclamar de defeito em produto não durável e 90 dias em produto durável, contados do recebimento — ou de quando o defeito aparece, se ele era oculto.',
      legalBasis: 'Código de Defesa do Consumidor, arts. 24 e 26.',
    },
    {
      question: 'Se a entrega atrasar além do prazo prometido, você pode cancelar a compra e receber o dinheiro de volta.',
      correctAnswer: true,
      explanation:
        'Verdade. Quando a loja descumpre a oferta, você escolhe: exigir o cumprimento (a entrega), aceitar outro produto equivalente ou cancelar a compra e receber de volta o que pagou, com correção.',
      legalBasis: 'Código de Defesa do Consumidor, art. 35.',
    },
    {
      question: 'Guardar o print do anúncio ajuda se o preço mudar depois da compra.',
      correctAnswer: true,
      explanation:
        'Verdade. O anúncio vincula quem anunciou: se a oferta era clara e o preço estava lá, a loja deve cumprir. Em caso de erro evidente de preço a loja pode tentar corrigir — mas o print (ou o e-mail de confirmação) é a sua prova pra defender o seu direito.',
      legalBasis: 'Código de Defesa do Consumidor, art. 30 — a oferta suficientemente precisa obriga o fornecedor.',
    },
  ],
}
