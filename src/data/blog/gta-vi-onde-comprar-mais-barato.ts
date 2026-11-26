import type { BlogPost } from '../../types/blog'

// Guia de compra do GTA VI (lançado em 19/11/2026). Preço de loja NUNCA fica no
// texto: vem do bloco "offers", montado do catálogo a cada build. Os links de
// busca foram testados contra o catálogo em 26/11/2026 (ex.: "gta vi" não acha as
// ofertas de Xbox, que usam o nome por extenso).
// Disco, Ultimate, região do código e Xbox One: conferidos em 26/11/2026 na página
// da Rockstar (atualizada em 18/11/2026). Reconferir lá antes de mudar o texto.
// Sem arte da Rockstar (direitos autorais) — as fotos são as que as lojas mandam.
const ROCKSTAR_EDITIONS =
  'https://support.rockstargames.com/articles/4QfG4FmZCf5W1gS8jy4UVT/grand-theft-auto-vi-platform-editions-and-versions'
const OFFICIAL_PRICE = 'https://tecnoblog.net/noticias/preco-de-gta-6-no-brasil-e-revelado-r-449/'
// exigências de SSD (página em inglês)
const SONY_SSD = 'https://www.playstation.com/en-us/support/hardware/ps5-install-m2-ssd/'

export const gtaViOndeComprarMaisBarato: BlogPost = {
  slug: 'gta-vi-onde-comprar-mais-barato',
  title: 'GTA VI: onde comprar mais barato? Compare preços para PS5 e Xbox',
  metaTitle: 'GTA VI: Onde Comprar Mais Barato (PS5 e Xbox) | Compare Ofertas',
  metaDescription:
    'Compare ofertas de GTA VI para PS5 e Xbox e saiba antes de comprar: a edição em caixa não vem com disco. Veja o que você precisa para jogar.',
  keyword: 'gta vi onde comprar mais barato',
  secondaryKeywords: [
    'gta vi onde comprar',
    'gta 6 preço ps5',
    'gta 6 preço xbox',
    'gta vi sem disco',
    'gta vi vem com disco',
    'gta vi vale a pena comprar em caixa',
    'gta 6 região do código',
    'o que precisa para jogar gta 6',
  ],
  publishedAt: '2026-11-26',
  excerpt:
    'Compare as ofertas de GTA VI para PS5 e Xbox do nosso catálogo e entenda antes de comprar: a edição em caixa traz só um código, sem disco.',
  blocks: [
    {
      type: 'p',
      text: 'O GTA VI, ou GTA 6, chegou em 19 de novembro de 2026 para PlayStation 5 e Xbox Series X|S. Se você está vendo onde comprar, reunimos aqui as ofertas do jogo nas lojas do nosso catálogo e o que vale saber antes, principalmente se for presente.',
    },
    {
      type: 'quote',
      text: `**Antes de comprar: a edição em caixa não vem com disco.** Segundo o [suporte da Rockstar](${ROCKSTAR_EDITIONS}), ela traz um código para baixar o jogo. Há também ofertas que são só o código digital. **No PlayStation, o código também precisa combinar com o país da sua conta.** Em cada oferta abaixo mostramos o que a loja informa sobre o formato.`,
    },
    { type: 'h2', text: 'Onde encontrar GTA VI mais barato' },
    {
      type: 'offers',
      listId: 'gta-vi',
      // "gta vi" não acha as de Xbox ("Grand Theft Auto VI"): o nome por extenso acha todas
      searchHref: '/?busca=grand+theft+auto+vi',
      searchLabel: 'Ver todas as ofertas de GTA VI na busca',
    },
    // conferido nas páginas das lojas em 26/11/2026; sem valor delas, só a condição
    {
      type: 'p',
      text: '**Pix ou cartão?** Em 26/11/2026, conferimos nas lojas: os preços de PS5 da Gigantec e da Kabum eram no Pix (na Gigantec, Pix ou boleto). Em 10 vezes sem juros no cartão, as duas voltavam para perto do preço oficial da edição Padrão, praticamente empatadas. Se for parcelar, compare o total na loja, e não só o menor preço da lista.',
    },
    {
      type: 'p',
      text: `O preço oficial do GTA 6 no Brasil é de R$ 449,90 na edição Padrão e R$ 549,90 na Ultimate, [segundo o Tecnoblog](${OFFICIAL_PRICE}). A lista acima compara só as lojas do nosso catálogo, não o mercado inteiro.`,
    },

    { type: 'h2', text: 'GTA VI em caixa vem sem disco: vale a pena?' },
    {
      type: 'ul',
      items: [
        'Na caixa vem um código de download. É preciso internet e espaço livre no console para baixar o jogo.',
        'Sem disco, não há o que emprestar ou revender depois que o código é usado na sua conta.',
        `Não existe a edição Ultimate em caixa. Quem tem a Padrão pode comprar o upgrade nas lojas digitais depois de resgatar o código ([suporte da Rockstar](${ROCKSTAR_EDITIONS})).`,
      ],
    },
    {
      type: 'p',
      text: 'A caixa faz sentido para quem quer ter algo físico para dar de presente, ou quando ela sai mais barata que o código digital na mesma plataforma. Nos dois formatos, o jogo chega do mesmo jeito: por download.',
    },

    { type: 'h2', text: 'Atenção à região do código' },
    {
      type: 'p',
      text: `Além da plataforma, confira o país da conta de quem vai jogar. Segundo o [suporte da Rockstar](${ROCKSTAR_EDITIONS}):`,
    },
    {
      type: 'ul',
      items: [
        '**PlayStation:** o código comprado no Brasil é para contas PlayStation registradas no Brasil. Se a conta for de outro país, como uma conta criada nos Estados Unidos, o código brasileiro não serve.',
        '**Xbox:** os códigos não têm bloqueio por região.',
      ],
    },
    {
      type: 'p',
      text: 'A recomendação da Rockstar é comprar numa loja do mesmo país da sua conta. Antes de fechar o pedido, confira na descrição da oferta para qual região é o código.',
    },

    { type: 'h2', text: 'Vai dar de presente?' },
    {
      type: 'ul',
      items: [
        '**Confirme a plataforma:** o código de PlayStation não serve no Xbox, e o de Xbox não serve no PlayStation. No PlayStation, pergunte também de que país é a conta de quem vai ganhar.',
        '**Caixa ou só código:** a caixa dá algo para embrulhar. Se a oferta for só o código digital, confira como a loja faz a entrega antes de comprar.',
        '**Console:** quem vai ganhar precisa ter onde jogar: um PS5 ou um Xbox Series.',
        'Está montando os presentes de Natal? Dá para juntar tudo numa [lista de presentes](/lista-de-presentes/).',
      ],
    },

    { type: 'h2', text: 'GTA VI roda no PS4, no Xbox One ou no PC?' },
    {
      type: 'p',
      text: `Não há versão para PS4, e até agora não há versão para PC anunciada. No Xbox One não há versão para o próprio console, mas a [Rockstar informa](${ROCKSTAR_EDITIONS}) que dá para jogar nele por streaming, pelo Xbox Cloud Gaming, com os gráficos no padrão do Xbox Series S. Antes de contar com isso, confira com a Microsoft o que o serviço exige e se está disponível para você.`,
    },

    { type: 'h2', text: 'O que você precisa para jogar' },
    { type: 'p', text: 'Não é preciso comprar tudo. O básico é o console e uma tela com entrada HDMI, que muita gente já tem em casa. O resto é opcional.' },
    { type: 'h3', text: 'Essencial' },
    {
      type: 'ul',
      items: [
        '**Ainda não tem o console?** Veja os [consoles PS5 com SSD](/?busca=console+playstation+5+ssd) ou os [consoles Xbox Series](/?busca=console+xbox+series) (a oferta de Xbox no nosso catálogo é bem menor).',
        '**Onde vai jogar?** Uma TV com HDMI resolve. Se for trocar de tela, compare [smart TVs 4K](/?busca=smart+tv+4k) ou, para um canto só de jogos, [monitores gamer](/?busca=monitor+gamer).',
      ],
    },
    { type: 'h3', text: 'Opcional' },
    {
      type: 'ul',
      items: [
        '**Quer um controle a mais no PS5?** Compare [controles DualSense](/?busca=controle+dualsense).',
        '**Quer jogar de fone?** Veja os [headsets que citam PS5 no nome](/?busca=headset+ps5). Antes de comprar, confira no site do fabricante se o modelo funciona no seu console e como ele se conecta.',
        `**Falta espaço no PS5?** Dá para instalar um SSD M.2. A [PlayStation exige](${SONY_SSD}) (página em inglês) SSD M.2 NVMe PCIe Gen4x4, de 250 GB a 8 TB, com dissipador de calor, e não aceita M.2 SATA. Nem todo modelo da [nossa busca de SSD NVMe](/?busca=ssd+nvme+2280) atende: confira a ficha antes de comprar.`,
      ],
    },
    {
      type: 'p',
      text: 'Os preços mudam rápido nesta época. A lista de ofertas é refeita a cada atualização do catálogo, que é diária, e a data aparece logo abaixo dela. Cada oferta tem a própria página com o preço e o link da loja.',
    },
    {
      type: 'p',
      text: 'Transparência: o Compare Ofertas pode receber comissão por compras feitas pelos links das lojas parceiras, sem custo a mais para você. Isso não muda a ordem da lista, que vai do menor para o maior preço em cada plataforma.',
    },
  ],
  faq: [
    {
      q: 'GTA VI vem com disco?',
      a: 'Não. Segundo o suporte da Rockstar, a edição em caixa traz um código para baixar o jogo. Há também ofertas só com o código digital.',
    },
    {
      q: 'Vale a pena comprar GTA VI em caixa?',
      a: 'Depende do motivo. A caixa não tem disco, só um código de download. Ela faz sentido para presentear com algo físico ou quando sai mais barata que o código digital na mesma plataforma.',
    },
    {
      q: 'Qual é o preço do GTA 6 para PS5 e Xbox no Brasil?',
      a: 'O preço oficial divulgado é de R$ 449,90 na edição Padrão e R$ 549,90 na Ultimate. Nas lojas os valores variam, inclusive conforme a forma de pagamento: veja a lista de ofertas por plataforma neste artigo.',
    },
    {
      q: 'O código do GTA VI tem bloqueio de região?',
      a: 'No PlayStation, o código comprado no Brasil é para contas registradas no Brasil. No Xbox, segundo a Rockstar, os códigos não têm bloqueio por região.',
    },
    {
      q: 'GTA VI roda no PS4, no Xbox One ou no PC?',
      a: 'Não há versão para PS4, nem versão para PC anunciada até agora. No Xbox One, a Rockstar informa que dá para jogar por streaming, pelo Xbox Cloud Gaming.',
    },
    {
      q: 'Existe a edição Ultimate em caixa?',
      a: 'Não. Segundo a Rockstar, quem tem a edição Padrão pode comprar o upgrade para a Ultimate nas lojas digitais depois de resgatar o código.',
    },
    {
      q: 'GTA VI é uma boa opção de presente de Natal?',
      a: 'Pode ser, desde que a plataforma esteja certa e a pessoa tenha o console. No PlayStation, confira o país da conta dela. Veja também se a oferta é uma caixa com código ou só o código digital.',
    },
  ],
}
