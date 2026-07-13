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
