// Busca mais tolerante do que um simples .includes(): ignora acento (digitar
// "tenis" acha "tênis" e vice-versa) e trata a busca como uma lista de
// palavras que precisam aparecer em algum lugar do produto, não
// necessariamente em sequência — "tenis feminino" acha "Tênis Rosa Feminino"
// mesmo com "Rosa" no meio e a ordem das palavras invertida.
// Faixa Unicode das marcas diacríticas combinantes (acentos separados do
// caractere-base depois de .normalize('NFD')) — construída via charCode em
// vez de um literal de regex, pra não arriscar os caracteres de verdade
// serem salvos no arquivo-fonte em vez do escape.
const COMBINING_DIACRITICS = new RegExp(`[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`, 'g')

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS, '')
    .toLowerCase()
}

export function matchesSearch(haystacks: (string | null | undefined)[], term: string): boolean {
  const words = normalizeSearchText(term).trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const combined = normalizeSearchText(haystacks.filter(Boolean).join(' '))
  return words.every((word) => combined.includes(word))
}
