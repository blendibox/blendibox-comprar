// Regras da central de cupons (/cupons/ e /cupons/{loja}/). Funções puras: o
// prerender (via entry-server) e o navegador usam o MESMO código, então o HTML
// estático e a primeira renderização do cliente saem iguais (hidratação).
//
// Por que existe: em 26/11/2026 o coupons.json tinha 546 itens, mas 323 (59%)
// eram ofertas sem código da Arno — 23 dos 24 primeiros cartões da página —,
// 93 eram duplicatas exatas e dezenas eram o mesmo produto em 127V e 220V.
import type { CouponEntry } from '../types/product'
import { matchesSearch, normalizeSearchText } from './search'
import { parseBrDate } from './date'


export interface CouponVariant {
  label: string
  deeplink: string
}

export type CouponItem = CouponEntry & { variants?: CouponVariant[] }

export interface StoreSummary {
  slug: string
  name: string
  merchantId: string | null
  total: number
  withCode: number
}

export interface StoreBlock extends StoreSummary {
  offers: CouponItem[]
  offerTotal: number
}

export interface CouponSummary {
  codes: number
  offers: number
  stores: StoreSummary[]
  verticals: { id: string; count: number }[]
}

export interface CouponsPageData {
  summary: CouponSummary
  codes: CouponItem[]
  blocks: StoreBlock[]
}

export type CouponType = '' | 'codigo' | 'oferta'

export interface CouponFilters {
  term: string
  type: CouponType
  vertical: string
  store: string
}

export const OVERVIEW_CODES = 12
export const OVERVIEW_OFFERS_PER_STORE = 3
export const PAGE_SIZE = 24

const VERTICAL_LABELS: Record<string, string> = {
  moda: 'Moda',
  beleza: 'Beleza',
  casa: 'Casa',
  eletronicos: 'Eletrônicos',
  esporte: 'Esporte',
  joias: 'Joias',
  brinquedos: 'Brinquedos',
  saude: 'Saúde',
  pet: 'Pet',
  livros: 'Livros',
  automotivo: 'Automotivo',
}

export function verticalLabel(id: string): string {
  return VERTICAL_LABELS[id] ?? id.charAt(0).toUpperCase() + id.slice(1)
}

const VOLTAGE = /\s*[-–(]?\s*\b(110|127|220)\s*v(?:olts)?\b\)?/i

function normalizeTitle(title: string): string {
  return title.replace(/\s+/g, ' ').trim().toLowerCase()
}

export function stripVoltage(title: string): string {
  return title.replace(VOLTAGE, '').replace(/\s+/g, ' ').trim()
}

// 1) tira duplicata exata (loja + título + código + link); 2) junta o mesmo
// produto em voltagens diferentes (só ofertas sem código, mesma validade) num
// item com um botão por voltagem. Nada além disso é fundido: títulos diferentes
// que caem na mesma página são promoções diferentes.
export function prepareCoupons(list: CouponEntry[]): CouponItem[] {
  const seen = new Set<string>()
  const unique = list.filter((c) => {
    const key = [c.advertiser, normalizeTitle(c.title), c.code ?? '', c.deeplink].join('|')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const voltageKey = (c: CouponEntry) => [c.advertiser, normalizeTitle(stripVoltage(c.title)), c.ends].join('|')
  const voltageGroups = new Map<string, Map<string, string>>()
  for (const c of unique) {
    const match = !c.isVoucher && c.title.match(VOLTAGE)
    if (!match) continue
    const key = voltageKey(c)
    const group = voltageGroups.get(key) ?? new Map<string, string>()
    if (!group.has(`${match[1]}V`)) group.set(`${match[1]}V`, c.deeplink)
    voltageGroups.set(key, group)
  }

  const emitted = new Set<string>()
  const result: CouponItem[] = []
  for (const c of unique) {
    const match = !c.isVoucher && c.title.match(VOLTAGE)
    const group = match ? voltageGroups.get(voltageKey(c)) : undefined
    if (!match || !group || group.size < 2) {
      result.push(c)
      continue
    }
    const key = voltageKey(c)
    if (emitted.has(key)) continue
    emitted.add(key)
    const variants = [...group.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, deeplink]) => ({ label, deeplink }))
    result.push({ ...c, title: stripVoltage(c.title), deeplink: variants[0].deeplink, variants })
  }
  return result
}

export const storeKey = (c: CouponEntry) => c.merchantSlug || c.advertiser

// Uma de cada loja por rodada, preservando a ordem dentro da loja — nenhuma loja
// com centenas de itens domina o começo da lista.
export function interleaveByStore<T extends CouponEntry>(list: T[]): T[] {
  const queues = new Map<string, T[]>()
  for (const c of list) {
    const queue = queues.get(storeKey(c))
    if (queue) queue.push(c)
    else queues.set(storeKey(c), [c])
  }
  const pending = [...queues.values()]
  const result: T[] = []
  for (let round = 0; result.length < list.length; round++) {
    for (const queue of pending) {
      if (round < queue.length) result.push(queue[round])
    }
  }
  return result
}

export function summarizeStores(items: CouponItem[]): StoreSummary[] {
  const stores = new Map<string, StoreSummary>()
  for (const c of items) {
    const slug = storeKey(c)
    const store = stores.get(slug) ?? { slug, name: c.advertiser, merchantId: c.merchantId, total: 0, withCode: 0 }
    store.total++
    if (c.isVoucher) store.withCode++
    stores.set(slug, store)
  }
  return [...stores.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

export function summarize(items: CouponItem[]): CouponSummary {
  const verticals = new Map<string, number>()
  for (const c of items) if (c.vertical) verticals.set(c.vertical, (verticals.get(c.vertical) ?? 0) + 1)
  const codes = items.filter((c) => c.isVoucher).length
  return {
    codes,
    offers: items.length - codes,
    stores: summarizeStores(items),
    verticals: [...verticals.entries()].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count),
  }
}

// Visão inicial: amostra intercalada dos códigos e, por loja, poucas ofertas.
export function buildOverview(items: CouponItem[], vertical = ''): { codes: CouponItem[]; codeTotal: number; blocks: StoreBlock[] } {
  const scope = vertical ? items.filter((c) => c.vertical === vertical) : items
  const codes = interleaveByStore(scope.filter((c) => c.isVoucher))
  const offers = scope.filter((c) => !c.isVoucher)
  const blocks = summarizeStores(offers)
    .map((store) => {
      const mine = offers.filter((c) => storeKey(c) === store.slug)
      return { ...store, offerTotal: mine.length, offers: mine.slice(0, OVERVIEW_OFFERS_PER_STORE) }
    })
    .sort((a, b) => b.offerTotal - a.offerTotal || a.name.localeCompare(b.name, 'pt-BR'))
  return { codes: codes.slice(0, OVERVIEW_CODES), codeTotal: codes.length, blocks }
}

// Junta "R$ 60" -> "R$60" e "20 %" -> "20%", pra o valor digitado casar com
// qualquer grafia do título.
function tightenValues(text: string): string {
  return text.replace(/r\$\s+(?=\d)/gi, 'R$').replace(/(\d)\s+%/g, '$1%')
}

const VALUE_WORD = /^(?:r\$\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?%)$/

// Plural simples do português: "cafeteiras" -> "cafeteira", "colchões" (já sem
// acento: "colchoes") -> "colchao".
function singularize(word: string): string {
  if (word.length <= 4) return word
  if (word.endsWith('oes')) return `${word.slice(0, -3)}ao`
  return word.endsWith('s') ? word.slice(0, -1) : word
}

const singularizeText = (text: string) => normalizeSearchText(text).split(/\s+/).map(singularize).join(' ')

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Palavra curta não pode casar no meio de outra: "tv" não é "ativa" e "ar" não é
// "Arno". Até 2 letras exige a palavra inteira (aceita plural); 3 letras exige o
// começo de uma palavra; de 4 em diante (e números) vale pedaço, como no resto do
// site — é o que faz a busca funcionar enquanto a pessoa ainda digita.
function containsWord(haystack: string, word: string): boolean {
  if (word.length >= 4 || /^\d+$/.test(word)) return haystack.includes(word)
  const whole = word.length <= 2 ? 's?(?![a-z0-9])' : ''
  return new RegExp(`(?<![a-z0-9])${escapeRegExp(word)}${whole}`).test(haystack)
}

// Busca por loja, produto, código OU VALOR do desconto. Palavra que é um valor
// ("20%", "R$60") só casa o número inteiro: "R$60" não acha "R$600" e "5%" não
// acha "15%". As demais palavras seguem a busca tolerante do site (sem acento,
// em qualquer ordem) e valem no singular ou no plural.
export function matchesCoupon(c: CouponEntry, term: string): boolean {
  const words = normalizeSearchText(tightenValues(term)).trim().split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const fields = [c.advertiser, c.title, c.code, c.description].map((f) => (f ? tightenValues(f) : f))
  const values = words.filter((w) => VALUE_WORD.test(w))
  const text = words.filter((w) => !VALUE_WORD.test(w))
  const joined = fields.filter(Boolean).join(' ')
  const haystack = normalizeSearchText(joined)
  if (text.length) {
    const singular = singularizeText(joined)
    if (!text.every((word) => containsWord(haystack, word) || containsWord(singular, singularize(word)))) return false
  }
  return values.every((value) => new RegExp(`(?<![\\d.,])${escapeRegExp(value)}(?![\\d]|[.,]\\d)`).test(haystack))
}

export interface StoreMatch extends StoreSummary {
  matches: number
  nameMatches: boolean
}

// Busca de dentro do seletor de loja: acha a loja pelo NOME ou pelo que ela tem
// (produto, código ou valor do desconto). Com a busca vazia, lista todas as lojas
// que têm itens em `pool`.
export function searchStores(pool: CouponItem[], query: string): StoreMatch[] {
  const trimmed = query.trim()
  const hits = new Map<string, number>()
  for (const c of pool) if (matchesCoupon(c, trimmed)) hits.set(storeKey(c), (hits.get(storeKey(c)) ?? 0) + 1)
  return summarizeStores(pool)
    .map((store) => ({
      ...store,
      matches: hits.get(store.slug) ?? 0,
      nameMatches: Boolean(trimmed) && matchesSearch([store.name], trimmed),
    }))
    .filter((store) => !trimmed || store.matches > 0)
    .sort((a, b) =>
      trimmed
        ? Number(b.nameMatches) - Number(a.nameMatches) || b.matches - a.matches || a.name.localeCompare(b.name, 'pt-BR')
        : a.name.localeCompare(b.name, 'pt-BR'),
    )
}

export function filterCoupons(items: CouponItem[], filters: CouponFilters): CouponItem[] {
  const matched = items.filter((c) => {
    if (filters.type === 'codigo' && !c.isVoucher) return false
    if (filters.type === 'oferta' && c.isVoucher) return false
    if (filters.vertical && c.vertical !== filters.vertical) return false
    if (filters.store && storeKey(c) !== filters.store) return false
    return matchesCoupon(c, filters.term)
  })
  // códigos primeiro; dentro de cada tipo, lojas intercaladas
  return [...interleaveByStore(matched.filter((c) => c.isVoucher)), ...interleaveByStore(matched.filter((c) => !c.isVoucher))]
}

// ---- "Lojas que vendem <termo>": vem do CATÁLOGO do próprio site, não de chute
// por categoria ("Casa" inclui loja que só vende colchão). O build gera um
// arquivo pequeno (loja -> palavra -> nº de produtos) com
// scripts/generate-coupon-store-keywords.mjs, que usa as funções abaixo.
export type StoreKeywords = Record<string, Record<string, number>>

const KEYWORD_STOPWORDS = new Set(
  'de da do em no na os as um ou ao por que com para sem dos das uma uns nas nos cm mm ml kg un kit off cupom cupon cupons oferta desconto descontos promocao promo frete gratis loja site compra compras ate'.split(
    ' ',
  ),
)

// Palavra do catálogo ou da busca: sem acento, minúscula, plural simples cortado.
// Entra qualquer coisa com 2+ caracteres e alguma letra ("tv", "4k", "ps5").
export function keywordsOf(text: string): string[] {
  return (normalizeSearchText(text).match(/[a-z0-9]{2,}/g) ?? [])
    .filter((word) => /[a-z]/.test(word))
    .map(singularize)
    .filter((word) => !KEYWORD_STOPWORDS.has(word))
}

// Lojas cujo catálogo tem todas as palavras da busca -> nº de produtos (o menor
// entre as palavras). Valores de desconto ("20%", "R$60") não são produto.
export function storesSelling(term: string, keywords: StoreKeywords): Map<string, number> {
  const productPart = tightenValues(term)
    .split(/\s+/)
    .filter((word) => !VALUE_WORD.test(normalizeSearchText(word)))
    .join(' ')
  const words = [...new Set(keywordsOf(productPart))]
  if (!words.length) return new Map()

  const collect = (byPrefix: boolean) => {
    const result = new Map<string, number>()
    for (const [store, counts] of Object.entries(keywords)) {
      const hits = words.map((word) => {
        if (Object.hasOwn(counts, word)) return counts[word]
        if (!byPrefix || word.length < 4) return 0
        let best = 0
        for (const key in counts) if (key.startsWith(word) && counts[key] > best) best = counts[key]
        return best
      })
      if (hits.every((n) => n > 0)) result.set(store, Math.min(...hits))
    }
    return result
  }

  // Palavra inteira primeiro; só se nada casar, aceita o começo dela (a pessoa
  // ainda está digitando).
  const exact = collect(false)
  return exact.size ? exact : collect(true)
}

export function isStillValid(c: CouponEntry, now: Date): boolean {
  const ends = parseBrDate(c.ends)
  return !ends || ends >= now
}

// Contador regressivo só pra quem acaba em até 48h. É contagem REAL até o horário
// de término do cupom (nunca um cronômetro que reinicia).
export const COUNTDOWN_WINDOW_MS = 48 * 3600 * 1000

// 93784000 -> "1d 02h 03min 04s"; abaixo de um dia, sem o "d".
export function countdownText(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(total / 86400)
  const pad = (n: number) => String(n).padStart(2, '0')
  const clock = `${pad(Math.floor((total % 86400) / 3600))}h ${pad(Math.floor((total % 3600) / 60))}min ${pad(total % 60)}s`
  return days ? `${days}d ${clock}` : clock
}

// Dado embutido no HTML de /cupons/ pelo prerender: só o que a visão inicial
// mostra (o resto o navegador busca em coupons.json).
export function buildCouponsPageData(list: CouponEntry[], now: Date = new Date()): CouponsPageData {
  const items = prepareCoupons(list.filter((c) => isStillValid(c, now)))
  const overview = buildOverview(items)
  return { summary: summarize(items), codes: overview.codes, blocks: overview.blocks }
}
