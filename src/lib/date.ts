// Datas de cupom vêm do feed da Awin no formato brasileiro "DD/MM/YYYY HH:mm:ss"
// — Date() nativo do JS tentaria interpretar como MM/DD e erraria.
export function parseBrDate(value: string | null | undefined): Date | null {
  const m = String(value ?? '').match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/)
  if (!m) return null
  const [, day, month, year, hour = '0', minute = '0', second = '0'] = m
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second))
}

export function formatBrDate(value: string | null | undefined): string | null {
  const date = parseBrDate(value)
  return date ? date.toLocaleDateString('pt-BR') : null
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
