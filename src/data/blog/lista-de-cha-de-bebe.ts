import type { BlogPost } from '../../types/blog'

export const listaDeChaDeBebe: BlogPost = {
  slug: 'lista-de-cha-de-bebe',
  title: 'Lista de chá de bebê completa: o que não pode faltar',
  metaTitle: 'Lista de Chá de Bebê Completa (por categoria) | Compare Ofertas',
  metaDescription:
    'Checklist de chá de bebê organizado por categoria — quarto, roupinha, higiene e passeio — e como montar a lista online sem repetir presente.',
  keyword: 'lista de chá de bebê',
  secondaryKeywords: ['lista de chá de bebê completa', 'o que colocar na lista de chá de bebê', 'chá de bebê o que pedir'],
  publishedAt: '2026-08-16',
  excerpt:
    'Checklist de chá de bebê organizado por categoria — quarto, roupinha, higiene e passeio — e como montar a lista online sem repetir presente.',
  relatedSlugs: ['o-que-pedir-no-cha-revelacao', 'melhores-presentes-para-recem-nascido', 'quanto-custa-montar-um-enxoval-de-bebe'],
  blocks: [
    {
      type: 'p',
      text: 'Num chá de bebê, é comum vários convidados quererem presentear ao mesmo tempo — e sem uma lista organizada, é fácil ganhar cinco pacotes de fralda tamanho RN e nenhum no tamanho seguinte, pra quando o bebê já tiver crescido. Organizar por categoria, com tamanho e quantidade, resolve isso.',
    },
    { type: 'h2', text: 'Quarto e sono' },
    {
      type: 'ul',
      items: ['Berço ou mini berço', 'Colchão e kit berço (lençol + protetor)', 'Edredom ou manta leve', 'Luminária de vigia', 'Termômetro de ambiente'],
    },
    { type: 'h2', text: 'Roupinha, por tamanho' },
    {
      type: 'p',
      text: 'Bebê cresce rápido — pedir "roupinha" sem especificar tamanho costuma resultar em muita peça RN (que serve por poucas semanas) e pouca coisa nos tamanhos seguintes. Vale dividir o pedido em RN, P e M na própria lista, pra os convidados escolherem o que ainda falta.',
    },
    { type: 'h2', text: 'Higiene e cuidados' },
    {
      type: 'ul',
      items: ['Banheira', 'Kit de higiene (escova, tesourinha, termômetro)', 'Fralda descartável ou de pano, por tamanho', 'Pomada e produtos de banho'],
    },
    { type: 'h2', text: 'Passeio e primeiros brinquedos' },
    {
      type: 'p',
      text: 'Carrinho, bebê conforto e bolsa maternidade costumam ser os itens de maior valor da lista — bons candidatos pra dividir entre vários convidados. Pra chocalhos e brinquedos sensoriais dos primeiros meses, a seção de [brinquedos](/brinquedos/categoria/geral) reúne opções de várias lojas parceiras.',
    },
    { type: 'h2', text: 'Um jeito de guardar, não só de usar' },
    {
      type: 'p',
      text: 'Joias infantis (pingente, corrente fina) costumam entrar como presente de padrinhos ou avós — algo pra guardar, não pra usar já. Existe uma seção específica de [joias infantis](/joias/categoria/infantil) pra esse tipo de escolha.',
    },
    { type: 'h2', text: 'Como organizar tudo isso numa lista só' },
    {
      type: 'p',
      text: 'Uma lista de presentes online reúne os itens de lojas diferentes num link único — cada convidado vê o que falta, escolhe, e o item some da lista assim que a compra é confirmada pela própria loja. Resolve o problema de coordenar entre família e amigos sem um grupo de WhatsApp cheio de "já comprei isso?".',
    },
  ],
  faq: [
    {
      q: 'Quantas fraldas colocar na lista de chá de bebê?',
      a: 'Menos importa a quantidade fixa e mais dividir por tamanho — RN dura poucas semanas, então vale pedir mais nos tamanhos P e M do que em RN.',
    },
    {
      q: 'Vale a pena pedir carrinho e bebê conforto no chá de bebê?',
      a: 'São os itens de maior valor da lista — bons candidatos pra vários convidados dividirem o custo juntos, em vez de ficar com um único presente caro.',
    },
    {
      q: 'Como faço pra ninguém repetir presente?',
      a: 'Montando a lista com os itens específicos (categoria, tamanho, quantidade) e compartilhando um link único — cada item comprado sai da lista automaticamente.',
    },
  ],
}
