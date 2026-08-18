import type { BlogPost } from '../../types/blog'

export const livrosMaisVendidosNaAmazon: BlogPost = {
  slug: 'livros-mais-vendidos-na-amazon',
  title: 'Os livros mais vendidos da Amazon, com nota e avaliações reais',
  metaTitle: 'Livros Mais Vendidos na Amazon (Nota e Avaliações Reais) | Compare Ofertas',
  metaDescription:
    'Ranking dos livros mais avaliados da Amazon Brasil agora, com nota, número de avaliações e preço reais — direto das listas de mais vendidos e lançamentos.',
  keyword: 'livros mais vendidos amazon',
  secondaryKeywords: ['melhores livros para comprar', 'livros com mais avaliações amazon', 'ranking de livros amazon br'],
  publishedAt: '2026-08-18',
  excerpt:
    'Ranking dos livros mais avaliados da Amazon Brasil agora, com nota, número de avaliações e preço reais — direto das listas de mais vendidos e lançamentos.',
  blocks: [
    {
      type: 'p',
      text: 'Reunimos aqui os livros com mais avaliações entre os mais vendidos e lançamentos da Amazon Brasil, ordenados pelo número de avaliações — o sinal mais honesto de que muita gente já comprou e leu, não só um selo de "mais vendido" genérico. Nota e quantidade de avaliações são as que estavam na página do produto no momento da publicação; preço muda com frequência, então confira o valor atualizado antes de comprar.',
    },
    { type: 'h2', text: 'Ranking por número de avaliações' },
    {
      type: 'ol',
      items: [
        '[Verity](/amazon/verity-8501117846/) — Colleen Hoover — R$ 35,60 — nota 4,8, 85.328 avaliações',
        '[Jantar secreto: Edição de colecionador](/amazon/jantar-secreto-edicao-de-colecionador-8535946039/) — Raphael Montes — R$ 58,01 — nota 4,6, 25.856 avaliações',
        '[O acordo (Nova edição)](/amazon/o-acordo-nova-edicao-amores-improvaveis-vol-1-8584395717/) — Elle Kennedy — R$ 28,14 — nota 4,8, 21.525 avaliações',
        '[Orgulho e Preconceito - Luxo Capa Dura](/amazon/orgulho-e-preconceito-jane-austen-luxo-capa-dura-6583970104/) — Jane Austen — R$ 36,13 — nota 4,7, 16.650 avaliações',
        '[Alice no País das Maravilhas - Luxo Capa Dura](/amazon/alice-no-pais-das-maravilhas-lewis-carroll-luxo-capa-dura-6583970090/) — Lewis Carroll — R$ 31,96 — nota 4,8, 14.075 avaliações',
        '[Memórias do Subsolo - Luxo Capa Dura](/amazon/memorias-do-subsolo-dostoievski-luxo-capa-dura-6583970082/) — Fiódor Dostoiévski — R$ 27,96 — nota 4,8, 7.145 avaliações',
        '[O Pequeno Príncipe - Edição de luxo](/amazon/o-pequeno-principe-edicao-de-luxo-com-capa-dura-almofadada-e-aquarelas-originais-6559801365/) — Antoine de Saint-Exupéry — R$ 13,20 — nota 4,9, 3.013 avaliações',
        '[O diário de uma princesa desastrada 4](/amazon/o-diario-de-uma-princesa-desastrada-4-o-misterio-do-rei-8542241134/) — Maidy Lacerda — R$ 61,13 — nota 4,9, 1.635 avaliações',
        '[A canção dos dragões perdidos](/amazon/a-cancao-dos-dragoes-perdidos-a-continuacao-de-o-despertar-da-lua-caida-em-capa-6559706079/) — Sarah A. Parker — R$ 73,59 — nota 4,8, 607 avaliações',
        '[As coisas belas e preciosas](/amazon/as-coisas-belas-e-preciosas-8530601823/) — Rebecca Yarros — R$ 64,47 — nota 4,7, 529 avaliações',
        '[Vade Mecum Saraiva Tradicional - 42ª Edição 2026](/amazon/vade-mecum-saraiva-tradicional-42-edicao-2026-6551772390/) — Equipe Saraiva Jur — R$ 209,00 — nota 5,0, 15 avaliações',
        '[Quando](/amazon/quando-8501926949/) — Carla Madeira — R$ 59,75 — nota 4,8, 7 avaliações',
      ],
    },
    { type: 'h2', text: 'Lançamentos sem avaliação ainda' },
    {
      type: 'p',
      text: 'Esses dois são pré-venda ou edição recém-lançada — cedo demais pra ter avaliação acumulada, mas entraram na lista de mais vendidos pelo volume de pedidos.',
    },
    {
      type: 'ul',
      items: [
        '[O espelho dos finais infinitos - Edição limitada](/amazon/o-espelho-dos-finais-infinitos-era-uma-vez-um-coracao-partido-vol-3-5-capa-dura-858235889x/) — Stephanie Garber — R$ 89,80',
        '[Corte de espinhos e rosas 6 (acompanha sobrecapa)](/amazon/corte-de-espinhos-e-rosas-6-acompanha-sobrecapa-6559817830/) — Sarah J. Maas — R$ 74,90',
      ],
    },
    { type: 'h2', text: 'Como usamos nota e avaliação aqui' },
    {
      type: 'p',
      text: 'Só mostramos nota e número de avaliações quando o produto realmente tem os dois — nunca estimamos ou arredondamos pra cima. Livro sem avaliação aparece sem avaliação, não com um "novo" genérico inventado.',
    },
  ],
  faq: [
    {
      q: 'Como foi montado esse ranking?',
      a: 'A partir das listas reais de mais vendidos e lançamentos da Amazon Brasil em livros, ordenado pelo número de avaliações de cada título — não é uma opinião nossa sobre qual livro é melhor.',
    },
    {
      q: 'O preço mostrado é o preço atual?',
      a: 'É o preço que estava na Amazon no momento da publicação. Preço de livro muda com frequência — confira o valor atual na página do produto antes de comprar.',
    },
    {
      q: 'Por que alguns livros da lista não têm nota?',
      a: 'Porque são pré-venda ou edição muito recente — ainda não teve tempo de acumular avaliação, mesmo estando entre os mais vendidos por volume de pedidos.',
    },
  ],
}
