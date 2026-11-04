import type { BlogPost, BlogProductShowcaseItem } from '../../types/blog'

// Fotos reduzidas (640px, WebP) das variações da Blendibox, hospedadas em
// public/blog/cores-2027/. Os links apontam pra página de cada cor no próprio
// site (/blendibox/<slug>/). Se uma cor esgotar, a página dela sai do ar no
// próximo build — scripts/check-blog-product-links.mjs avisa no log do deploy.
const IMG_DIR = '/blog/cores-2027'

function cor(slug: string, file: string, name: string, color: string): BlogProductShowcaseItem {
  return {
    href: `/blendibox/${slug}/`,
    imgSrc: `${IMG_DIR}/${file}.webp`,
    alt: `${name} Blendibox na cor ${color}`,
    name,
    color,
  }
}

const MAXI = 'Maxi Bolsa Puffer'
const NECESSAIRE = 'Nécessaire Puffer'

const VERDE_LIMA = cor('maxi-bolsa-puffer-blendibox-verde-lima-bbxmaxipuff-vlima', 'maxi-bolsa-puffer-verde-lima', MAXI, 'Verde Lima')
const LARANJA_ENERGIA = cor('maxi-bolsa-puffer-blendibox-laranja-energia-bbxmaxipuff-lenergia', 'maxi-bolsa-puffer-laranja-energia', MAXI, 'Laranja Energia')
const AZUL_LUMINOSO = cor('maxi-bolsa-puffer-blendibox-azul-luminoso-bbxmaxipuff-aluminoso', 'maxi-bolsa-puffer-azul-luminoso', MAXI, 'Azul Luminoso')
const LILAS_SUAVE = cor('maxi-bolsa-puffer-blendibox-lilas-suave-bbxmaxipuff-lsuave', 'maxi-bolsa-puffer-lilas-suave', MAXI, 'Lilás Suave')
const ROSA_POP = cor('maxi-bolsa-puffer-blendibox-rosa-pop-bbxmaxipuff-rpop', 'maxi-bolsa-puffer-rosa-pop', MAXI, 'Rosa Pop')
const VERMELHO_CHERRY = cor('maxi-bolsa-puffer-blendibox-vermelho-cherry-bbxmaxipuff-vcherry', 'maxi-bolsa-puffer-vermelho-cherry', MAXI, 'Vermelho Cherry')
const NEC_BEGE = cor('necessaire-puffer-blendibox-bege-bbxnecc-bege', 'necessaire-puffer-bege', NECESSAIRE, 'Bege')
const CREME = cor('maxi-bolsa-puffer-blendibox-creme-bbxmaxipuff-creme', 'maxi-bolsa-puffer-creme', MAXI, 'Creme')
const VERDE_OLIVA = cor('maxi-bolsa-puffer-blendibox-verde-oliva-bbxmaxipuff-voliva', 'maxi-bolsa-puffer-verde-oliva', MAXI, 'Verde Oliva')
const AZUL_MARINHO = cor('maxi-bolsa-puffer-blendibox-azul-marinho-bbxmaxipuff-azulmarinho', 'maxi-bolsa-puffer-azul-marinho', MAXI, 'Azul Marinho')
const NEC_AZUL_COBALTO = cor('necessaire-puffer-blendibox-azul-cobalto-bbxnecc-acobalto', 'necessaire-puffer-azul-cobalto', NECESSAIRE, 'Azul Cobalto')
const MARROM = cor('maxi-bolsa-puffer-blendibox-marrom-bbxmaxipuff-marrom', 'maxi-bolsa-puffer-marrom', MAXI, 'Marrom')

const link = (item: BlogProductShowcaseItem, label: string) => `[${label}](${item.href})`

const PANTONE_VERAO_2027 =
  'https://www.pantone.com.br/artigos/fashion-color-trend-report/lancamento-do-fashion-color-trend-report-verao-2027-as-top-colors-da-nyfw/'

export const coresTendenciaVerao2027ECorDoAno: BlogPost = {
  slug: 'cores-tendencia-verao-2027-e-cor-do-ano',
  title: 'Cores tendência do verão 2027 e a cor do ano: o que já foi anunciado',
  metaTitle: 'Cores Tendência Verão 2027 e Cor do Ano: Paleta Pantone | Compare Ofertas',
  metaDescription:
    'As 10 cores do verão 2027 da Pantone, as cores do ano 2027 já anunciadas (a da Pantone sai em dezembro) e tons parecidos em bolsas. Veja a paleta.',
  keyword: 'cores tendência verão 2027',
  secondaryKeywords: [
    'cor do ano 2027',
    'cor do ano pantone 2027',
    'paleta pantone verão 2027',
    'cores da moda verão 2027',
    'bolsa colorida verão 2027',
    'azul elétrico 2027',
  ],
  publishedAt: '2026-10-30',
  excerpt:
    'A Pantone já divulgou a paleta do verão 2027, mas a cor do ano ainda não saiu. Veja o que já foi anunciado, o que falta e como levar cada cor pra uma bolsa.',
  blocks: [
    {
      type: 'p',
      text: `Quem está montando o look do verão já pode olhar a paleta: em 10 de setembro de 2026, durante a Semana de Moda de Nova York, a Pantone divulgou o [relatório de cores da primavera/verão 2027](${PANTONE_VERAO_2027}), que a Pantone Brasil chama de "Verão 2027". Já a cor do ano tem uma pegadinha: a Pantone ainda não anunciou a de 2027.`,
    },
    {
      type: 'p',
      text: 'Neste guia você vê o que já saiu, o que ainda falta e como levar cada cor pra uma bolsa de verdade — com a foto e o link de cada tom citado.',
    },
    {
      type: 'quote',
      text: 'Transparência: a Blendibox é a nossa própria loja, a mesma marca por trás do Compare Ofertas — por isso usamos as bolsas dela como exemplo. E um aviso importante: as bolsas NÃO são as cores oficiais da Pantone. São tons próximos, escolhidos a olho a partir das fotos; a cor real pode variar um pouco da que você vê na tela.',
    },

    { type: 'h2', text: 'A cor do ano 2027: o que já foi anunciado (e o que ainda não)' },
    {
      type: 'p',
      text: 'Pantone: ainda não. A empresa costuma revelar a cor do ano na primeira semana de dezembro (a de 2026 foi o Cloud Dancer, um branco suave e quente) e, até esta publicação, em 30 de outubro de 2026, a de 2027 não saiu. Qualquer cor apresentada hoje como "a cor do ano 2027 da Pantone" é palpite. Vamos atualizar este artigo assim que a oficial for divulgada.',
    },
    {
      type: 'p',
      text: 'Enquanto isso, a consultoria de tendências WGSN (em parceria com a Coloro) e várias marcas de tinta já escolheram as cores delas para 2027:',
    },
    {
      type: 'table',
      headers: ['Quem anunciou', 'Cor do ano 2027', 'Tom parecido em bolsa'],
      rows: [
        ['WGSN + Coloro', 'Luminous Blue: azul vivo, entre o lápis-lazúli e o cobalto', link(NEC_AZUL_COBALTO, 'Nécessaire Azul Cobalto')],
        ['Behr (ago/2026)', 'Grounded: oliva-musgo acinzentado, um "neutro vivo"', link(VERDE_OLIVA, 'Maxi Bolsa Verde Oliva')],
        ['Sherwin-Williams (set/2026)', 'Celery: verde claro e arejado, com fundo amarelado', 'sem par na vitrine hoje'],
        ['Dulux (set/2026)', 'Soulful Sage: verde-sálvia suave e prateado', 'sem par na vitrine hoje'],
        ['Benjamin Moore (out/2026)', 'Webster Green: verde profundo e versátil', 'sem par na vitrine hoje'],
        ['Dunn-Edwards (out/2026)', 'French Press Coffee: marrom profundo, com fundo ameixa', link(MARROM, 'Maxi Bolsa Marrom')],
      ],
    },
    {
      type: 'p',
      text: 'Juntas, essas escolhas contam uma história: de um lado, verdes calmos e marrons terrosos (o clima de "restaurar"); do outro, um azul vivo e energético. Não há uma cor única dominando 2027 — o equilíbrio é entre restaurar e se expressar.',
    },
    { type: 'h3', text: 'Luminous Blue: o azul vivo da WGSN' },
    {
      type: 'p',
      text: `É a cor mais "ligada" da lista: um azul saturado, que chama atenção mesmo num look simples. Alguns veículos de moda o descrevem como um azul "elétrico" (o nome popular dessa família); a WGSN compara o tom ao lápis-lazúli e ao cobalto. Na nossa vitrine, o tom mais parecido está na ${link(NEC_AZUL_COBALTO, 'Nécessaire Puffer em Azul Cobalto')} — uma boa forma de testar o azul vivo sem apostar numa bolsa grande. Quer o efeito em tamanho maior? Veja a ${link(AZUL_LUMINOSO, 'Maxi Bolsa Puffer em Azul Luminoso')}, logo abaixo, na paleta da Pantone.`,
    },
    { type: 'product-showcase', items: [NEC_AZUL_COBALTO] },

    { type: 'h2', text: 'Paleta Pantone Verão 2027: as cores de destaque' },
    {
      type: 'p',
      text: `O relatório de moda da Pantone traz 10 cores de destaque e 5 tons atemporais, com o mote "ousadia e refinamento": cores vibrantes ao lado de tons naturais e discretos, convidando a combinações inesperadas. Veja as de destaque e o tom parecido que encontramos em bolsas (lembrando: parecido, não idêntico).`,
    },

    { type: 'h3', text: 'Daiquiri Green (12-0435): o verde-lima luminoso' },
    {
      type: 'p',
      text: `A Pantone descreve o Daiquiri Green como um verde-lima vibrante e luminoso, com um toque cítrico refrescante. O tom parecido: a ${link(VERDE_LIMA, 'Maxi Bolsa Puffer em Verde Lima')}, que pede um look neutro em volta pra brilhar.`,
    },
    { type: 'product-showcase', items: [VERDE_LIMA] },

    { type: 'h3', text: 'Dragon Fire (16-1460): o laranja de energia' },
    {
      type: 'p',
      text: `Dragon Fire é um laranja revigorante, de força magnética. Na loja, o mais próximo é a ${link(LARANJA_ENERGIA, 'Maxi Bolsa Puffer em Laranja Energia')} — funciona muito bem com jeans, branco e azul.`,
    },
    { type: 'product-showcase', items: [LARANJA_ENERGIA] },

    { type: 'h3', text: 'Princess Blue (19-4150): o azul majestoso' },
    {
      type: 'p',
      text: `Um azul de aparência régia, que transmite dignidade e elegância, segundo a Pantone. O parente mais próximo: a ${link(AZUL_LUMINOSO, 'Maxi Bolsa Puffer em Azul Luminoso')}, de azul saturado.`,
    },
    { type: 'product-showcase', items: [AZUL_LUMINOSO] },

    { type: 'h3', text: 'Lavender Oil (15-3615): a lavanda com fundo herbáceo' },
    {
      type: 'p',
      text: `A lavanda sombreada, com nuances herbáceas sutis, é a aposta romântica da paleta. A ${link(LILAS_SUAVE, 'Maxi Bolsa Puffer em Lilás Suave')} é uma versão mais clara dela, boa pra quem quer cor sem exagero.`,
    },
    { type: 'product-showcase', items: [LILAS_SUAVE] },

    { type: 'h3', text: 'Rosy Future (15-1910) e Hibiscus (18-1762): os rosas vibrantes' },
    {
      type: 'p',
      text: `A Pantone chama o Rosy Future de rosa vibrante e alegre, e o Hibiscus de vermelho ousado, de presença dramática. As duas puxam o rosa pro lado intenso, e o tom mais próximo que temos é a ${link(ROSA_POP, 'Maxi Bolsa Puffer em Rosa Pop')}, um rosa-magenta bem vivo.`,
    },
    { type: 'product-showcase', items: [ROSA_POP] },

    { type: 'h3', text: 'Chili Pepper (19-1557): o vermelho profundo' },
    {
      type: 'p',
      text: `Um vermelho profundo e picante, ligado ao desejo por sabores exóticos. O Chili Pepper é mais fechado do que o nosso ${link(VERMELHO_CHERRY, 'Vermelho Cherry')}, que é um vermelho vivo — mas é o par mais próximo que temos, e funciona como "toque de vermelho" num look neutro.`,
    },
    { type: 'product-showcase', items: [VERMELHO_CHERRY] },

    { type: 'h3', text: 'Anise Flower (12-0717): o amarelo quase branco' },
    {
      type: 'p',
      text: `Um amarelo suavizado pelo branco, delicado. O tom mais perto é o amarelo-manteiga claro da ${link(NEC_BEGE, 'Nécessaire Puffer na cor Bege')} (o nome da cor na loja é "bege", mas na foto ela puxa pro manteiga).`,
    },
    { type: 'product-showcase', items: [NEC_BEGE] },

    {
      type: 'p',
      text: 'Sem par na nossa vitrine hoje: Langoustino (coral intenso, inspirado no lagostim) e Waterfall (azul-esverdeado). Preferimos dizer isso a empurrar um tom que não combina.',
    },

    { type: 'h2', text: 'Os tons atemporais do verão 2027' },
    {
      type: 'p',
      text: 'Além das 10 cores de destaque, a Pantone separou 5 tons "atemporais", pensados pra durar além de uma estação: Antique White, Tarragon, Arrowwood, Blue Indigo e Dolphin. São a base do guarda-roupa — e combinam com as cores vibrantes acima.',
    },

    { type: 'h3', text: 'Antique White (11-0105): o branco quente' },
    {
      type: 'p',
      text: `Um branco suave e quente, com charme vintage. Na vitrine, quem mais se aproxima é a ${link(CREME, 'Maxi Bolsa Puffer em Creme')}.`,
    },
    { type: 'product-showcase', items: [CREME] },

    { type: 'h3', text: 'Tarragon (15-0326): o verde herbal' },
    {
      type: 'p',
      text: `Um verde herbal, com nuances botânicas sutis. A ${link(VERDE_OLIVA, 'Maxi Bolsa Puffer em Verde Oliva')} é mais escura que o Tarragon, mas está na mesma família de verdes herbais e oliva do Grounded, a cor do ano 2027 da Behr.`,
    },
    { type: 'product-showcase', items: [VERDE_OLIVA] },

    { type: 'h3', text: 'Blue Indigo (19-3928): o azul fechado' },
    {
      type: 'p',
      text: `Um azul suave que, segundo a Pantone, conecta o passado ao futuro e fica mais refinado com o tempo. O tom parecido é a ${link(AZUL_MARINHO, 'Maxi Bolsa Puffer em Azul Marinho')}, o coringa de quem quer cor sem arriscar.`,
    },
    { type: 'product-showcase', items: [AZUL_MARINHO] },

    { type: 'h3', text: 'E o marrom? O neutro quente das cores do ano' },
    {
      type: 'p',
      text: `Arrowwood (um dourado terroso) e Dolphin (um cinza médio) também são atemporais, mas não temos par pra elas. O marrom, porém, aparece com força nas cores do ano de marcas de tinta (como o French Press Coffee, da Dunn-Edwards), e a ${link(MARROM, 'Maxi Bolsa Puffer em Marrom')} entra bem nesse clima de neutro quente.`,
    },
    { type: 'product-showcase', items: [MARROM] },

    { type: 'h2', text: 'Resumo: cor da paleta e tom parecido em bolsa' },
    {
      type: 'table',
      headers: ['Cor Pantone Verão 2027', 'Tom parecido na Blendibox'],
      rows: [
        ['Daiquiri Green', link(VERDE_LIMA, 'Verde Lima')],
        ['Dragon Fire', link(LARANJA_ENERGIA, 'Laranja Energia')],
        ['Princess Blue', link(AZUL_LUMINOSO, 'Azul Luminoso')],
        ['Lavender Oil', link(LILAS_SUAVE, 'Lilás Suave')],
        ['Rosy Future / Hibiscus', link(ROSA_POP, 'Rosa Pop')],
        ['Chili Pepper', link(VERMELHO_CHERRY, 'Vermelho Cherry')],
        ['Anise Flower', link(NEC_BEGE, 'Nécessaire Bege')],
        ['Antique White', link(CREME, 'Creme')],
        ['Tarragon', link(VERDE_OLIVA, 'Verde Oliva')],
        ['Blue Indigo', link(AZUL_MARINHO, 'Azul Marinho')],
        ['Langoustino, Waterfall, Arrowwood, Dolphin', 'sem par na vitrine hoje'],
      ],
    },

    { type: 'h2', text: 'Como usar as cores do verão 2027 numa bolsa' },
    {
      type: 'ul',
      items: [
        'Uma cor forte, o resto neutro: a bolsa colorida é o ponto de cor do look. Com branco, jeans ou preto, ela aparece sem brigar.',
        'Vibrante com atemporal: combine um destaque (verde-lima, laranja, azul) com um dos tons atemporais (creme, azul-marinho, verde-oliva) pra um visual mais refinado.',
        'Teste a cor num item pequeno: uma nécessaire ou um chaveiro mostra se aquele tom combina com você antes de levar uma bolsa grande.',
        'Pense no que você já tem: bolsa colorida rende mais quando conversa com pelo menos três peças do seu guarda-roupa.',
      ],
    },
    {
      type: 'p',
      text: 'Quer ver todas as cores disponíveis? Veja [todas as bolsas da Blendibox](/blendibox/). Voltamos a esta página quando a Pantone anunciar a cor do ano 2027.',
    },

    { type: 'h2', text: 'Fontes' },
    {
      type: 'ul',
      items: [
        `[Pantone Brasil: Fashion Color Trend Report Verão 2027](${PANTONE_VERAO_2027}) (lista oficial das 10 cores de destaque e dos 5 tons atemporais, com os códigos)`,
        '[Color Combinations: cores do ano 2027 anunciadas até 16/10/2026](https://colorcombinations.org/trends/color-trends-2027/) (levantamento das cores do ano de marcas e consultorias)',
        '[Color Indicator: tendências de cor para 2027](https://colorindicator.com/academy/2027-color-trends) (panorama das previsões)',
      ],
    },
  ],
  faq: [
    {
      q: 'Qual é a cor do ano 2027?',
      a: 'A cor do ano da Pantone para 2027 ainda não foi anunciada; a revelação costuma acontecer na primeira semana de dezembro. Enquanto isso, outras fontes já escolheram as suas: a WGSN com a Coloro apontou o Luminous Blue, a Behr o Grounded, a Sherwin-Williams o Celery e a Benjamin Moore o Webster Green.',
    },
    {
      q: 'Quais são as cores do verão 2027?',
      a: 'Segundo o relatório da Pantone divulgado em 10 de setembro de 2026, as 10 cores de destaque são Anise Flower, Princess Blue, Waterfall, Langoustino, Chili Pepper, Rosy Future, Dragon Fire, Daiquiri Green, Hibiscus e Lavender Oil. Os 5 tons atemporais são Antique White, Tarragon, Arrowwood, Blue Indigo e Dolphin.',
    },
    {
      q: 'Azul elétrico é tendência em 2027?',
      a: 'Sim, no sentido de um azul vivo e saturado. A WGSN e a Coloro escolheram o Luminous Blue como cor do ano 2027, um azul entre o lápis-lazúli e o cobalto que alguns veículos de moda descrevem como elétrico, e a Pantone incluiu o Princess Blue, um azul majestoso e saturado, na paleta do verão 2027. Nenhuma das duas usa o nome "azul elétrico", que é o termo popular.',
    },
    {
      q: 'As bolsas da Blendibox são exatamente as cores da Pantone?',
      a: 'Não. As cores da Pantone seguem um sistema de códigos próprio, e as bolsas da Blendibox não foram produzidas com esses códigos. Os tons citados são parecidos, escolhidos a olho a partir das fotos, e a cor real pode variar um pouco.',
    },
    {
      q: 'Por que se fala em "primavera/verão 2027" se o verão brasileiro começa em dezembro?',
      a: 'O relatório da Pantone é apresentado na Semana de Moda de Nova York, que segue o calendário do hemisfério norte (primavera/verão). A Pantone Brasil publica a mesma paleta como "Verão 2027", e ela serve de referência com antecedência para quem monta o guarda-roupa da estação.',
    },
    {
      q: 'Quando a Pantone anuncia a cor do ano?',
      a: 'Costuma ser no início de dezembro do ano anterior. A cor de 2026, por exemplo, foi o Cloud Dancer, um branco suave e quente. A de 2027 é esperada para a primeira semana de dezembro de 2026, e atualizaremos este artigo quando sair.',
    },
  ],
  relatedSlugs: ['brazilcore-moda-copa-do-mundo-2026', 'ideias-de-presente-de-natal'],
}
