// Datas de cupom no coupons.json: "DD/MM/YYYY HH:mm:ss" (ordem brasileira, que o
// Date() do JS leria como MM/DD) em **UTC** — a API da Awin manda "+00:00" e o
// fetch-coupons só reordena os números. Ler como hora local mostrava um dia a mais:
// "01/12/2026 02:59:59" é 30/11 às 23:59 em Brasília (99% dos cupons terminam assim).
export function parseBrDate(value: string | null | undefined): Date | null {
  const m = String(value ?? '').match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/)
  if (!m) return null
  // sem hora: meio-dia UTC, que é o mesmo dia no Brasil
  const [, day, month, year, hour = '12', minute = '0', second = '0'] = m
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)))
}

// Sempre no fuso de Brasília: o mesmo texto no build (que roda em UTC) e em
// qualquer navegador (não quebra a hidratação).
const BR_TIME_ZONE = 'America/Sao_Paulo'

export function formatBrDate(value: string | null | undefined): string | null {
  const date = parseBrDate(value)
  return date ? date.toLocaleDateString('pt-BR', { timeZone: BR_TIME_ZONE }) : null
}

// "30/11 às 23:59" (horário de Brasília)
export function formatBrDateTime(value: string | null | undefined): string | null {
  const date = parseBrDate(value)
  if (!date) return null
  const day = date.toLocaleDateString('pt-BR', { timeZone: BR_TIME_ZONE, day: '2-digit', month: '2-digit' })
  const time = date.toLocaleTimeString('pt-BR', { timeZone: BR_TIME_ZONE, hour: '2-digit', minute: '2-digit' })
  return `${day} às ${time}`
}

// Dias de calendário (em Brasília) entre `now` e o vencimento: 0 = vence hoje.
// null se a data for inválida ou já tiver passado.
export function daysUntilBrDate(value: string | null | undefined, now: Date): number | null {
  const date = parseBrDate(value)
  if (!date || date < now) return null
  const calendarDay = new Intl.DateTimeFormat('en-CA', { timeZone: BR_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
  return Math.round((Date.parse(calendarDay.format(date)) - Date.parse(calendarDay.format(now))) / 86400000)
}

// Formata uma data ISO (ex: lastUpdated do feed) num formato amigável em
// português, sem hora — só interessa o dia da última atualização de preço.
//
// timeZone fixo é essencial aqui: sem ele, toLocaleDateString usa o fuso
// local de quem está rodando o código — e o servidor (build no GitHub
// Actions, UTC) e o navegador do visitante (Brasil, UTC-3) podem cair em
// dias civis diferentes pra um mesmo instante perto da meia-noite UTC. Isso
// faz o HTML gerado no servidor não bater com a primeira renderização do
// cliente, disparando erro de hidratação do React (#418).
export function formatIsoDateBr(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' })
}

// Datas simples "YYYY-MM-DD" sem hora (ex: pontos do histórico de preço,
// scripts/update-price-history.mjs) — reformata direto por string, sem
// passar por Date(), pra não correr risco de fuso horário deslocar o dia
// (mesmo motivo do timeZone fixo acima, mas aqui nem precisa de Date()).
export function formatSimpleDateBr(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

// Epoch UTC de uma data simples "YYYY-MM-DD" (histórico de preço, lastUpdated)
// — usa Date.UTC() em vez de novo Date(iso), que ficaria sujeito ao fuso local
// de quem executa (mesmo cuidado das funções acima), pra sempre dar a mesma
// diferença de dias não importa se roda no build (UTC) ou no navegador.
export function isoDateMs(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

// Mesmo motivo do timeZone fixo acima, só que pra data+hora — sem pinar,
// a HORA renderizada diverge do servidor (UTC) pro cliente (Brasil, UTC-3)
// em toda carga de página, não só perto da meia-noite, já que o offset de
// 3h desloca o horário exibido o tempo inteiro.
export function formatIsoDateTimeBr(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}
