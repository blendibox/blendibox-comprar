import { NEWSLETTER_WORKER_URL } from '../config/newsletter'
import type { Product } from '../types/product'

// Eventos pra API de Conversões da Pinterest. O site NÃO carrega a tag da
// Pinterest: o navegador avisa o Worker (POST /pin-event, ver
// worker/newsletter-worker.js), que completa com IP/user-agent reais e repassa
// com o token (secret). Fire-and-forget — nunca bloqueia nem quebra a página.

export type PinterestEventName = 'page_visit' | 'view_category' | 'signup' | 'lead' | 'custom'

// Um produto no formato `custom_data.contents` da Pinterest (id, preço e
// quantidade são obrigatórios lá; nome, categoria e marca são opcionais).
export interface PinterestContent {
  id: string
  itemPrice: number | null
  quantity: number
  itemName?: string
  itemCategory?: string
  itemBrand?: string
}

export interface PinterestEventParams {
  contentName?: string
  contentIds?: string[]
  contentCategory?: string
  contentBrand?: string
  contents?: PinterestContent[]
  value?: number | null
  currency?: string
}

// Último nível da categoria da loja ("Joias > Anéis" → "Anéis"). Alguns feeds
// mandam o ID numérico do Google no lugar do nome ("479") — não diz nada pra
// quem lê o relatório, então fica de fora.
function productCategoryLabel(product: Product): string | undefined {
  for (const raw of [product.productType, product.merchantCategory, product.categoryName]) {
    const label = String(raw || '').split('>').map((s) => s.trim()).filter(Boolean).pop()
    if (label && !/^\d+$/.test(label)) return label
  }
  return undefined
}

// Dados de produto de uma visita à página dele. O `id` é o mesmo `g:id` do feed
// do Merchant/Pinterest (loja-idDoProduto), pra o evento casar com o item do
// catálogo; preço e marca seguem o que o próprio feed anuncia (g:price e g:brand).
export function pinterestProductParams(product: Product): PinterestEventParams {
  const id = `${product.merchantSlug}-${product.merchantProductId || product.slug}`
  const brand = product.brandName || product.merchantDisplayName
  const category = productCategoryLabel(product)
  return {
    contentName: product.productName,
    contentIds: [id],
    contentBrand: brand,
    value: product.searchPrice,
    currency: product.currency,
    contents: [
      { id, itemPrice: product.searchPrice, quantity: 1, itemName: product.productName, itemCategory: category, itemBrand: brand },
    ],
  }
}

// Só o domínio de produção dispara — dev (localhost) e pré-visualizações não
// podem sujar os relatórios de conversão da conta de anúncios.
const PRODUCTION_HOST = 'comprar.blendibox.com.br'

// `epik` é o id do clique que a Pinterest anexa à URL de quem vem de um Pin;
// só aparece na página de entrada, então guarda pros eventos seguintes da
// visita (e de uma volta nos próximos dias). 30 dias é a janela de atribuição.
const EPIK_KEY = 'compare-ofertas:pin-epik'
const EPIK_TTL_MS = 30 * 24 * 60 * 60 * 1000

function currentEpik(): string | undefined {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('epik')
    if (fromUrl) {
      localStorage.setItem(EPIK_KEY, JSON.stringify({ value: fromUrl, savedAt: Date.now() }))
      return fromUrl
    }
    const raw = localStorage.getItem(EPIK_KEY)
    if (!raw) return undefined
    const saved = JSON.parse(raw) as { value?: string; savedAt?: number }
    if (saved.value && saved.savedAt && Date.now() - saved.savedAt < EPIK_TTL_MS) return saved.value
  } catch {
    // storage bloqueado: segue sem o id do clique
  }
  return undefined
}

// Código ALEATÓRIO e anônimo do visitante (não é e-mail nem nada que o
// identifique): serve só pra Pinterest reconhecer que vários eventos vêm do
// mesmo navegador (o "External ID" da qualidade de evento). Fica no
// localStorage, é renovado depois de ~13 meses e o Worker só repassa o HASH
// dele — o valor bruto nunca sai da nossa infraestrutura. Sem localStorage não
// inventa id novo a cada evento (pareceria um visitante diferente toda vez):
// simplesmente omite.
const VISITOR_KEY = 'compare-ofertas:pin-visitor'
const VISITOR_TTL_MS = 395 * 24 * 60 * 60 * 1000

function visitorId(): string | undefined {
  try {
    const raw = localStorage.getItem(VISITOR_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as { value?: string; createdAt?: number }
      if (saved.value && saved.createdAt && Date.now() - saved.createdAt < VISITOR_TTL_MS) return saved.value
    }
    const value = newEventId()
    localStorage.setItem(VISITOR_KEY, JSON.stringify({ value, createdAt: Date.now() }))
    return value
  } catch {
    // storage bloqueado: segue sem o id do visitante
    return undefined
  }
}

// Respeita "Não rastrear" e Global Privacy Control.
function trackingOptedOut(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean }
  return nav.doNotTrack === '1' || nav.globalPrivacyControl === true
}

function newEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

export function sendPinterestEvent(eventName: PinterestEventName, params: PinterestEventParams = {}): void {
  if (typeof window === 'undefined' || window.location.hostname !== PRODUCTION_HOST) return
  try {
    if (trackingOptedOut()) return
    const payload = {
      eventName,
      eventId: newEventId(),
      // Só origem + caminho: a query pode carregar token (ex: edição da lista de presentes).
      url: `${window.location.origin}${window.location.pathname}`,
      epik: currentEpik(),
      externalId: visitorId(),
      ...params,
    }
    // text/plain evita o preflight do CORS; keepalive deixa o envio terminar
    // mesmo se a pessoa sair da página logo em seguida (clique pra loja).
    void fetch(`${NEWSLETTER_WORKER_URL}/pin-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(payload),
      keepalive: true,
      credentials: 'omit',
    }).catch(() => undefined)
  } catch {
    // medição nunca pode quebrar a página
  }
}
