import type { BlogPost } from '../../types/blog'

// Link de afiliado (Awin, advertiser 131618 = YesStyle BR) pra home da loja.
// clickref identifica este artigo no relatório da Awin, pra medir só o que ele
// traz. Fica numa frase CONDICIONAL ("quando a loja voltar"): enquanto a
// YesStyle não enviar pro Brasil, o artigo não pode empurrar ninguém a comprar.
const AFFILIATE_LINK = 'https://www.awin1.com/cread.php?awinmid=131618&awinaffid=2104315&clickref=blog-yesstyle'
// Mesmo destino, clickref diferente: o relatório da Awin separa quem clicou no
// link do topo (logo abaixo do título) de quem clicou no do fim do artigo.
const AFFILIATE_LINK_TOPO = 'https://www.awin1.com/cread.php?awinmid=131618&awinaffid=2104315&clickref=blog-yesstyle-topo'

// Links diretos, sem afiliado. Os hosts estão em EDITORIAL_HOSTS (BlogPostPage),
// então saem sem rel="sponsored" e não contam como clique de loja no Pinterest.
// Aviso oficial de suspensão (central de ajuda da YesStyle).
const PAUSE_NOTICE = 'https://www.yesstyle.com/pt/temporary-pause-of-all-orders-to-brazil/help/section.html/hsi.2855'
// "Frete e Prazo de Entrega" da central de ajuda (tabela por país).
const SHIPPING_PAGE = 'https://www.yesstyle.com/pt/help/section.html/hsi.732'
// Página comemorativa dos 20 anos da loja (lançada em 2006).
const ANNIVERSARY_PAGE = 'https://www.yesstyle.com/pt/20-years-of-yes-anniversary'
// Fontes citadas.
const RECLAME_AQUI = 'https://www.reclameaqui.com.br/empresa/yes-style/'
const TRUSTPILOT = 'https://www.trustpilot.com/review/www.yesstyle.com'
const RECEITA_IMPOSTOS =
  'https://www.gov.br/receitafederal/pt-br/assuntos/aduana-e-comercio-exterior/manuais/remessas-postal-e-expressa/preciso-pagar-impostos-nas-compras-internacionais/quais-sao-os-impostos-devidos'
const RECEITA_CERTIFICADAS =
  'https://www.gov.br/receitafederal/pt-br/assuntos/aduana-e-comercio-exterior/manuais/remessas-postal-e-expressa/empresas-certificadas-no-programa-remessa-conforme-prc'

// SITUAÇÃO DA LOJA NO BRASIL: quando a YesStyle mudar o aviso, atualizar esta
// data, o quadro de destaque do topo, a resposta "A YesStyle entrega no Brasil?"
// e o updatedAt.
const STATUS_CHECKED = '26 de novembro de 2026'

export const yesstyleNoBrasilComoComprarEPausaNosPedidos: BlogPost = {
  slug: 'yesstyle-no-brasil-como-comprar-e-pausa-nos-pedidos',
  title: 'YesStyle é confiável? Vale a pena comprar e importar para o Brasil?',
  metaTitle: 'YesStyle é confiável? Vale a pena comprar no Brasil em 2026?',
  metaDescription:
    'A YesStyle é confiável? Veja a situação dos pedidos para o Brasil, impostos de importação, frete, reclamações e se vale a pena comprar.',
  keyword: 'yesstyle é confiável',
  secondaryKeywords: [
    'yesstyle entrega no brasil',
    'yesstyle é confiável no reclame aqui',
    'yesstyle imposto de importação',
    'como comprar na yesstyle',
    'yesstyle vale a pena',
  ],
  publishedAt: '2026-11-25',
  updatedAt: '2026-11-26',
  excerpt:
    'Veja a reputação da YesStyle, a suspensão dos envios para o Brasil, os impostos de importação, o frete e em que casos a compra vale a pena.',
  blocks: [
    {
      type: 'p',
      text: `[Visite a página da YesStyle](${AFFILIATE_LINK_TOPO}) (link de afiliado). Antes de comprar, leia o aviso sobre a suspensão dos envios para o Brasil, logo abaixo.`,
    },
    {
      type: 'p',
      text: 'A YesStyle é uma das lojas internacionais mais conhecidas de beleza asiática, especialmente pelos produtos de skincare coreano (K-beauty), maquiagem e cosméticos japoneses e coreanos. Mas será que vale a pena comprar na YesStyle morando no Brasil?',
    },
    {
      type: 'p',
      text: 'Antes de colocar qualquer produto no carrinho, existe um detalhe importante: **a YesStyle publicou um aviso oficial suspendendo temporariamente os pedidos e envios para o Brasil**, devido a problemas na liberação de encomendas pela alfândega.',
    },
    {
      type: 'p',
      text: 'Além disso, existem questões envolvendo impostos, prazos de entrega e atendimento ao consumidor que merecem atenção.',
    },
    {
      type: 'p',
      text: 'Neste guia, analisamos a reputação da loja, as condições de importação, os custos envolvidos e o que você precisa saber antes de comprar.',
    },
    {
      type: 'quote',
      text: `**Atenção: envios para o Brasil suspensos.** Na última consulta, em ${STATUS_CHECKED}, a suspensão dos pedidos para o Brasil ainda constava na [página oficial da YesStyle](${PAUSE_NOTICE}). Portanto, não recomendamos realizar uma compra enquanto a loja não confirmar a normalização dos envios.`,
    },

    { type: 'h2', text: 'O que é a YesStyle?' },
    {
      type: 'p',
      text: `Fundada em 2006, a YesStyle é uma loja internacional especializada na comercialização de produtos asiáticos. Ela faz parte do grupo YesAsia, empresa de Hong Kong que atua no comércio eletrônico de produtos de diferentes categorias. Em 2026 a loja completa 20 anos e mantém uma [página comemorativa dos 20 anos](${ANNIVERSARY_PAGE}) no site.`,
    },
    { type: 'p', text: 'Seu catálogo reúne produtos de diversas marcas, principalmente:' },
    {
      type: 'ul',
      items: [
        'Skincare coreano (K-beauty);',
        'Maquiagem e cosméticos;',
        'Produtos de cuidados com os cabelos;',
        'Moda feminina e masculina;',
        'Acessórios e itens de lifestyle.',
      ],
    },
    {
      type: 'p',
      text: 'É importante entender que a YesStyle funciona como varejista: ela comercializa produtos de diferentes fabricantes, não sendo a responsável pela fabricação da maioria dos cosméticos vendidos.',
    },
    {
      type: 'p',
      text: 'Entre as marcas encontradas em seu catálogo estão Anua, COSRX, Beauty of Joseon, SKIN1004, Innisfree, medicube e Laneige.',
    },
    {
      type: 'p',
      text: 'O principal atrativo é reunir marcas asiáticas em uma única plataforma, muitas vezes com preços promocionais e produtos difíceis de encontrar em lojas brasileiras.',
    },

    { type: 'h2', text: 'A YesStyle é confiável?' },
    {
      type: 'p',
      text: 'Essa pergunta precisa ser analisada por diferentes perspectivas. Uma empresa pode ser legítima, comercializar produtos originais e, ainda assim, apresentar problemas importantes na experiência de compra.',
    },
    { type: 'p', text: 'Consultamos duas plataformas de avaliação para entender melhor a situação.' },
    { type: 'h3', text: 'Reclame Aqui: situação preocupante no Brasil' },
    { type: 'p', text: 'Na consulta realizada em novembro de 2026, a página da YesStyle no Reclame Aqui apresentava:' },
    {
      type: 'ul',
      items: [
        'Empresa não verificada;',
        'Reputação classificada como Não Recomendada;',
        '283 reclamações entre 1º de maio e 31 de outubro de 2026;',
        'Nenhuma reclamação respondida no período apresentado.',
      ],
    },
    {
      type: 'p',
      text: '**Um contexto importante:** essa página não parece ser acompanhada pela empresa. Ela não é verificada, o perfil não tem descrição publicada e nenhuma reclamação do período foi respondida. Segundo o próprio Reclame Aqui, o selo "Não Recomendada" vem do fato de menos de 50% das reclamações terem resposta. Isso não apaga os relatos, mas indica que a loja não usa esse canal para atender. No Trustpilot, por exemplo, a página informa que ela respondeu a 99% das avaliações negativas.',
    },
    {
      type: 'p',
      text: 'Entre os relatos encontrados estão problemas com pedidos não entregues, encomendas devolvidas e dificuldades para conseguir reembolsos.',
    },
    {
      type: 'p',
      text: 'Esses dados merecem atenção, especialmente porque a empresa também reconheceu dificuldades logísticas com as encomendas destinadas ao Brasil.',
    },
    {
      type: 'p',
      text: `Consulte a [página da YesStyle no Reclame Aqui](${RECLAME_AQUI}) para verificar os dados e as reclamações mais recentes.`,
    },
    { type: 'h3', text: 'Trustpilot: avaliações internacionais positivas' },
    { type: 'p', text: 'O cenário é diferente no Trustpilot.' },
    {
      type: 'p',
      text: 'Na consulta realizada em novembro de 2026, a YesStyle apresentava nota aproximada de 4,4 de 5, baseada em mais de 105 mil avaliações.',
    },
    {
      type: 'p',
      text: 'A plataforma reúne experiências de consumidores de diferentes países. Há avaliações positivas sobre variedade, preços e produtos, mas também relatos de atrasos e problemas de entrega.',
    },
    { type: 'p', text: 'É importante não confundir essa nota internacional com a experiência de quem compra no Brasil.' },
    {
      type: 'p',
      text: '**Nossa avaliação:** a YesStyle é uma varejista internacional estabelecida, mas isso não significa que comprar por ela seja atualmente uma experiência segura ou conveniente para consumidores brasileiros.',
    },
    { type: 'p', text: `Você pode consultar as [avaliações da YesStyle no Trustpilot](${TRUSTPILOT}).` },

    { type: 'h2', text: 'Por que a YesStyle suspendeu os pedidos para o Brasil?' },
    { type: 'p', text: 'Este é o principal problema para quem pretende comprar na loja atualmente.' },
    {
      type: 'p',
      text: 'A própria YesStyle publicou um comunicado informando que enfrentou dificuldades com as encomendas destinadas ao Brasil quando elas chegam à alfândega.',
    },
    {
      type: 'p',
      text: 'Segundo a empresa, a transportadora responsável pelas entregas locais está trabalhando para normalizar a situação.',
    },
    {
      type: 'p',
      text: 'Para evitar que novos pedidos também fiquem retidos, a loja decidiu suspender temporariamente os pedidos e envios para o país.',
    },
    {
      type: 'p',
      text: 'A empresa afirma que entrou em contato com os consumidores afetados e que pretende retomar as operações brasileiras.',
    },
    { type: 'p', text: 'O comunicado, entretanto, não apresenta uma data definitiva para a normalização.' },
    {
      type: 'p',
      text: `Você pode conferir a informação diretamente na [página oficial da YesStyle sobre a suspensão dos pedidos para o Brasil](${PAUSE_NOTICE}).`,
    },
    {
      type: 'p',
      text: '**Um cuidado importante:** a existência de uma tabela de frete para o Brasil na central de ajuda não significa que os envios estejam normalizados. O aviso específico de suspensão deve prevalecer na decisão de compra.',
    },

    { type: 'h2', text: 'Como funciona a importação da YesStyle?' },
    {
      type: 'p',
      text: 'Quando a loja estiver novamente aceitando pedidos para o Brasil, é importante entender que a compra será uma importação internacional.',
    },
    { type: 'p', text: 'O processo normalmente envolve:' },
    {
      type: 'ol',
      items: [
        'Escolha dos produtos e finalização da compra.',
        'Processamento do pedido no centro de distribuição da empresa.',
        'Envio internacional, com origem em Hong Kong.',
        'Chegada ao Brasil e fiscalização alfandegária.',
        'Pagamento dos tributos e liberação da encomenda, quando aplicável.',
        'Entrega pela transportadora responsável no território brasileiro.',
      ],
    },
    { type: 'p', text: 'O tempo total depende do processamento, transporte internacional e fiscalização aduaneira.' },

    { type: 'h2', text: 'Quanto custa importar da YesStyle? Entenda os impostos' },
    { type: 'p', text: 'Este é um dos pontos mais importantes antes de comprar.' },
    { type: 'p', text: 'As regras brasileiras de tributação de compras internacionais mudaram em 2026.' },
    {
      type: 'p',
      text: 'A alíquota aplicável depende de a plataforma estar ou não certificada no Programa Remessa Conforme, da Receita Federal.',
    },
    {
      type: 'p',
      text: `Na consulta realizada em novembro de 2026, não encontramos a YesStyle na [lista oficial de empresas certificadas](${RECEITA_CERTIFICADAS}) no programa.`,
    },
    {
      type: 'p',
      text: 'Por isso, não é correto aplicar automaticamente a regra de isenção do Imposto de Importação para compras abaixo de US$ 50.',
    },
    { type: 'h3', text: 'Tributação de compras fora do Remessa Conforme' },
    { type: 'p', text: 'Segundo as regras da Receita Federal, compras em plataformas não certificadas estão sujeitas a:' },
    {
      type: 'ul',
      items: [
        'Imposto de Importação: 60%, independentemente do valor da compra.',
        'ICMS: imposto estadual, com alíquota que varia de 17% a 20%, conforme o estado.',
      ],
    },
    {
      type: 'p',
      text: 'O cálculo considera o valor aduaneiro, que inclui os produtos, o frete e o seguro, quando cobrados.',
    },
    { type: 'p', text: 'O ICMS é calculado considerando também o Imposto de Importação.' },
    {
      type: 'p',
      text: 'Isso significa que um produto anunciado por US$ 20 pode custar consideravelmente mais depois da tributação.',
    },
    { type: 'h3', text: 'E se a YesStyle entrar no Remessa Conforme?' },
    { type: 'p', text: 'Nesse caso, a tributação poderá ser diferente.' },
    { type: 'p', text: 'Para compras realizadas por pessoas físicas em plataformas certificadas:' },
    {
      type: 'ul',
      items: [
        'Até US$ 50: Imposto de Importação de 0%, com cobrança de ICMS.',
        'Acima de US$ 50 até US$ 3.000: Imposto de Importação de 60%, com desconto equivalente a US$ 30 sobre o imposto calculado, além do ICMS.',
      ],
    },
    {
      type: 'p',
      text: `As regras podem mudar. Antes de comprar, consulte a [orientação oficial da Receita Federal sobre impostos em compras internacionais](${RECEITA_IMPOSTOS}).`,
    },

    { type: 'h2', text: 'Quanto custa o frete e quanto tempo demora?' },
    {
      type: 'p',
      text: `A [tabela de frete da YesStyle](${SHIPPING_PAGE}) consultada em novembro de 2026 apresentava as seguintes condições para o Brasil:`,
    },
    {
      type: 'table',
      headers: ['Condição', 'Envio padrão'],
      rows: [
        ['Frete grátis', 'A partir de US$ 80'],
        ['Frete abaixo do mínimo', 'US$ 15'],
        ['Prazo estimado', '21 a 25 dias úteis'],
        ['Rastreamento', 'Informado na tabela brasileira'],
      ],
    },
    { type: 'p', text: 'Esses valores são referências publicadas pela loja, não uma garantia de entrega.' },
    {
      type: 'p',
      text: 'Há uma ressalva fundamental: enquanto a suspensão dos envios estiver vigente, não se deve considerar essas condições como confirmação de que é possível receber novos pedidos no Brasil.',
    },
    {
      type: 'p',
      text: 'Além disso, o prazo de transporte não necessariamente inclui todo o tempo de processamento e eventuais retenções alfandegárias.',
    },

    { type: 'h2', text: 'Os produtos da YesStyle são originais?' },
    {
      type: 'p',
      text: 'Como a YesStyle comercializa produtos de diferentes fabricantes, a qualidade precisa ser avaliada considerando cada marca e cada produto.',
    },
    {
      type: 'p',
      text: 'A loja informa trabalhar com marcas autorizadas de beleza asiática, mas isso não significa que todos os produtos tenham a mesma qualidade ou sejam adequados para qualquer pessoa.',
    },
    { type: 'p', text: 'Antes de comprar, recomendamos:' },
    {
      type: 'ul',
      items: [
        'Verificar a reputação da marca;',
        'Consultar avaliações do produto específico;',
        'Conferir ingredientes e composição;',
        'Observar a validade e as informações da embalagem;',
        'Desconfiar de ofertas muito abaixo dos preços praticados em outros canais.',
      ],
    },
    {
      type: 'p',
      text: 'No caso de cosméticos, também é importante verificar as condições de regularização e comercialização aplicáveis no Brasil, especialmente para produtos destinados à aplicação na pele.',
    },

    { type: 'h2', text: 'Quais marcas coreanas vale a pena conhecer?' },
    {
      type: 'p',
      text: 'A popularidade da K-beauty cresceu bastante no Brasil, e algumas marcas passaram a aparecer com frequência em lojas especializadas, farmácias e perfumarias.',
    },
    { type: 'p', text: 'Entre as mais conhecidas estão:' },
    {
      type: 'ul',
      items: [
        '**COSRX:** conhecida por produtos voltados aos cuidados com a pele, incluindo fórmulas com mucina de caracol e ácidos.',
        '**Beauty of Joseon:** ganhou popularidade com seus produtos inspirados em ingredientes tradicionais coreanos.',
        '**Anua:** conhecida por produtos com ingredientes como heartleaf.',
        '**SKIN1004:** destaca produtos formulados com centella asiática.',
        '**Innisfree:** trabalha com cosméticos e cuidados com a pele.',
        '**Laneige:** conhecida por hidratantes e produtos para os lábios.',
      ],
    },
    {
      type: 'p',
      text: 'Algumas dessas marcas também utilizam artistas e integrantes de grupos de K-pop em suas campanhas publicitárias.',
    },
    {
      type: 'p',
      text: 'É importante lembrar que a presença de um artista em uma campanha não representa uma recomendação dermatológica nem garante que o produto seja adequado para sua pele.',
    },
    { type: 'p', text: 'Antes de importar, vale pesquisar se o produto desejado já está disponível oficialmente no Brasil.' },

    { type: 'h2', text: 'Vale a pena comprar na YesStyle?' },
    { type: 'p', text: 'A resposta depende do que você procura e, principalmente, das condições de entrega.' },
    { type: 'h3', text: 'Quando pode valer a pena' },
    { type: 'p', text: 'A YesStyle pode ser interessante para quem:' },
    {
      type: 'ul',
      items: [
        'Procura marcas asiáticas difíceis de encontrar no Brasil;',
        'Quer comparar diferentes fabricantes em uma única loja;',
        'Já conhece os produtos que pretende comprar;',
        'Não tem urgência para receber a encomenda;',
        'Consegue calcular antecipadamente o custo total da importação.',
      ],
    },
    { type: 'h3', text: 'Quando não recomendamos' },
    { type: 'p', text: 'A compra não é uma boa escolha para quem:' },
    {
      type: 'ul',
      items: [
        'Precisa receber o produto em uma data específica;',
        'Não quer correr riscos com atrasos e retenções alfandegárias;',
        'Não está preparado para pagar os impostos de importação;',
        'Encontra o mesmo produto em uma loja brasileira por preço semelhante;',
        'Precisa de um atendimento local mais acessível em caso de problemas.',
      ],
    },
    {
      type: 'p',
      text: '**Nossa recomendação para novembro de 2026:** enquanto a YesStyle mantiver a suspensão dos envios para o Brasil, recomendamos aguardar a normalização antes de realizar qualquer compra.',
    },
    { type: 'p', text: 'Mesmo depois da retomada, vale comparar o preço final com o de lojas brasileiras.' },

    { type: 'h2', text: 'Conclusão: vale a pena importar da YesStyle?' },
    {
      type: 'p',
      text: 'A YesStyle continua sendo uma opção interessante para conhecer marcas e produtos de beleza asiáticos, especialmente para quem procura novidades da K-beauty.',
    },
    { type: 'p', text: 'Entretanto, a situação brasileira exige cautela.' },
    {
      type: 'p',
      text: 'A suspensão dos envios, as dificuldades alfandegárias, as reclamações registradas no Reclame Aqui e os impostos de importação tornam a compra menos atrativa neste momento.',
    },
    {
      type: 'p',
      text: 'Nossa recomendação é simples: não compre por impulso. Confira se a loja voltou a aceitar pedidos para o Brasil, calcule os impostos e compare o preço final com alternativas disponíveis no mercado nacional.',
    },
    { type: 'p', text: '**Uma promoção só vale a pena quando o produto chega e o preço final realmente compensa.**' },
    {
      type: 'p',
      text: `Quando a YesStyle voltar a aceitar pedidos para o Brasil, este é o [link da YesStyle](${AFFILIATE_LINK}) (link de afiliado).`,
    },
    {
      type: 'p',
      text: 'Transparência: o Compare Ofertas pode receber comissão por compras realizadas por meio de links de afiliados, sem custo adicional para o consumidor. Isso não altera nossa análise nem nossas recomendações.',
    },
  ],
  faq: [
    {
      q: 'A YesStyle entrega no Brasil?',
      a: `A loja publicou uma suspensão temporária dos pedidos e envios para o Brasil devido a problemas na alfândega. Na última consulta, em ${STATUS_CHECKED}, o comunicado ainda estava disponível.`,
    },
    {
      q: 'A YesStyle é confiável?',
      a: 'É uma varejista internacional estabelecida, mas apresenta avaliações diferentes conforme o mercado. No Brasil, a página no Reclame Aqui, não verificada e que não parece ser acompanhada pela empresa, apresenta reputação Não Recomendada, com relatos sobre entrega e reembolso sem resposta.',
    },
    {
      q: 'A YesStyle vende produtos originais?',
      a: 'A loja comercializa produtos de diversas marcas e informa trabalhar com marcas autorizadas. Ainda assim, é importante avaliar cada fabricante e produto individualmente.',
    },
    {
      q: 'Preciso pagar imposto ao comprar na YesStyle?',
      a: 'Sim, deve-se considerar a tributação de importação. Na consulta à lista oficial da Receita Federal, a YesStyle não constava entre as plataformas certificadas no Remessa Conforme. Assim, aplica-se a regra geral de 60% de Imposto de Importação, além do ICMS, enquanto essa situação permanecer.',
    },
    {
      q: 'Quanto tempo demora uma entrega da YesStyle?',
      a: 'A tabela de frete consultada apresentava prazo estimado de 21 a 25 dias úteis para o Brasil. Esse prazo não é garantia e pode ser afetado pela fiscalização alfandegária. Atualmente, os envios estão temporariamente suspensos.',
    },
    {
      q: 'A YesStyle tem loja física no Brasil?',
      a: 'A YesStyle é uma varejista internacional e não identificamos uma operação de loja física brasileira.',
    },
    {
      q: 'De onde vêm os produtos da YesStyle?',
      a: 'Segundo a empresa, os pedidos são processados e enviados de seu centro de distribuição em Hong Kong.',
    },
  ],
}
