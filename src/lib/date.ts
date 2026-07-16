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
export function formatIsoDateBr(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}
