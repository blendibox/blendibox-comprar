// Bloco de ofertas dentro de artigo do blog: lista montada no build a partir do
// catálogo (scripts/generate-blog-offers.mjs), nunca preço escrito no texto. As
// regras abaixo são a fonte única do que entra em cada lista.

export type OfferKind = 'caixa' | 'digital' | null

export interface OfferDetails {
  platform: string
  edition: string
  // o que o comprador recebe, quando a loja diz (senão null: "confira na loja")
  kind: OfferKind
}

export interface BlogOffer extends OfferDetails {
  slug: string
  merchantSlug: string
  merchantName: string
  name: string
  price: number
  // foto do produto que a própria loja manda no feed
  imageUrl: string
}

export interface BlogOffersData {
  // data do catálogo usado (meta.json), não a hora em que o HTML foi gerado
  generatedAt: string
  lists: Record<string, BlogOffer[]>
}

export interface OfferListRule {
  // filtro estrito pelo NOME: null = o produto não entra na lista
  matchName: (name: string) => Omit<OfferDetails, 'kind'> | null
  // o tipo da oferta, lido do nome + descrição da loja
  kindOf: (name: string, description: string) => OfferKind
}

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

// Acessório, console (mesmo com o jogo junto) e brinde não são "o jogo".
const NOT_THE_GAME =
  /\bconsole\b|^(controle|headset|fone|capa|skin|poster|camiseta|boneco|funko|mouse|mousepad|teclado|cadeira|suporte|caneca|livro|guia|tampa)\b/

const gtaVi: OfferListRule = {
  matchName(name) {
    const text = normalize(name)
    // "vi" ou "6" como palavra inteira: GTA V não entra
    if (!/\b(gta|grand theft auto)\b/.test(text) || !/\b(vi|6)\b/.test(text) || NOT_THE_GAME.test(text)) return null
    const platform = /\b(ps5|playstation ?5)\b/.test(text) ? 'PlayStation 5' : /\bxbox\b/.test(text) ? 'Xbox Series X|S' : null
    if (!platform) return null
    return { platform, edition: /\bultimate\b/.test(text) ? 'Ultimate' : 'Padrão' }
  },
  kindOf(name, description) {
    const text = normalize(`${name} ${description.replace(/<[^>]+>/g, ' ')}`)
    // "caixa com código" primeiro: a descrição dela também fala em código digital
    if (/code in box|nao acompanha (o )?disco|sem disco|caixa[^.]{0,80}codigo/.test(text)) return 'caixa'
    if (/codigo digital|formato digital|versao digital|produto digital/.test(text)) return 'digital'
    return null
  },
}

export const OFFER_LISTS: Record<string, OfferListRule> = { 'gta-vi': gtaVi }

export const OFFER_KIND_LABEL: Record<'caixa' | 'digital', string> = {
  caixa: 'Caixa com código, sem disco',
  digital: 'Código digital',
}
