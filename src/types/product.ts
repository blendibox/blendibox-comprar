export interface SimilarRef {
  slug: string
  vertical: string
  merchantSlug: string
  merchantDisplayName: string
  productName: string
  awImageUrl: string
  searchPrice: number | null
  currency: string
}

export interface PricePoint {
  date: string
  price: number
}

export interface Product {
  awDeepLink: string
  productName: string
  awProductId: string
  merchantProductId: string
  merchantImageUrl: string
  description: string
  merchantCategory: string
  searchPrice: number | null
  merchantName: string
  merchantId: string
  categoryName: string
  categoryId: string
  awImageUrl: string
  currency: string
  storePrice: number | null
  deliveryCost: number | null
  merchantDeepLink: string
  language: string
  lastUpdated: string
  displayPrice: number | null
  dataFeedId: string
  alternateImageTwo: string
  // Campos de imagem alternativa do feed Awin — usados só como fallback em
  // scripts/lib/images.mjs (pickRealImage) quando awImageUrl/merchantImageUrl
  // vem como placeholder (ex: noimage.gif); não são lidos diretamente pela UI.
  alternateImage: string
  alternateImageThree: string
  alternateImageFour: string
  awThumbUrl: string
  reviews: number | null
  rating: number | null
  averageRating: number | null
  numberAvailable: number | null
  productGtin: string
  discountPercentage: number | null
  // Versão em resolução maior da imagem — a Awin não garante em todo feed, só
  // usada como preferência no feed do Google Merchant (exige ≥500x500px);
  // o site em si continua usando awImageUrl.
  largeImage: string
  slug: string
  merchantSlug: string
  merchantDisplayName: string
  vertical: string
  categorySlug: string
  similar: SimilarRef[]
  eligibleForStaticPage: boolean
  priceHistory?: PricePoint[]
  // Preenchido só quando o preço de hoje é uma queda real de ≥5% em relação
  // ao preço de ~7 dias atrás no priceHistory (scripts/update-price-history.mjs)
  // — null quando não há dado de uma semana atrás ainda ou o preço não caiu.
  previousPrice: number | null
  priceDropPercent: number | null
  // Mesmo produto vendido num canal diferente da mesma marca (ex: Eudora via
  // Awin x Eudora via revenda direta) — casamento por nome, ver
  // scripts/fetch-feeds.mjs (CROSS_CHANNEL_PAIRS).
  crossChannel?: SimilarRef
}

export interface ProductIndexEntry {
  slug: string
  vertical: string
  merchantSlug: string
  merchantDisplayName: string
  categorySlug: string
  productName: string
  searchPrice: number | null
  currency: string
  awImageUrl: string
  eligibleForStaticPage: boolean
  // Só vem preenchido pra fontes que realmente informam (ex: Shopee) — não
  // inventamos nota/desconto pra quem não tem o dado.
  rating: number | null
  storePrice: number | null
  discountPercentage: number | null
  // Mesma checagem de queda de preço semanal do Product — ver
  // scripts/update-price-history.mjs. Presente aqui (não só no detalhe
  // completo) pra dar pra montar a seção "Baixou de preço" na home sem
  // precisar buscar o JSON de cada produto individualmente.
  previousPrice: number | null
  priceDropPercent: number | null
}

export interface MerchantMeta {
  slug: string
  displayName: string
  vertical: string
  priority: boolean
  // ID do anunciante na Awin — usado pra montar a URL do logo em
  // ui.awin.com/images/upload/merchant/profile/{merchantId}.png. Fontes que
  // não são merchants Awin de verdade (Amazon, Shopee, revenda direta) têm
  // um slug em vez de ID numérico aqui, ou o campo vem null — ver
  // isAwinMerchantId em src/components/MerchantLogo.tsx.
  merchantId: string | null
}

export interface ListInitialData {
  items: ProductIndexEntry[]
  totalCount: number
}

export interface HubInitialData extends ListInitialData {
  // Diz ao HubPage se isso é um hub de vertical ou de loja antes de qualquer
  // fetch client-side rodar — durante o SSR o índice completo ainda não foi
  // carregado, então não dá pra descobrir isso só olhando os dados.
  kind: 'vertical' | 'merchant'
  merchants: { slug: string; displayName: string; count: number }[]
  categories: [string, number][]
}

export interface CouponEntry {
  id: string
  advertiser: string
  merchantSlug: string | null
  merchantId: string | null
  vertical: string | null
  type: string
  isVoucher: boolean
  code: string | null
  title: string
  description: string
  starts: string
  ends: string
  deeplink: string
}

export interface BlendiboxProduct {
  title: string
  link: string
  brand: string
  image: string
}

export interface SalesHighlight {
  merchantSlug: string
  productName: string
  slug: string
  label: string
}

export interface FeedMeta {
  generatedAt: string
  totalProducts: number
  eligibleForStaticPage: number
  feeds: string[]
  merchants: string[]
}

// Pré-calculado no build (scripts/generate-home-highlights.mjs) — as 3
// seções curadas da home já vêm prontas pro ProductCard, sem precisar do
// index.json inteiro (que passa de 45MB) só pra montar uma dúzia de cards.
export interface HomeHighlights {
  featured: ProductIndexEntry[]
  priceDrops: ProductIndexEntry[]
  recentSales: { product: ProductIndexEntry; label: string }[]
}

// Dado injetado por scripts/prerender.mjs pra a home renderizar as seções
// curadas já no HTML estático (sem esperar os fetches no cliente) — mesma
// fonte que o home-highlights.json/merchants.json/meta.json do build.
export interface HomeInitialData {
  meta: FeedMeta
  merchants: MerchantMeta[]
  highlights: HomeHighlights
}
