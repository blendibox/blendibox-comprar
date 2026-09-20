// Texto gerado dos DADOS de preço (nada de opinião editorial): o bloco de dados
// das páginas de categoria e o FAQ das páginas de produto com queda. Puro — sem
// React nem relógio (só as datas que vêm nos próprios dados) —, então o servidor
// (prerender, que grava o HTML estático e o JSON-LD) e o navegador geram
// exatamente o mesmo texto, e a hidratação não diverge.
//
// Por quê: buscadores e assistentes de IA (a busca do ChatGPT parte do índice do
// Bing) citam páginas que respondem "quanto custa", "qual o menor preço" e "está
// em queda". O nosso diferencial é o histórico e a queda verificada
// (src/lib/priceDrop.ts), então é isso que as respostas dizem.

import type { CategoryInsights, FaqItem, PricePoint, ProductIndexEntry } from '../types/product'
import { BADGE_MIN_HISTORY_DAYS, REFERENCE_WINDOW_DAYS, summarizePriceHistory, verifiedMinHistoryDays } from './priceDrop'

// Categoria com menos que isso não ganha bloco de dados (estatística de meia
// dúzia de produtos não diz nada)
export const CATEGORY_INSIGHTS_MIN_PRODUCTS = 8
// Categorias do feed sem nome que sirva de texto: "guarda-chuva" (geral), em
// espanhol/inglês (o feed de alguns parceiros vem assim) ou só um número
// (ex.: /categoria/479/) — estatística com esse nome seria lixo
const SKIPPED_CATEGORY_SLUGS = new Set(['geral', 'ropa-y-accesorios', 'camisas-y-tops', 'pantalones', 'cosmetics'])
const isUsableCategory = (slug: string) => !SKIPPED_CATEGORY_SLUGS.has(slug) && !/^\d+$/.test(slug)

// Categoria que vale listar no sitemap: as mesmas que ganham o bloco de dados
// (nome que sirva de texto e produto suficiente). O resto continua existindo e
// linkado no site, só não é anunciado ao Bing/Google — as diretrizes do Bing
// pedem sitemap só com URL de valor, porque a capacidade de rastreio é limitada
// e URL de baixo valor atrasa a indexação das importantes.
export function isSitemapCategory(categorySlug: string, productCount: number): boolean {
  return isUsableCategory(categorySlug) && productCount >= CATEGORY_INSIGHTS_MIN_PRODUCTS
}

// O rótulo da categoria vem do slug ("tenis"), sem acento. Nos textos gerados
// (FAQ) restaura o acento das palavras mais comuns — o título da página segue
// como está.
const ACCENTED_WORDS: Record<string, string> = {
  tenis: 'tênis',
  oculos: 'óculos',
  relogios: 'relógios',
  aneis: 'anéis',
  calca: 'calça',
  calcas: 'calças',
  calcao: 'calção',
  acessorio: 'acessório',
  acessorios: 'acessórios',
  bone: 'boné',
  bones: 'bonés',
  caes: 'cães',
  passaros: 'pássaros',
  pecas: 'peças',
  sandalias: 'sandálias',
  eletrodomesticos: 'eletrodomésticos',
  colonia: 'colônia',
  estimacao: 'estimação',
  maio: 'maiô',
}
export function accentuateLabel(label: string): string {
  return label
    .split(' ')
    .map((word) => ACCENTED_WORDS[word] ?? word)
    .join(' ')
}
const MAX_LISTED_DROPS = 5

export function formatBRL(value: number, currency = 'BRL'): string {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value).replace(/ /g, ' ')
  } catch {
    return `${currency} ${value.toFixed(2).replace('.', ',')}`
  }
}

// 13.3 -> "13,3" (vírgula decimal do pt-BR, sem depender do ICU do ambiente)
export const formatPercent = (value: number): string => String(value).replace('.', ',')

// AAAA-MM-DD -> dd/mm/aaaa (sem passar por fuso)
export function formatDateBr(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}

const lowerMedian = (sorted: number[]) => sorted[Math.floor((sorted.length - 1) / 2)]

// ---- Categoria -------------------------------------------------------------

export function buildCategoryInsights(
  items: ProductIndexEntry[],
  categorySlug: string,
  label: string,
  updatedIso: string
): CategoryInsights | null {
  if (!isUsableCategory(categorySlug)) return null
  label = accentuateLabel(label)
  const priced = items.filter((p) => p.searchPrice != null && p.searchPrice > 0)
  if (priced.length < CATEGORY_INSIGHTS_MIN_PRODUCTS) return null

  const byPrice = [...priced].sort(
    (a, b) => a.searchPrice! - b.searchPrice! || a.merchantSlug.localeCompare(b.merchantSlug) || a.slug.localeCompare(b.slug)
  )
  const prices = byPrice.map((p) => p.searchPrice as number)
  const cheapest = byPrice[0]
  const merchantCount = new Set(items.map((p) => p.merchantSlug)).size
  const path = (p: ProductIndexEntry) => `/${p.merchantSlug}/${p.slug}/`

  const verified = items
    .filter((p) => p.priceDropVerified === true && p.priceDropPercent != null && p.searchPrice != null)
    .sort(
      (a, b) =>
        (b.priceDropPercent as number) - (a.priceDropPercent as number) ||
        a.merchantSlug.localeCompare(b.merchantSlug) ||
        a.slug.localeCompare(b.slug)
    )
  const validDropCount = items.filter((p) => p.priceDropPercent != null).length
  const drops = verified.slice(0, MAX_LISTED_DROPS).map((p) => ({
    name: p.productName,
    merchant: p.merchantDisplayName,
    price: p.searchPrice as number,
    percent: p.priceDropPercent as number,
    path: path(p),
  }))

  const currency = cheapest.currency || 'BRL'
  const insights: CategoryInsights = {
    updatedIso,
    count: items.length,
    merchantCount,
    minPrice: prices[0],
    maxPrice: prices[prices.length - 1],
    medianPrice: lowerMedian(prices),
    cheapest: { name: cheapest.productName, merchant: cheapest.merchantDisplayName, price: cheapest.searchPrice as number, path: path(cheapest) },
    verifiedDropCount: verified.length,
    validDropCount,
    drops,
    faq: [],
  }

  const updated = formatDateBr(updatedIso)
  const money = (v: number) => formatBRL(v, currency)
  const dropAnswer =
    verified.length > 0
      ? `Sim: ${verified.length} ${verified.length === 1 ? 'produto teve' : 'produtos tiveram'} queda verificada nos últimos 7 dias. ` +
        `A maior é de ${formatPercent(drops[0].percent)}% em ${drops[0].name} (${drops[0].merchant}), por ${money(drops[0].price)}.`
      : validDropCount > 0
        ? `Encontramos ${validDropCount} ${validDropCount === 1 ? 'produto' : 'produtos'} abaixo do preço habitual, mas nenhum passou ainda em todas as checagens de queda verificada.`
        : `Hoje não encontramos queda de preço em ${label}. A gente confere todo dia.`

  insights.faq = [
    {
      question: `Qual o menor preço de ${label} hoje?`,
      answer:
        `Entre os ${insights.count.toLocaleString('pt-BR')} produtos de ${label} que comparamos, o mais barato custa ${money(insights.minPrice)} ` +
        `(${cheapest.productName}, ${cheapest.merchantDisplayName}). Os preços vão até ${money(insights.maxPrice)}, e metade dos produtos custa até ${money(insights.medianPrice)}. ` +
        `Preços de ${updated}.`,
    },
    {
      question: `Quantos produtos e lojas de ${label} vocês comparam?`,
      answer: `${insights.count.toLocaleString('pt-BR')} produtos de ${merchantCount} ${merchantCount === 1 ? 'loja parceira' : 'lojas parceiras'}, com preços atualizados em ${updated}.`,
    },
    { question: `Tem ${label} em queda de preço agora?`, answer: dropAnswer },
    {
      question: 'Como vocês verificam as quedas de preço?',
      answer:
        `Comparamos o preço de hoje com o preço habitual do produto — a mediana do que monitoramos nos últimos meses (até ${REFERENCE_WINDOW_DAYS} dias) — e não com o de uma semana atrás. ` +
        `Só chamamos de queda verificada quando é o menor preço que monitoramos, o produto tem pelo menos ${verifiedMinHistoryDays(updatedIso)} dias de histórico e não houve sobe e desce recente.`,
    },
  ]
  return insights
}

// ---- Produto ---------------------------------------------------------------

export interface ProductFaqInput {
  productName: string
  merchantDisplayName: string
  currency: string
  searchPrice: number | null
  priceHistory?: PricePoint[]
  priceDropPercent: number | null
  priceDropVerified?: boolean
  lowestPriceDays?: number | null
}

// Só entra no FAQ quem tem o que dizer: produto com queda de preço (o selo "X%
// essa semana") OU com preço que oscilou muito (o maior preço já foi ao menos 50%
// acima do menor) — exatamente onde o histórico responde "vale a pena / é
// desconto de verdade?". Nas ~140 mil páginas de preço parado o texto seria só
// repetição, e pesaria no tamanho do site (perto do limite do GitHub Pages):
// hoje são cerca de 6 mil páginas (~12 MB).
export const PRODUCT_FAQ_MIN_RANGE_RATIO = 1.5

export function buildProductFaq(product: ProductFaqInput): FaqItem[] {
  const current = product.searchPrice
  const history = product.priceHistory
  if (current == null || !history || history.length < 2) return []

  // Âncora de "hoje" = último ponto do histórico (o build do dia), nunca o relógio
  const todayIso = history[history.length - 1].date
  const summary = summarizePriceHistory(history, current, todayIso)
  if (!summary || summary.historyDays < BADGE_MIN_HISTORY_DAYS) return []
  const oscillated = summary.highest.price >= summary.lowest.price * PRODUCT_FAQ_MIN_RANGE_RATIO
  if (product.priceDropPercent == null && !oscillated) return []

  const money = (v: number) => formatBRL(v, product.currency || 'BRL')
  const name = product.productName
  const { lowest, highest, habitual, historyDays } = summary

  const lowestAnswer =
    lowest.price >= current
      ? `O preço de hoje, ${money(current)}, é o menor que monitoramos em ${historyDays} dias.`
      : `O menor preço que monitoramos foi ${money(lowest.price)}, em ${formatDateBr(lowest.date)}. Hoje o produto custa ${money(current)} na ${product.merchantDisplayName}.`
  const rangeNote =
    highest.price > lowest.price ? ` No período, o preço variou entre ${money(lowest.price)} e ${money(highest.price)}.` : ''

  const diff = Math.round((Math.abs(current - habitual) / habitual) * 100)
  const habitualAnswer =
    `O preço habitual — a mediana do que monitoramos nos últimos ${Math.min(REFERENCE_WINDOW_DAYS, historyDays)} dias — é ${money(habitual)}. ` +
    (diff < 3
      ? `Hoje o preço está em linha com ele (${money(current)}).`
      : `Hoje custa ${money(current)}, ${diff}% ${current < habitual ? 'abaixo' : 'acima'}.`)

  const oscillationAnswer =
    `Oscila bastante: nos últimos ${historyDays} dias o preço já foi de ${money(lowest.price)} a ${money(highest.price)}, e hoje custa ${money(current)}` +
    (diff < 3 ? ', em linha com o preço habitual.' : `, ${diff}% ${current < habitual ? 'abaixo' : 'acima'} do preço habitual (${money(habitual)}).`) +
    ' Não identificamos, neste momento, uma queda de preço verificada.'

  const dropAnswer = product.priceDropPercent == null
    ? oscillationAnswer
    : product.priceDropVerified
    ? `Sim. Hoje ele está ${formatPercent(product.priceDropPercent)}% abaixo do preço habitual (${money(habitual)}) e é o menor preço que monitoramos em ${product.lowestPriceDays ?? historyDays} dias, sem sobe e desce recente.`
    : `Caiu ${formatPercent(product.priceDropPercent)}% em relação ao preço habitual (${money(habitual)}), mas ainda não passa em todas as nossas checagens (histórico mínimo, menor preço do período e ausência de oscilação recente) — por isso não o destacamos como queda verificada.`

  return [
    { question: `Qual o menor preço de ${name} que vocês monitoraram?`, answer: lowestAnswer + rangeNote },
    { question: `Qual o preço habitual de ${name}?`, answer: habitualAnswer },
    {
      question: product.priceDropPercent == null ? `O preço de ${name} oscila?` : `O preço de ${name} caiu de verdade?`,
      answer: dropAnswer,
    },
  ]
}

// JSON-LD FAQPage (o prerender injeta no <head>; o texto é o mesmo da página)
export function faqJsonLd(items: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }
}
