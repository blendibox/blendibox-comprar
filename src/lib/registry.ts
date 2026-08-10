import { NEWSLETTER_WORKER_URL } from '../config/newsletter'

// Cliente da API da lista de presentes (mesmo Worker da newsletter). Ver
// worker/newsletter-worker.js (handleRegistry) e docs/lista-presentes-spec.md.
const BASE = NEWSLETTER_WORKER_URL

export type RegistryItemStatus = 'disponivel' | 'interesse' | 'comprado'
export type RegistryEventType = 'casamento' | 'aniversario' | 'cha' | 'outro'

export interface RegistryItem {
  id: string
  merchantSlug: string
  slug: string
  name: string
  image: string | null
  price: number | null
  status: RegistryItemStatus
}

export interface RegistryData {
  registry: { id: string; title: string; eventType: RegistryEventType; eventDate: string | null }
  items: RegistryItem[]
}

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || `HTTP ${res.status}`)
  return data as T
}

export function createRegistry(input: {
  title: string
  eventType: RegistryEventType
  eventDate?: string
  ownerEmail: string
}) {
  return request<{ ok: true; id: string; editToken: string }>('/registry', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function getRegistry(id: string) {
  return request<RegistryData>(`/registry/${id}`, { method: 'GET' })
}

export function registerGuest(id: string, input: { email: string; consent: boolean; subscribeNewsletter?: boolean }) {
  return request<{ ok: true; accessToken: string }>(`/registry/${id}/access`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function addRegistryItem(
  id: string,
  editToken: string,
  item: { merchantSlug: string; slug: string; name: string; image?: string | null; price?: number | null; deeplink: string }
) {
  return request<{ ok: true; itemId: string }>(`/registry/${id}/items`, {
    method: 'POST',
    body: JSON.stringify({ editToken, item }),
  })
}

export function removeRegistryItem(id: string, itemId: string, editToken: string) {
  return request<{ ok: true }>(`/registry/${id}/items/${itemId}`, {
    method: 'DELETE',
    body: JSON.stringify({ editToken }),
  })
}

// Registra o interesse do convidado e devolve o deeplink de afiliado já com o
// clickref — o front redireciona pra loja. A compra só é confirmada depois,
// pelo webhook da Awin.
export function recordInterest(id: string, itemId: string, accessToken?: string) {
  return request<{ ok: true; deeplink: string; clickref: string }>(`/registry/${id}/items/${itemId}/interest`, {
    method: 'POST',
    body: JSON.stringify({ accessToken: accessToken || '' }),
  })
}

// --- Tokens guardados no navegador (sem conta/senha no MVP) ---------------

const ownerKey = (id: string) => `registry:owner:${id}`
const guestKey = (id: string) => `registry:guest:${id}`

export function saveOwnerToken(id: string, editToken: string) {
  try {
    localStorage.setItem(ownerKey(id), editToken)
  } catch {
    // localStorage indisponível — o token também vai na URL de gestão
  }
}

export function getOwnerToken(id: string): string | null {
  try {
    return localStorage.getItem(ownerKey(id))
  } catch {
    return null
  }
}

export function saveGuestToken(id: string, accessToken: string) {
  try {
    localStorage.setItem(guestKey(id), accessToken)
  } catch {
    // segue sem persistir — pede o e-mail de novo na próxima visita
  }
}

export function getGuestToken(id: string): string | null {
  try {
    return localStorage.getItem(guestKey(id))
  } catch {
    return null
  }
}
