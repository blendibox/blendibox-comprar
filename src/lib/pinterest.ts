import { NEWSLETTER_WORKER_URL } from '../config/newsletter'

// Eventos pra API de Conversões da Pinterest. O site NÃO carrega a tag da
// Pinterest: o navegador avisa o Worker (POST /pin-event, ver
// worker/newsletter-worker.js), que completa com IP/user-agent reais e repassa
// com o token (secret). Fire-and-forget — nunca bloqueia nem quebra a página.

export type PinterestEventName = 'page_visit' | 'view_category' | 'signup' | 'lead' | 'custom'

export interface PinterestEventParams {
  contentName?: string
  contentIds?: string[]
  contentCategory?: string
  value?: number | null
  currency?: string
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
