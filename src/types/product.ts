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
  reviews: number | null
  rating: number | null
  averageRating: number | null
  numberAvailable: number | null
  productGtin: string
  slug: string
  merchantSlug: string
  merchantDisplayName: string
  vertical: string
  categorySlug: string
  similar: SimilarRef[]
  eligibleForStaticPage: boolean
  priceHistory?: PricePoint[]
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
}

export interface MerchantMeta {
  slug: string
  displayName: string
  vertical: string
  priority: boolean
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

export interface FeedMeta {
  generatedAt: string
  totalProducts: number
  eligibleForStaticPage: number
  feeds: string[]
  merchants: string[]
}
