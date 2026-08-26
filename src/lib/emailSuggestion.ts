// Provedores de e-mail mais comuns entre usuários brasileiros — base pra
// sugerir correção quando o domínio digitado é um erro de digitação óbvio
// de um desses (ex: "hotmal.com" → "hotmail.com"). Só cobre erro de
// domínio, nunca a parte antes do @ (essa é livre, não dá pra validar).
const KNOWN_DOMAINS = [
  'gmail.com',
  'hotmail.com',
  'outlook.com',
  'outlook.com.br',
  'yahoo.com.br',
  'yahoo.com',
  'icloud.com',
  'live.com',
  'msn.com',
  'bol.com.br',
  'uol.com.br',
  'terra.com.br',
  'globo.com',
  'ig.com.br',
]

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) dp[i][0] = i
  for (let j = 0; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[a.length][b.length]
}

// Retorna o e-mail corrigido só quando o domínio digitado é um erro de
// digitação pequeno (distância 1 ou 2) de algum provedor conhecido — nunca
// pra domínio já correto (mesmo que fora da lista, ex: empresa própria) nem
// pra algo distante demais pra ser confiável como sugestão.
export function suggestEmailCorrection(email: string): string | null {
  const trimmed = email.trim()
  const at = trimmed.lastIndexOf('@')
  if (at === -1 || at === trimmed.length - 1) return null
  const local = trimmed.slice(0, at)
  const domain = trimmed.slice(at + 1).toLowerCase()
  if (!domain || KNOWN_DOMAINS.includes(domain)) return null

  let best: { domain: string; distance: number } | null = null
  for (const known of KNOWN_DOMAINS) {
    const distance = levenshtein(domain, known)
    if (!best || distance < best.distance) best = { domain: known, distance }
  }
  if (!best || best.distance === 0 || best.distance > 2) return null
  return `${local}@${best.domain}`
}
