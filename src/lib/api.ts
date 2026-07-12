import type {
  BlendiboxProduct,
  CouponEntry,
  FeedMeta,
  MerchantMeta,
  Product,
  ProductIndexEntry,
  SalesHighlight,
} from '../types/product'

function dataUrl(path: string) {
  return `${import.meta.env.BASE_URL}data/${path}`
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(dataUrl(path))
  if (!res.ok) throw new Error(`Falha ao carregar ${path}: HTTP ${res.status}`)
  return res.json() as Promise<T>
}

export function fetchIndex() {
  return getJson<ProductIndexEntry[]>('index.json')
}

export function fetchMerchants() {
  return getJson<MerchantMeta[]>('merchants.json')
}

export function fetchMeta() {
  return getJson<FeedMeta>('meta.json')
}

export function fetchProduct(merchant: string, slug: string) {
  return getJson<Product>(`products/${merchant}/${slug}.json`)
}

export function fetchCoupons() {
  return getJson<CouponEntry[]>('coupons.json')
}

export function fetchBlendiboxProducts() {
  return getJson<BlendiboxProduct[]>('blendibox-products.json')
}

export function fetchSalesHighlights() {
  return getJson<SalesHighlight[]>('social-proof.json')
}
