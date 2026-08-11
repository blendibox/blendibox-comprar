// Tempo relativo curto e verídico ("há 3 h", "há 12 min") a partir de um ISO.
// Adaptativo: segundos → minutos → horas → dias. Usado no rodapé e na home
// pra mostrar quando o catálogo/preços foram atualizados pela última vez
// (generatedAt do build) — como o build roda 1x/dia, normalmente cai em horas.
export function timeAgo(iso: string, now: number = Date.now()): string {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000))
  if (s < 60) return `há ${s} s`
  const m = Math.floor(s / 60)
  if (m < 60) return `há ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.floor(h / 24)
  return `há ${d} dia${d > 1 ? 's' : ''}`
}
