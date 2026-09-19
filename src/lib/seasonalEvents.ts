import type { ProductIndexEntry, SeasonalDropsFile, SeasonalDropsSlice } from '../types/product'

// Datas comemorativas do site: banner no topo, tag nos produtos, seção na
// home, página de campanha e o texto dos vídeos/posts/e-mail semanal. Tudo
// decidido por data, sem deploy pra ligar/desligar — e tudo numa tabela só
// (este arquivo é puro, sem React, pra scripts/*.mjs poderem usar também):
//
//   • SEASONAL_LANDINGS  páginas de campanha (/black-friday/, /dia-das-maes/...)
//   • SEASONAL_EVENTS    janela de datas + banner + tag + seção da home de cada época
//
// Evento novo = uma entrada em SEASONAL_EVENTS (mais uma em SEASONAL_LANDINGS
// se tiver página própria). O visual de cada `palette` fica no index.css
// (.seasonal-theme--*). A regra da tag — só com queda de preço confirmada ou
// cupom ativo — vale pra todos e está em SeasonalTag.tsx.
//
// Eventos com `landing` "têm conteúdo": ganham página, seção na home, e o
// vídeo diário/Telegram/e-mail semanal passam a falar da época. Os "só banner"
// (landing null) existem pra mostrar atenção à data sem prometer um conteúdo
// que o catálogo não sustenta (não temos chocolate pra Páscoa, por exemplo).

export type SeasonalIconName =
  | 'flame'
  | 'tag'
  | 'gift'
  | 'party-popper'
  | 'heart'
  | 'sparkles'
  | 'shield-check'
  | 'graduation-cap'
export type SeasonalPalette =
  | 'black'
  | 'natal'
  | 'criancas'
  | 'consumidor'
  | 'maes'
  | 'namorados'
  | 'noivas'
  | 'pais'
  | 'pascoa'
  | 'aulas'

const TIME_ZONE = 'America/Sao_Paulo'
const DAY_MS = 86_400_000

// Data de hoje no fuso de Brasília (não do visitante nem do servidor de
// build) — a virada de tema acontece à meia-noite daqui pra todo mundo.
function brazilDate(now: Date) {
  const iso = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  const [year, month, day] = iso.split('-').map(Number)
  return { year, month, day }
}

export function brazilYear(now: Date = new Date()): number {
  return brazilDate(now).year
}

// Dia do calendário como número inteiro (dias desde a época, em UTC) —
// comparável e sem surpresa de fuso/horário de verão. Aceita dia fora do mês
// (ex.: dia -11 de maio = 19/04): o Date.UTC normaliza.
const dayNumber = (year: number, month: number, day: number) => Date.UTC(year, month - 1, day) / DAY_MS

const pad = (n: number) => String(n).padStart(2, '0')

// Dia do mês da n-ésima ocorrência de um dia da semana (0 = domingo).
function nthWeekday(year: number, month: number, weekday: number, n: number): number {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  return 1 + ((weekday - firstWeekday + 7) % 7) + (n - 1) * 7
}

// Black Friday: o dia seguinte à 4ª quinta-feira de novembro (mesma regra do
// varejo brasileiro, que segue a data americana) — 27/11 em 2026.
export function blackFridayDayOfMonth(year: number): number {
  return nthWeekday(year, 11, 4, 4) + 1
}
const mothersDay = (year: number) => nthWeekday(year, 5, 0, 2) // 2º domingo de maio
const fathersDay = (year: number) => nthWeekday(year, 8, 0, 2) // 2º domingo de agosto

// Domingo de Páscoa (calendário gregoriano, algoritmo de Meeus/Jones/Butcher).
function easterSunday(year: number): { month: number; day: number } {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return { month, day }
}

// ---- Páginas de campanha -------------------------------------------------
// Conteúdo-base: as maiores quedas de preço CONFIRMADAS pelo histórico
// (top-price-drops.json, gerado no build), no catálogo todo ou só nos
// departamentos da época. Existem o ano todo de propósito: a URL precisa
// estar indexada bem antes da campanha começar (Google e Bing levam semanas
// pra indexar página nova nesse site), e as quedas reais são úteis fora de
// temporada também.

interface SeasonalLandingDef<Id extends string> {
  id: Id
  path: string
  palette: SeasonalPalette
  icon: SeasonalIconName
  eyebrow: string
  breadcrumb: string
  title: string
  lead: string
  seoTitle: string
  seoDescription: string
  // Departamentos (vertical) que a página lista — null = catálogo todo
  verticals: readonly string[] | null
  // Contagem regressiva ("Faltam N dias para ..."), calculada no navegador
  countdown: { date: (year: number) => { month: number; day: number }; noun: string; showDate: boolean } | null
  // Chamada pra lista de presentes (o site tem isso, e casamento é o encaixe
  // mais óbvio dela)
  registryCta?: boolean
}

function defineLanding<Id extends string>(landing: SeasonalLandingDef<Id>): SeasonalLandingDef<Id> {
  return landing
}

const VERIFIED_LEAD =
  'Só entra produto que ficou mais barato de verdade, comparado ao preço que a gente vinha monitorando.'

export const SEASONAL_LANDINGS = [
  defineLanding({
    id: 'quedas-de-preco',
    path: '/quedas-de-preco/',
    palette: 'consumidor',
    icon: 'shield-check',
    eyebrow: 'Quedas de preço',
    breadcrumb: 'Quedas de preço',
    title: 'Maiores quedas de preço verificadas',
    lead: `Todo dia comparamos o preço de cada produto com o histórico que monitoramos. ${VERIFIED_LEAD}`,
    seoTitle: 'Maiores quedas de preço de hoje | Compare Ofertas',
    seoDescription:
      'As maiores quedas de preço confirmadas hoje, de várias lojas: comparamos com o histórico que monitoramos e listamos só o que ficou mais barato de verdade.',
    verticals: null,
    countdown: null,
  }),
  defineLanding({
    id: 'black-friday',
    path: '/black-friday/',
    palette: 'black',
    icon: 'flame',
    eyebrow: 'Black Friday',
    breadcrumb: 'Black Friday',
    title: 'Black Friday: quedas de preço verificadas',
    lead: `Toda Black Friday tem desconto de fachada. Aqui ${VERIFIED_LEAD.charAt(0).toLowerCase()}${VERIFIED_LEAD.slice(1)}`,
    seoTitle: 'Black Friday: quedas de preço verificadas | Compare Ofertas',
    seoDescription:
      'Produtos que baixaram de preço de verdade na Black Friday: comparamos com o histórico que monitoramos e listamos só quedas confirmadas, atualizadas todo dia.',
    verticals: null,
    countdown: { date: (y) => ({ month: 11, day: blackFridayDayOfMonth(y) }), noun: 'a Black Friday', showDate: true },
  }),
  defineLanding({
    id: 'natal',
    path: '/natal/',
    palette: 'natal',
    icon: 'gift',
    eyebrow: 'Natal de Ofertas',
    breadcrumb: 'Natal de Ofertas',
    title: 'Natal de Ofertas: quedas de preço pra presentear',
    lead:
      'Presente bom não precisa custar caro. Veja o que baixou de preço de verdade essa semana antes de ' +
      'comprar — e não pague mais caro sem saber.',
    seoTitle: 'Natal de Ofertas: quedas de preço pra presentear | Compare Ofertas',
    seoDescription:
      'Presentes que baixaram de preço de verdade: quedas confirmadas pelo nosso histórico de preços, de várias lojas, atualizadas todo dia. Compare antes de comprar.',
    verticals: null,
    countdown: { date: () => ({ month: 12, day: 25 }), noun: 'o Natal', showDate: false },
  }),
  defineLanding({
    id: 'dia-das-maes',
    path: '/dia-das-maes/',
    palette: 'maes',
    icon: 'heart',
    eyebrow: 'Dia das Mães',
    breadcrumb: 'Dia das Mães',
    title: 'Dia das Mães: presentes que baixaram de preço',
    lead: `Joias, beleza e casa. ${VERIFIED_LEAD}`,
    seoTitle: 'Dia das Mães: presentes com queda de preço | Compare Ofertas',
    seoDescription:
      'Presentes pro Dia das Mães que baixaram de preço de verdade: joias, beleza e casa com queda confirmada pelo nosso histórico, de várias lojas.',
    verticals: ['joias', 'beleza', 'casa'],
    countdown: { date: (y) => ({ month: 5, day: mothersDay(y) }), noun: 'o Dia das Mães', showDate: true },
  }),
  defineLanding({
    id: 'mes-das-noivas',
    path: '/mes-das-noivas/',
    palette: 'noivas',
    icon: 'sparkles',
    eyebrow: 'Mês das Noivas',
    breadcrumb: 'Mês das Noivas',
    title: 'Mês das Noivas: enxoval, alianças e presentes com queda de preço',
    lead:
      'Casa e joias pra quem vai casar — e pra quem vai presentear. ' +
      VERIFIED_LEAD,
    seoTitle: 'Mês das Noivas: quedas de preço pra casar | Compare Ofertas',
    seoDescription:
      'Enxoval, eletrodomésticos e joias que baixaram de preço de verdade, com queda confirmada pelo nosso histórico. E dá pra montar a lista de presentes do casamento.',
    verticals: ['casa', 'joias'],
    countdown: null,
    registryCta: true,
  }),
  defineLanding({
    id: 'dia-dos-namorados',
    path: '/dia-dos-namorados/',
    palette: 'namorados',
    icon: 'heart',
    eyebrow: 'Dia dos Namorados',
    breadcrumb: 'Dia dos Namorados',
    title: 'Dia dos Namorados: presentes que baixaram de preço',
    lead: `Joias e beleza. ${VERIFIED_LEAD}`,
    seoTitle: 'Dia dos Namorados: presentes com queda de preço | Compare Ofertas',
    seoDescription:
      'Presentes pro Dia dos Namorados que baixaram de preço de verdade: joias e beleza com queda confirmada pelo nosso histórico, de várias lojas.',
    verticals: ['joias', 'beleza'],
    countdown: { date: () => ({ month: 6, day: 12 }), noun: 'o Dia dos Namorados', showDate: true },
  }),
  defineLanding({
    id: 'dia-dos-pais',
    path: '/dia-dos-pais/',
    palette: 'pais',
    icon: 'gift',
    eyebrow: 'Dia dos Pais',
    breadcrumb: 'Dia dos Pais',
    title: 'Dia dos Pais: presentes que baixaram de preço',
    lead: `Eletrônicos, casa e esporte. ${VERIFIED_LEAD}`,
    seoTitle: 'Dia dos Pais: presentes com queda de preço | Compare Ofertas',
    seoDescription:
      'Presentes pro Dia dos Pais que baixaram de preço de verdade: eletrônicos, casa e esporte com queda confirmada pelo nosso histórico, de várias lojas.',
    verticals: ['eletronicos', 'casa', 'esporte'],
    countdown: { date: (y) => ({ month: 8, day: fathersDay(y) }), noun: 'o Dia dos Pais', showDate: true },
  }),
]

export type SeasonalLandingId = (typeof SEASONAL_LANDINGS)[number]['id']

export function getSeasonalLanding(id: SeasonalLandingId) {
  return SEASONAL_LANDINGS.find((l) => l.id === id)!
}

// ---- Eventos -------------------------------------------------------------

interface BannerCopy {
  badge: string
  // Versão curta pro celular estreito (senão o botão não cabe ao lado)
  badgeShort?: string
  headline: (year: number) => string
  sub: string
  cta: string
  to: string
}

interface SeasonalEventDef<Id extends string> {
  id: Id
  palette: SeasonalPalette
  icon: SeasonalIconName
  // Botão vazado: ainda não é o grande dia
  soft?: boolean
  // Primeiro e último dia (inclusive) da época no ano informado
  window: (year: number) => { start: number; end: number }
  banner: BannerCopy
  // null = só banner, sem tag nos produtos
  tag: { lead: string; accent: string } | null
  // Página da campanha; null = só banner. Com ela, a época também vira
  // conteúdo: seção na home, vídeo diário, posts do Telegram e e-mail semanal.
  landing: SeasonalLandingId | null
  // Seção da home. Página sem filtro de departamento: só retitula o
  // carrossel "Caiu de preço" (já é o mesmo dado). Com departamentos: entra
  // uma seção nova, com as quedas deles. null = home igual ao normal.
  // Título e dica curtos DE PROPÓSITO: o título cabe numa linha até em celular
  // (24px, ~310px úteis) e a dica também — a altura reservada no CSS
  // (.seasonal-home-slot) supõe uma linha de cada, senão a página se mexe.
  home: { title: string; hint: string } | null
  // Hashtag do vídeo (sem #)
  hashtag: string
}

function defineEvent<Id extends string>(event: SeasonalEventDef<Id>): SeasonalEventDef<Id> {
  return event
}

// Só afirma o que o site realmente faz: comparar e mostrar queda de preço
// confirmada pelo histórico. Nada de "frete grátis" ou "compra segura" — o
// Compare Ofertas não vende nem entrega, quem vende é a loja parceira.
//
// Em ordem de calendário; se duas janelas se sobrepuserem, vale a primeira.
export const SEASONAL_EVENTS = [
  defineEvent({
    id: 'volta-as-aulas',
    palette: 'aulas',
    icon: 'graduation-cap',
    window: (y) => ({ start: dayNumber(y, 1, 12), end: dayNumber(y, 2, 8) }),
    banner: {
      badge: 'Volta às Aulas',
      headline: () => 'Volta às aulas: compare antes de comprar.',
      sub: 'Eletrônicos, mochilas e tênis com preço monitorado.',
      cta: 'Ver quedas de preço',
      to: '/quedas-de-preco/',
    },
    tag: null,
    landing: null,
    home: null,
    hashtag: 'voltaasaulas',
  }),
  defineEvent({
    id: 'dia-da-mulher',
    palette: 'maes',
    icon: 'heart',
    window: (y) => ({ start: dayNumber(y, 3, 1), end: dayNumber(y, 3, 8) }),
    banner: {
      badge: 'Dia da Mulher',
      headline: () => 'Dia 08/03: compare antes de presentear.',
      sub: 'Beleza com preço monitorado.',
      cta: 'Ver beleza',
      to: '/beleza/',
    },
    tag: null,
    landing: null,
    home: null,
    hashtag: 'diadamulher',
  }),
  defineEvent({
    id: 'dia-do-consumidor',
    palette: 'consumidor',
    icon: 'shield-check',
    window: (y) => ({ start: dayNumber(y, 3, 9), end: dayNumber(y, 3, 15) }),
    banner: {
      badge: 'Dia do Consumidor',
      badgeShort: 'Dia do Consumidor',
      headline: () => 'Dia 15/03: compare antes de comprar.',
      sub: 'O preço de hoje contra o histórico, sem desconto de fachada.',
      cta: 'Ver quedas de preço',
      to: '/quedas-de-preco/',
    },
    tag: { lead: 'Dia do', accent: 'Consumidor' },
    landing: 'quedas-de-preco',
    home: {
      title: 'Dia do Consumidor',
      hint: 'O preço de hoje contra o histórico.',
    },
    hashtag: 'diadoconsumidor',
  }),
  defineEvent({
    id: 'pascoa',
    palette: 'pascoa',
    icon: 'gift',
    // Só banner: o catálogo não tem chocolate. Começa 2 semanas antes, sem
    // atropelar o Dia do Consumidor (até 15/03).
    window: (y) => {
      const { month, day } = easterSunday(y)
      const easter = dayNumber(y, month, day)
      return { start: Math.max(easter - 14, dayNumber(y, 3, 16)), end: easter }
    },
    banner: {
      badge: 'Páscoa',
      headline: (y) => {
        const { month, day } = easterSunday(y)
        return `Páscoa dia ${pad(day)}/${pad(month)}: compare antes de comprar.`
      },
      sub: 'Kits, café e presentes com preço monitorado.',
      cta: 'Ver quedas de preço',
      to: '/quedas-de-preco/',
    },
    tag: null,
    landing: null,
    home: null,
    hashtag: 'pascoa',
  }),
  defineEvent({
    id: 'dia-das-maes',
    palette: 'maes',
    icon: 'heart',
    window: (y) => ({ start: dayNumber(y, 5, mothersDay(y) - 20), end: dayNumber(y, 5, mothersDay(y)) }),
    banner: {
      badge: 'Dia das Mães',
      headline: (y) => `Dia ${pad(mothersDay(y))}/05: não compre o presente antes de comparar.`,
      sub: 'Joias, beleza e casa com queda de preço confirmada.',
      cta: 'Ver presentes',
      to: '/dia-das-maes/',
    },
    tag: { lead: 'Dia das', accent: 'Mães' },
    landing: 'dia-das-maes',
    home: {
      title: 'Dia das Mães',
      hint: 'Joias, beleza e casa em queda de preço.',
    },
    hashtag: 'diadasmaes',
  }),
  defineEvent({
    id: 'mes-das-noivas',
    palette: 'noivas',
    icon: 'sparkles',
    // Maio inteiro é o mês das noivas, mas as primeiras semanas são do Dia das
    // Mães — assume do dia seguinte até 31/05.
    window: (y) => ({ start: dayNumber(y, 5, mothersDay(y) + 1), end: dayNumber(y, 5, 31) }),
    banner: {
      badge: 'Mês das Noivas',
      headline: () => 'Monte a lista de casamento e compare o preço de cada item.',
      sub: 'Presentes de várias lojas num link só.',
      cta: 'Criar minha lista',
      to: '/lista-de-presentes/',
    },
    tag: { lead: 'Mês das', accent: 'Noivas' },
    landing: 'mes-das-noivas',
    home: {
      title: 'Mês das Noivas',
      hint: 'Casa e joias em queda de preço.',
    },
    hashtag: 'mesdasnoivas',
  }),
  defineEvent({
    id: 'dia-dos-namorados',
    palette: 'namorados',
    icon: 'heart',
    window: (y) => ({ start: dayNumber(y, 6, 1), end: dayNumber(y, 6, 12) }),
    banner: {
      badge: 'Dia dos Namorados',
      badgeShort: 'Namorados',
      headline: () => 'Dia 12/06: não compre o presente antes de comparar.',
      sub: 'Joias e beleza com queda de preço confirmada.',
      cta: 'Ver presentes',
      to: '/dia-dos-namorados/',
    },
    tag: { lead: 'Dia dos', accent: 'Namorados' },
    landing: 'dia-dos-namorados',
    home: {
      title: 'Dia dos Namorados',
      hint: 'Joias e beleza em queda de preço.',
    },
    hashtag: 'diadosnamorados',
  }),
  defineEvent({
    id: 'dia-dos-pais',
    palette: 'pais',
    icon: 'gift',
    window: (y) => ({ start: dayNumber(y, 8, fathersDay(y) - 14), end: dayNumber(y, 8, fathersDay(y)) }),
    banner: {
      badge: 'Dia dos Pais',
      headline: (y) => `Dia ${pad(fathersDay(y))}/08: não compre o presente antes de comparar.`,
      sub: 'Eletrônicos, casa e esporte com queda de preço confirmada.',
      cta: 'Ver presentes',
      to: '/dia-dos-pais/',
    },
    tag: { lead: 'Dia dos', accent: 'Pais' },
    landing: 'dia-dos-pais',
    home: {
      title: 'Dia dos Pais',
      hint: 'Eletrônicos, casa e esporte em queda.',
    },
    hashtag: 'diadospais',
  }),
  defineEvent({
    id: 'dia-das-criancas',
    palette: 'criancas',
    icon: 'party-popper',
    // Só banner: o catálogo de brinquedo é só a Lego, e a janela é curta
    // demais pra uma página nova indexar a tempo.
    window: (y) => ({ start: dayNumber(y, 9, 28), end: dayNumber(y, 10, 12) }),
    banner: {
      badge: 'Dia das Crianças',
      headline: () => 'Dia 12/10: não compre o presente antes de comparar.',
      sub: 'Veja os brinquedos com preço monitorado.',
      cta: 'Ver brinquedos',
      to: '/brinquedos/',
    },
    tag: null,
    landing: null,
    home: null,
    hashtag: 'diadascriancas',
  }),
  defineEvent({
    id: 'black-esquenta',
    palette: 'black',
    icon: 'flame',
    soft: true,
    window: (y) => ({ start: dayNumber(y, 11, 1), end: dayNumber(y, 11, blackFridayDayOfMonth(y) - 5) }),
    banner: {
      badge: 'Esquenta Black Friday',
      badgeShort: 'Esquenta Black',
      headline: (y) => `A Black Friday é dia ${blackFridayDayOfMonth(y)}/11. Não compre antes de comparar.`,
      sub: 'Acompanhe o preço de hoje pra saber quem baixa de verdade.',
      cta: 'Ver quedas reais',
      to: '/black-friday/',
    },
    tag: null,
    landing: 'black-friday',
    home: null,
    hashtag: 'blackfriday',
  }),
  defineEvent({
    id: 'black-friday',
    palette: 'black',
    icon: 'tag',
    // Da segunda-feira da semana da BF até a Cyber Monday (BF + 3 dias)
    window: (y) => ({
      start: dayNumber(y, 11, blackFridayDayOfMonth(y) - 4),
      end: dayNumber(y, 11, blackFridayDayOfMonth(y) + 3),
    }),
    banner: {
      badge: 'Black Friday',
      headline: () => 'Não compre antes de comparar.',
      sub: 'Só queda de preço confirmada no nosso histórico.',
      cta: 'Ver quedas de preço',
      to: '/black-friday/',
    },
    tag: { lead: 'Black', accent: 'Friday' },
    landing: 'black-friday',
    home: {
      title: 'Black Friday',
      hint: 'Só o que ficou mais barato de verdade.',
    },
    hashtag: 'blackfriday',
  }),
  defineEvent({
    id: 'natal',
    palette: 'natal',
    icon: 'gift',
    // 1/12 (ou o dia seguinte à Cyber Monday, se ela cair depois) até 25/12
    window: (y) => ({
      start: Math.max(dayNumber(y, 12, 1), dayNumber(y, 11, blackFridayDayOfMonth(y) + 3) + 1),
      end: dayNumber(y, 12, 25),
    }),
    banner: {
      badge: 'Natal de Ofertas',
      headline: () => 'Não compre o presente antes de comparar.',
      sub: 'Quedas de preço confirmadas todo dia.',
      cta: 'Ver ofertas',
      to: '/natal/',
    },
    tag: { lead: 'Natal de', accent: 'Ofertas' },
    landing: 'natal',
    home: {
      title: 'Natal de Ofertas',
      hint: 'Presentes que baixaram de preço de verdade.',
    },
    hashtag: 'natal',
  }),
]

export type SeasonalThemeId = (typeof SEASONAL_EVENTS)[number]['id']

export function getSeasonalEvent(id: SeasonalThemeId | null) {
  return id ? (SEASONAL_EVENTS.find((e) => e.id === id) ?? null) : null
}

export function resolveSeasonalTheme(now: Date = new Date()): SeasonalThemeId | null {
  const { year, month, day } = brazilDate(now)
  const today = dayNumber(year, month, day)
  for (const event of SEASONAL_EVENTS) {
    const { start, end } = event.window(year)
    if (today >= start && today <= end) return event.id
  }
  return null
}

// Departamentos que a época cobre (null = catálogo todo, ou época sem página)
export function seasonalVerticals(event: { landing: SeasonalLandingId | null } | null): readonly string[] | null {
  return event?.landing ? getSeasonalLanding(event.landing).verticals : null
}

// Dias inteiros (fuso de Brasília) até uma data do ano corrente;
// 0 = hoje, negativo = já passou.
export function daysUntil(month: number, day: number, now: Date = new Date()): number {
  const { year, month: m, day: d } = brazilDate(now)
  return dayNumber(year, month, day) - dayNumber(year, m, d)
}

// ---- Quedas de preço por época ------------------------------------------
// top-price-drops.json (gerado em scripts/generate-home-highlights.mjs) traz
// as maiores quedas do catálogo todo e de cada departamento; cada página/
// seção pega a sua fatia daqui — mesma função no prerender e no cliente, pra
// o HTML estático e a primeira renderização baterem.

const byDropDesc = (a: ProductIndexEntry, b: ProductIndexEntry) =>
  (b.priceDropPercent ?? 0) - (a.priceDropPercent ?? 0) ||
  a.merchantSlug.localeCompare(b.merchantSlug) ||
  a.slug.localeCompare(b.slug)

export function selectDrops(
  file: SeasonalDropsFile,
  verticals: readonly string[] | null,
  max: number
): SeasonalDropsSlice {
  const meta = { generatedAt: file.generatedAt, minDropPercent: file.minDropPercent }
  if (!verticals) return { ...meta, total: file.all.total, items: file.all.items.slice(0, max) }
  const groups = verticals.map((v) => file.byVertical[v]).filter((g) => g != null)
  return {
    ...meta,
    total: groups.reduce((sum, g) => sum + g.total, 0),
    items: groups.flatMap((g) => g.items).sort(byDropDesc).slice(0, max),
  }
}

export const LANDING_MAX_ITEMS = 48
export const HOME_SECTION_MAX_ITEMS = 12
// Menos que isso e a seção da home nem aparece (um carrossel de 2 cards
// parece vazio, não campanha).
export const HOME_SECTION_MIN_ITEMS = 4

// ---- Pré-visualização ----------------------------------------------------
// ?tema=<id> força o tema (pra revisar o visual antes das datas); ?tema=off
// desliga; ?tema=auto volta ao automático. Aceita o id do evento
// (dia-das-criancas, black-friday, natal...) e os apelidos curtos abaixo.
// O navegador guarda na aba (sessionStorage); os scripts do build aceitam a
// mesma coisa em SEASONAL_OVERRIDE.
const OVERRIDE_ALIASES: Record<string, SeasonalThemeId> = {
  black: 'black-friday',
  esquenta: 'black-esquenta',
  criancas: 'dia-das-criancas',
  maes: 'dia-das-maes',
  noivas: 'mes-das-noivas',
  namorados: 'dia-dos-namorados',
  pais: 'dia-dos-pais',
  consumidor: 'dia-do-consumidor',
  aulas: 'volta-as-aulas',
  mulher: 'dia-da-mulher',
}

// undefined = valor inválido; null = "sem tema"
export function parseSeasonalOverride(value: string): SeasonalThemeId | null | undefined {
  if (value === 'off') return null
  const id = OVERRIDE_ALIASES[value] ?? value
  return SEASONAL_EVENTS.some((e) => e.id === id) ? (id as SeasonalThemeId) : undefined
}
