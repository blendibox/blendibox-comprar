import type { BlogPost } from '../../types/blog'

const AFFILIATE_LINK =
  'https://www.awin1.com/cread.php?awinmid=120918&awinaffid=2104315&ued=https%3A%2F%2Fwww.allugator.com%2Fhow-it-works'

export const allugatorAssinaturaDeEletronicos: BlogPost = {
  slug: 'allugator-assinatura-de-eletronicos',
  title: 'Allugator (Allu): como funciona a assinatura de eletrônicos',
  metaTitle: 'Allugator (Allu): Como Funciona a Assinatura de Eletrônicos | Compare Ofertas',
  metaDescription:
    'Entenda como funciona a Allugator (Allu): assinatura de celular, notebook, videogame e outros eletrônicos sem comprometer o limite do cartão. Veja categorias, funcionamento e vantagens.',
  keyword: 'allugator',
  secondaryKeywords: ['allu assinatura', 'assinatura de eletrônicos', 'como funciona allugator', 'alugar celular por assinatura'],
  publishedAt: '2026-08-23',
  excerpt:
    'A Allugator (Allu) é um serviço brasileiro de assinatura de eletrônicos — celular, notebook, videogame e mais — com pagamento mensal, sem comprometer o limite do cartão. Veja como funciona.',
  blocks: [
    {
      type: 'p',
      text: 'A Allugator, também conhecida como Allu, é uma empresa brasileira (fundada em 2016) especializada em assinatura de eletrônicos. Em vez de comprar um aparelho à vista ou parcelado no cartão, você assina o acesso a ele por um período — celular, notebook, videogame e outras categorias — pagando mensalmente, sem ocupar o limite do seu cartão de crédito.',
    },
    { type: 'h2', text: 'Como funciona' },
    {
      type: 'ol',
      items: [
        'Escolha o eletrônico que quer assinar no catálogo.',
        'Faça o pagamento e envie os documentos pedidos pra análise de segurança.',
        'Receba o aparelho em casa — a Allugator oferece frete grátis pra todo o Brasil.',
        'Ao fim do plano escolhido, você pode devolver o aparelho (que passa por reparo, limpeza de dados e é reaproveitado — a própria empresa chama isso de "ciclo sustentável"), renovar por um período novo, ou comprar o aparelho, dependendo do tempo mínimo de permanência exigido pelo plano.',
      ],
    },
    {
      type: 'p',
      text: 'Os planos de fidelidade são flexíveis: quanto mais tempo você ficar com o aparelho, menor tende a ser o valor da assinatura — e não há necessidade de comprometer o limite do cartão, já que o pagamento é recorrente mês a mês.',
    },
    { type: 'h2', text: 'O que dá pra assinar' },
    {
      type: 'ul',
      items: [
        'Smartphones',
        'Computadores e notebooks',
        'Telas e monitores',
        'Consoles e videogames',
        'Tablets',
        'Wearables (relógios inteligentes, fones)',
        'Eletrodomésticos',
        'Produtos de fitness',
        'Produtos para bebê',
      ],
    },
    { type: 'h2', text: 'Vantagens' },
    {
      type: 'ul',
      items: [
        'Pagamento recorrente mensal, sem travar o limite do cartão de crédito',
        'Frete grátis para todo o Brasil',
        'Proteção contra danos acidentais via allu.care (cobertura de parte do valor do aparelho em caso de dano)',
        'Acesso a versões mais atualizadas de tecnologia sem precisar revender o aparelho antigo',
        'Modelo de economia circular: aparelhos devolvidos são reparados e reaproveitados em vez de virarem lixo eletrônico',
      ],
    },
    { type: 'h2', text: 'Pra quem vale a pena' },
    {
      type: 'p',
      text: 'Faz mais sentido pra quem quer acesso a um aparelho atualizado sem parcelar no cartão, ou pra quem não tem certeza de que vai precisar do eletrônico por muito tempo — o modelo de assinatura permite devolver ou trocar sem ficar com um aparelho parado depois que o uso muda. Já quem já sabe que vai usar o mesmo aparelho por anos, sem trocar, tende a sair mais em conta comprando à vista ou parcelado direto — vale comparar o custo total da assinatura no seu prazo pretendido antes de decidir.',
    },
    {
      type: 'p',
      text: `Quer conhecer os planos disponíveis? [Veja como funciona a assinatura da Allugator](${AFFILIATE_LINK}) e escolha o eletrônico certo pra você.`,
    },
  ],
  faq: [
    {
      q: 'Allugator é aluguel ou assinatura?',
      a: 'É um modelo de assinatura: você paga mensalmente pelo acesso ao aparelho, com planos de fidelidade que ficam mais em conta quanto mais tempo você permanece. Ao fim do plano, dá pra devolver, renovar ou, dependendo do tempo mínimo de permanência, comprar o aparelho.',
    },
    {
      q: 'O que acontece com o aparelho quando devolvo?',
      a: 'A Allugator recolhe, faz reparo e limpeza completa de dados, e o aparelho volta pro catálogo pra ser assinado por outro cliente — parte do modelo de economia circular da empresa, que reduz o descarte de lixo eletrônico.',
    },
    {
      q: 'Preciso comprometer o limite do cartão de crédito?',
      a: 'Não é obrigatório — o pagamento é recorrente, mês a mês, diferente de um parcelamento tradicional que trava o limite do cartão inteiro de uma vez.',
    },
    {
      q: 'Que tipo de eletrônico dá pra assinar?',
      a: 'Smartphones, notebooks e computadores, telas/monitores, consoles de videogame, tablets, wearables, eletrodomésticos, produtos de fitness e produtos para bebê.',
    },
  ],
}
