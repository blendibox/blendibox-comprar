import type { Quiz } from '../../types/quiz'

// Quiz de perfil: não tem resposta certa — cada opção soma pontos pra um dos 4
// perfis, e o resultado é o perfil com mais pontos (empate: o primeiro da lista
// de `results`). Os conselhos de cada perfil só repetem o que o próprio site
// já recomenda (histórico de preço, aviso de queda, comparador, cupons) e o
// direito de arrependimento do CDC, art. 49.
export const queTipoDeCompradorDeBlackFridayVoceE: Quiz = {
  slug: 'que-tipo-de-comprador-de-black-friday-voce-e',
  kind: 'personalidade',
  eyebrow: 'BLACK FRIDAY',
  title: 'Que tipo de comprador de Black Friday você é?',
  subtitle: '6 perguntas, 4 perfis. Descubra o seu e veja como comprar melhor.',
  qualityBadge: 'Sem resposta certa ou errada',
  icon: 'ShoppingBag',
  footnote: 'É só uma brincadeira pra você se conhecer: não existe perfil melhor ou pior, cada um tem seu ponto forte e um cuidado.',
  metaTitle: 'Quiz: Que Tipo de Comprador de Black Friday Você É? | Compare Ofertas',
  metaDescription:
    'Caçador de preço real, impulsivo do carrinho, planejador de lista ou garimpeiro de cupom? Responda 6 perguntas, descubra seu perfil de comprador na Black Friday e veja dicas pra economizar de verdade.',
  publishedAt: '2026-10-13',
  excerpt:
    'Caçador de preço real, impulsivo do carrinho, planejador de lista ou garimpeiro de cupom? Responda 6 perguntas e descubra o seu perfil na Black Friday.',
  questions: [],
  personality: {
    questions: [
      {
        question: 'Você vê um celular com "50% OFF" em novembro. O que faz primeiro?',
        options: [
          { text: 'Compro na hora, antes que acabe.', points: { impulsivo: 3 } },
          { text: 'Confiro o histórico de preço e comparo em outras lojas.', points: { cacador: 3, planejador: 1 } },
          { text: 'Salvo na minha lista e espero a semana da Black Friday.', points: { planejador: 3 } },
          { text: 'Procuro um cupom pra baixar ainda mais.', points: { garimpeiro: 3, impulsivo: 1 } },
        ],
      },
      {
        question: 'Quando você começa a se preparar pra Black Friday?',
        options: [
          { text: 'Semanas antes, com lista e orçamento.', points: { planejador: 3, cacador: 1 } },
          { text: 'Só quando as ofertas começam a pipocar.', points: { impulsivo: 3 } },
          { text: 'Acompanho os preços o ano todo, então já sei o que vale.', points: { cacador: 3 } },
          { text: 'Vou garimpando ofertas do dia e cupons conforme aparecem.', points: { garimpeiro: 3, impulsivo: 1 } },
        ],
      },
      {
        question: 'O que mais pesa na sua decisão de comprar?',
        options: [
          { text: 'O medo de perder a oferta.', points: { impulsivo: 3 } },
          { text: 'Saber que o preço realmente caiu.', points: { cacador: 3 } },
          { text: 'Estar dentro do que eu planejei gastar.', points: { planejador: 3 } },
          { text: 'Conseguir um desconto extra no fim.', points: { garimpeiro: 3 } },
        ],
      },
      {
        question: 'Chegou um aviso de que o produto da sua lista ficou mais barato. E agora?',
        options: [
          { text: 'Compro agora mesmo.', points: { impulsivo: 3 } },
          { text: 'Vejo se a queda é real ou se o preço só voltou ao normal.', points: { cacador: 3 } },
          { text: 'Confiro se ainda cabe no orçamento e decido.', points: { planejador: 3 } },
          { text: 'Procuro cupom ou cashback antes de fechar.', points: { garimpeiro: 3 } },
        ],
      },
      {
        question: 'Seu carrinho está cheio. O que acontece antes de pagar?',
        options: [
          { text: 'Pago logo: tenho medo de o estoque acabar.', points: { impulsivo: 3 } },
          { text: 'Comparo item por item com outras lojas.', points: { cacador: 3, garimpeiro: 1 } },
          { text: 'Reviso a lista: o que não estava nela, eu tiro.', points: { planejador: 3 } },
          { text: 'Testo cupons até achar um que funcione.', points: { garimpeiro: 3 } },
        ],
      },
      {
        question: 'Qual frase combina mais com você?',
        options: [
          { text: '"Vi, gostei, comprei."', points: { impulsivo: 3 } },
          { text: '"Confio nos números, não na etiqueta."', points: { cacador: 3 } },
          { text: '"Quem planeja, economiza."', points: { planejador: 3 } },
          { text: '"Eu nunca pago o preço cheio."', points: { garimpeiro: 3 } },
        ],
      },
    ],
    results: [
      {
        id: 'cacador',
        title: 'O Caçador de Preço Real',
        tagline: 'Você não acredita em etiqueta: acredita em histórico.',
        description:
          'Antes de comprar, você quer saber se o desconto é de verdade. É o perfil que mais escapa da "metade do dobro" — e que mais aproveita quando uma queda real aparece.',
        tips: [
          'Compare o preço de hoje com o histórico do produto, não só com o preço riscado.',
          'Ative o aviso de queda de preço nos itens que você quer e espere o alerta.',
          'Desconfie de desconto enorme em produto que mal mexeu de preço nos últimos meses.',
        ],
        cta: { label: 'Ver quedas de preço confirmadas', to: '/black-friday/' },
      },
      {
        id: 'impulsivo',
        title: 'O Impulsivo do Carrinho',
        tagline: 'Quando a oferta aparece, você já está pagando.',
        description:
          'Você aproveita rápido, e isso rende bons negócios. Mas é também o perfil mais exposto à falsa urgência ("últimas unidades!"), então o truque é dar um tempo antes de pagar.',
        tips: [
          'Espere 24 horas antes de fechar: se ainda quiser, compre.',
          'Olhe o histórico de preço antes — a urgência quase sempre é só marketing.',
          'Lembre que compra pela internet pode ser desfeita em até 7 dias (CDC, art. 49).',
        ],
        cta: { label: 'Ativar o aviso de queda de preço', to: '/favoritos/' },
      },
      {
        id: 'planejador',
        title: 'O Planejador de Lista',
        tagline: 'Você chega na Black Friday com a lista pronta.',
        description:
          'Sabe o que quer, quanto quer gastar e quando comprar. O cuidado é não perder a janela certa de preço por esperar demais — ou por não ter um preço-alvo.',
        tips: [
          'Monte a lista com antecedência e acompanhe os preços até a data.',
          'Compare os produtos lado a lado antes de decidir entre dois modelos.',
          'Defina um preço-alvo por item: chegou nele, comprou.',
        ],
        cta: { label: 'Comparar produtos lado a lado', to: '/comparar/' },
      },
      {
        id: 'garimpeiro',
        title: 'O Garimpeiro de Cupom',
        tagline: 'Você nunca paga o preço cheio.',
        description:
          'Cupom, cashback, parcelamento: você sempre acha um jeito de baixar mais. O cuidado é não deixar o cupom decidir a compra por você.',
        tips: [
          'Confira se o preço sem o cupom já era bom: desconto sobre preço inflado não é economia.',
          'Cupom tem regra (valor mínimo, categoria, prazo) — leia antes de montar o carrinho.',
          'Compare o preço final, com frete, entre as lojas.',
        ],
        cta: { label: 'Ver cupons ativos', to: '/cupons/' },
      },
    ],
  },
}
