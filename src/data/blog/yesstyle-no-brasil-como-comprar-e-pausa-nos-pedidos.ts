import type { BlogPost } from '../../types/blog'

// Link de afiliado (Awin, advertiser 131618 = YesStyle BR) pra home da loja.
// clickref identifica este artigo no relatório da Awin, pra medir só o que ele
// traz. Fica numa frase CONDICIONAL ("se a pausa já acabou"): enquanto a
// YesStyle não enviar pro Brasil, o artigo não pode empurrar ninguém a comprar.
const AFFILIATE_LINK = 'https://www.awin1.com/cread.php?awinmid=131618&awinaffid=2104315&clickref=blog-yesstyle'
// Mesmo destino, clickref diferente: o relatório da Awin separa quem clicou no
// link do topo (logo abaixo do título) de quem clicou no do fim do artigo.
const AFFILIATE_LINK_TOPO = 'https://www.awin1.com/cread.php?awinmid=131618&awinaffid=2104315&clickref=blog-yesstyle-topo'

// Aviso oficial da própria YesStyle (central de ajuda). Link direto, NÃO é de
// afiliado — por isso o host está em EDITORIAL_HOSTS (BlogPostPage) e sai sem
// rel="sponsored" (e sem contar como clique de loja no Pinterest).
const PAUSE_NOTICE = 'https://www.yesstyle.com/pt/temporary-pause-of-all-orders-to-brazil/help/section.html/hsi.2855'

// Página "Frete e Prazo de Entrega" da central de ajuda (tabela por país). Também
// link direto, sem afiliado.
const SHIPPING_PAGE = 'https://www.yesstyle.com/pt/help/section.html/hsi.732'

// Página comemorativa dos 20 anos da loja (lançada em julho de 2006). Link direto.
const ANNIVERSARY_PAGE = 'https://www.yesstyle.com/pt/20-years-of-yes-anniversary'

export const yesstyleNoBrasilComoComprarEPausaNosPedidos: BlogPost = {
  slug: 'yesstyle-no-brasil-como-comprar-e-pausa-nos-pedidos',
  title: 'YesStyle no Brasil: é confiável, como funciona a importação e a pausa nos pedidos',
  metaTitle: 'YesStyle no Brasil: Como Comprar, Impostos e Pausa nos Pedidos | Compare Ofertas',
  metaDescription:
    'O que é a YesStyle, se é confiável, como funciona a importação e os impostos no Brasil — e o aviso oficial de pausa nos pedidos para o Brasil. Leia antes de comprar.',
  keyword: 'yesstyle brasil',
  secondaryKeywords: [
    'yesstyle é confiável',
    'yesstyle entrega no brasil',
    'yesstyle imposto de importação',
    'como comprar na yesstyle',
    'yesstyle pausa pedidos brasil',
    'k-beauty yesstyle',
    'marcas de k-beauty',
    'k-pop skincare',
  ],
  publishedAt: '2026-11-25',
  excerpt:
    'A YesStyle é uma loja online de beleza e moda asiática sediada em Hong Kong. Veja como a marca é vista, como funciona a importação pro Brasil e o que a própria loja diz sobre a pausa nos pedidos.',
  blocks: [
    {
      type: 'p',
      text: `[Visite a página da YesStyle](${AFFILIATE_LINK_TOPO}) (link de afiliado). Antes de comprar, leia o aviso sobre a pausa nos pedidos para o Brasil, logo abaixo e no fim do artigo.`,
    },
    {
      type: 'p',
      text: 'A YesStyle é uma das lojas online mais conhecidas de beleza e moda asiática, com muito produto de skincare coreano (K-beauty). Só que, antes de qualquer coisa, um aviso: a própria loja publicou que pausou temporariamente os pedidos para o Brasil. Explicamos isso no fim do artigo, com o link oficial pra você conferir se a situação mudou.',
    },
    { type: 'h2', text: 'O que é a YesStyle' },
    {
      type: 'p',
      text: `A YesStyle foi lançada em julho de 2006 como o braço de moda da YesAsia, varejista de produtos asiáticos que existe desde o fim dos anos 1990. Em 2026 a loja completa 20 anos e mantém uma [página comemorativa dos 20 anos](${ANNIVERSARY_PAGE}) no site. A controladora, a YesAsia Holdings, tem sede em Hong Kong e abriu capital na bolsa de Hong Kong em 2021. Segundo a empresa, o centro de distribuição principal fica em Hong Kong, com escritórios também na Coreia e no Japão.`,
    },
    {
      type: 'p',
      text: 'A YesStyle não fabrica nada: ela revende produtos de várias marcas. Os números abaixo são os que a própria empresa divulga (não conferimos de forma independente):',
    },
    {
      type: 'ul',
      items: [
        'mais de 11 milhões de clientes ativos por mês;',
        'mais de 800 marcas de beleza;',
        'cerca de 300 mil itens de moda;',
        'categorias mais vendidas: skincare coreano, cosméticos, moda urbana e streetwear.',
      ],
    },
    { type: 'h2', text: 'Qual a relevância da marca no mundo' },
    {
      type: 'p',
      text: 'Pelo que a empresa informa, é um varejista em escala internacional, ligado a uma controladora listada em bolsa. Ou seja, não é uma lojinha de ocasião. Isso diz que a empresa existe e é grande. Não diz nada sobre o prazo, o atendimento ou o que acontece com o seu pedido no Brasil, que são coisas diferentes (veja a próxima seção).',
    },
    { type: 'h2', text: 'Como a YesStyle é vista no Brasil' },
    {
      type: 'p',
      text: 'Não encontramos um consenso, e vale ser direto sobre os limites do que pesquisamos. Não localizamos uma página oficial da empresa no Reclame Aqui com nota verificada, então antes de comprar pesquise o nome da loja lá.',
    },
    {
      type: 'ul',
      items: [
        'Em sites de reclamação europeus, como o Portal da Queixa (de Portugal, não do Brasil), a satisfação aparece baixa. As queixas se concentram em atraso, encomenda extraviada e rastreio sem atualização.',
        'Nas avaliações do Trustpilot as opiniões são mistas: tem quem elogie a qualidade e os preços e quem relate entregas que passaram de um mês.',
        'O próprio aviso da YesStyle sobre o Brasil fala em problemas de retenção na alfândega, o que combina com o principal ponto de atenção: o prazo de entrega.',
      ],
    },
    { type: 'h2', text: 'Os produtos são de qualidade?' },
    {
      type: 'p',
      text: 'Depende da marca e do produto, não da loja. Como a YesStyle revende vários fabricantes, a qualidade de um sérum coreano é a da marca dele, não a da YesStyle. Nas fontes que consultamos, a queixa principal é prazo e rastreio, não produto falsificado. Isso não prova que nunca aconteça, então vale tomar alguns cuidados:',
    },
    {
      type: 'ul',
      items: [
        'prefira marcas que você já conhece ou que tenham avaliação consistente em mais de um lugar;',
        'leia as avaliações do produto específico, não só da loja;',
        'confira a lista de ingredientes e o prazo de validade, que variam entre produtos e lotes;',
        'se tem pele sensível ou alergias, faça o teste de contato antes de usar o produto no rosto inteiro;',
        'comece com um pedido pequeno antes de montar uma rotina inteira.',
      ],
    },
    { type: 'h2', text: 'Marcas conhecidas e a ligação com o K-pop' },
    {
      type: 'p',
      text: 'A YesStyle diz ser parceira autorizada de mais de 400 marcas coreanas de beleza (informação da própria loja), e destaca marcas como Anua, Innisfree, SKIN1004, medicube e dasique. Na imprensa brasileira de beleza, aparecem com frequência COSRX, Beauty of Joseon, SKIN1004, TIRTIR, Banila Co, Laneige e TOCOBO, e uma reportagem aponta a COSRX como a marca coreana mais conhecida por aqui. Algumas delas já são vendidas oficialmente no Brasil, em farmácias e perfumarias, segundo reportagens. Vale comparar antes de importar.',
    },
    {
      type: 'p',
      text: 'E o K-pop? Pelo que encontramos, a YesStyle é revendedora e não tem linha própria ligada a nenhum grupo. O que existe é o costume de marcas contratarem idols como rosto das campanhas. Alguns exemplos citados pela imprensa em 2025 e 2026 (contratos mudam, então confira o anúncio oficial da marca):',
    },
    {
      type: 'ul',
      items: [
        'Innisfree: Wonyoung, do IVE, é embaixadora global da marca desde 2021;',
        'Dr.Jart+: o grupo ENHYPEN foi anunciado como primeiro embaixador global da marca;',
        'Anua: a cantora e atriz Bae Suzy foi escolhida como embaixadora;',
        'fora da K-beauty: Jungkook, do BTS, é embaixador global da Chanel Fragrance & Beauty, e Lisa, do BLACKPINK, é embaixadora da MAC Cosmetics e da Dior.',
      ],
    },
    {
      type: 'p',
      text: 'Não conferimos se cada uma dessas marcas está no catálogo atual da YesStyle, então procure o nome na loja antes de contar com ela. E lembre: ser o rosto de uma marca é estratégia de marketing, não garantia de qualidade nem de que o produto combina com a sua pele. Vale o mesmo critério da seção anterior: ingredientes, validade e avaliações do produto.',
    },
    { type: 'h2', text: 'Como funciona a importação' },
    {
      type: 'p',
      text: 'Comprar da YesStyle é uma importação, mesmo que pareça uma compra de loja normal. O caminho costuma ser este:',
    },
    {
      type: 'ol',
      items: [
        'Você escolhe os produtos. Os preços aparecem em dólar (o site mostra "Brasil / USD").',
        'Segundo a própria YesStyle, todos os pedidos são processados e enviados do armazém da empresa em Hong Kong.',
        'A encomenda chega ao Brasil e passa pela fiscalização da Receita Federal. É nessa etapa que a YesStyle diz ter tido problemas de retenção.',
        'Se houver imposto, ele precisa ser pago. A YesStyle afirma em sua central de ajuda que o cliente é o importador e responde por impostos e taxas de importação, e que não garante se haverá cobrança.',
        'Depois da liberação, a transportadora local faz a entrega.',
      ],
    },
    { type: 'h3', text: 'Frete e prazo' },
    {
      type: 'p',
      text: `Segundo a [tabela de frete e prazo de entrega da YesStyle](${SHIPPING_PAGE}) para o Brasil, em vigor desde 17 de novembro de 2026, existe um único método de envio, o Padrão. Valores e prazos podem mudar, então confira a página oficial antes de comprar:`,
    },
    {
      type: 'ul',
      items: [
        'frete grátis em pedidos a partir de US$ 80, e US$ 15 abaixo disso;',
        'prazo estimado de 21 a 25 dias úteis, ou seja, de quatro a cinco semanas;',
        'rastreio: a tabela do Brasil marca que o envio Padrão tem código de rastreamento, mas na descrição geral do Padrão a loja diz que o código "pode ou não" existir. Quando existe, o acompanhamento é pelos Correios locais, e o número aparece em "Minha Conta", em Envio e Rastreamento do histórico de pedidos;',
        'envio por serviço postal: a loja descreve o Padrão como envio pelos Correios, via eParcel ou Encomenda Registrada, e diz que escolhe o agente de envio de cada pedido e pode trocá-lo sem aviso;',
        'taxas de embalagem pra presente não entram no cálculo do frete.',
      ],
    },
    {
      type: 'p',
      text: 'A YesStyle também descreve o Envio Expresso (transportadoras internacionais ou EMS) e o Envio Rápido (só em países selecionados), mas a tabela do Brasil mostra apenas o Padrão.',
    },
    {
      type: 'p',
      text: 'É uma estimativa da loja, não uma garantia, e o frete não inclui eventuais impostos de importação (veja a seção a seguir).',
    },
    { type: 'h3', text: 'Quanto de imposto?' },
    {
      type: 'p',
      text: 'As regras mudaram em 2026 e os textos que encontramos (portais e reportagens, não a Receita) divergem em alguns pontos. O que eles descrevem para compras de pessoa física:',
    },
    {
      type: 'ul',
      items: [
        'até US$ 50, em lojas certificadas no programa Remessa Conforme: sem imposto de importação desde maio de 2026, mas com ICMS, entre 17% e 20% conforme o estado;',
        'de US$ 50 até US$ 3.000: imposto de importação de 60%, com desconto fixo de US$ 30 no valor calculado, mais o ICMS.',
      ],
    },
    {
      type: 'p',
      text: 'Não confirmamos se a YesStyle é certificada no Remessa Conforme, e isso muda como e quando a cobrança acontece. Por isso não tratamos o preço em dólar da loja como o custo final: antes de comprar, confira a regra vigente no site da Receita Federal e o valor que o checkout mostra.',
    },
    { type: 'h2', text: 'Pedidos para o Brasil estão pausados?' },
    {
      type: 'p',
      text: `A YesStyle publicou um aviso oficial de pausa temporária de todos os pedidos para o Brasil. Em resumo, o aviso diz que, nas últimas semanas, a loja enfrentou problemas com envios para o Brasil assim que chegam à alfândega, e que a transportadora local está trabalhando para normalizar a situação. Pra evitar que mais pedidos fiquem retidos, a empresa pausou os envios. Diz também que já contatou os clientes afetados e que pretende voltar a atender o Brasil em breve.`,
    },
    {
      type: 'p',
      text: `Conferimos esse aviso em 25 de novembro de 2026. Ele não traz data de publicação, então não dá pra saber há quanto tempo está no ar. Leia o [aviso oficial da YesStyle](${PAUSE_NOTICE}) e veja se ele ainda existe antes de qualquer compra. Enquanto estiver no ar, considere a loja indisponível pra entregas no Brasil.`,
    },
    {
      type: 'p',
      text: 'Um detalhe que merece atenção: a mesma central de ajuda tem uma tabela de frete e prazo para o Brasil, em vigor desde 17 de novembro de 2026 (também conferida em 25 de novembro). Isso não confirma que os envios voltaram: o aviso de pausa não tem data e a tabela pode apenas listar o destino. Na dúvida, vale mais o aviso, que é a informação específica sobre a situação do Brasil. Quem confirma de verdade se o pedido passa é o checkout ou o atendimento da loja.',
    },
    {
      type: 'p',
      text: `Se a pausa já acabou e você quer conhecer a loja, este é o [link da YesStyle](${AFFILIATE_LINK}) (link de afiliado). Compare Ofertas é parceiro afiliado da YesStyle: se você comprar pelo nosso link, podemos receber uma comissão, sem custo nenhum a mais pra você. A pausa nos pedidos não muda nada do que escrevemos aqui, e preferimos contar isso a deixar você descobrir no checkout.`,
    },
  ],
  faq: [
    {
      q: 'A YesStyle entrega no Brasil?',
      a: 'A YesStyle publicou um aviso oficial de pausa temporária de todos os pedidos para o Brasil, por causa de retenções na alfândega, e o aviso não tem data. A central de ajuda também traz uma tabela de frete para o Brasil, em vigor desde 17 de novembro de 2026, o que não prova que os envios voltaram. Confira o aviso oficial e o checkout antes de comprar.',
    },
    {
      q: 'A YesStyle é confiável?',
      a: 'É uma empresa grande, de uma controladora listada na bolsa de Hong Kong, mas as opiniões de clientes são mistas. As queixas que encontramos se concentram em atraso, extravio e rastreio, não em produto. Pesquise o nome da loja no Reclame Aqui antes de comprar.',
    },
    {
      q: 'Preciso pagar imposto de importação na YesStyle?',
      a: 'Provavelmente haverá algum tributo. A YesStyle diz que o cliente é o importador e responde por impostos e taxas, e não garante se haverá cobrança. O valor depende das regras vigentes da Receita Federal, que mudaram em 2026. Confira lá e no checkout.',
    },
    {
      q: 'Quanto tempo demora uma encomenda da YesStyle pro Brasil?',
      a: 'A tabela de frete da YesStyle para o Brasil, em vigor desde 17 de novembro de 2026, estima de 21 a 25 dias úteis no envio Padrão, ou seja, de quatro a cinco semanas, com código de rastreio. É uma estimativa: relatos de clientes variam, com casos acima de um mês, e a própria loja reconhece retenções na alfândega brasileira.',
    },
    {
      q: 'Quanto custa o frete da YesStyle pro Brasil?',
      a: 'Pela tabela da loja, o envio Padrão é grátis em pedidos a partir de US$ 80 e custa US$ 15 abaixo disso. O frete não inclui eventuais impostos de importação, que são do cliente.',
    },
    {
      q: 'Existe marca da YesStyle ligada a grupo de K-pop?',
      a: 'A YesStyle é uma revendedora, e não encontramos linha própria dela ligada a algum grupo. Várias marcas coreanas de beleza usam idols como embaixadores, como a Innisfree (Wonyoung, do IVE) e a Dr.Jart+ (ENHYPEN), segundo a imprensa. Confira no site da YesStyle se a marca que você procura está disponível.',
    },
    {
      q: 'De onde a YesStyle envia os pedidos?',
      a: 'Segundo a própria loja, todos os pedidos são processados e enviados do armazém da YesStyle em Hong Kong. Por isso a compra é tratada como importação.',
    },
  ],
}
