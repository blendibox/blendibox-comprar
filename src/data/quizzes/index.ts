import type { Quiz } from '../../types/quiz'
import { oQuePodeENaoPodeNasEleicoes } from './o-que-pode-e-nao-pode-nas-eleicoes'
import { comoFuncionaAListaDePresentes } from './como-funciona-a-lista-de-presentes'
import { comoFuncionaOAvisoDeQuedaDePreco } from './como-funciona-o-aviso-de-queda-de-preco'
import { comoFuncionamOsFavoritos } from './como-funcionam-os-favoritos'
import { blackFridayMitoOuVerdade } from './black-friday-mito-ou-verdade'
import { queTipoDeCompradorDeBlackFridayVoceE } from './que-tipo-de-comprador-de-black-friday-voce-e'

// Mesmo padrão de src/data/blog/index.ts — cada quiz mora no próprio
// arquivo, lista central agregada aqui, mais recente primeiro (na mesma data,
// vale a ordem desta lista). Novo quiz = novo arquivo + uma linha nessa lista.
export const quizzes: Quiz[] = [
  blackFridayMitoOuVerdade,
  queTipoDeCompradorDeBlackFridayVoceE,
  oQuePodeENaoPodeNasEleicoes,
  comoFuncionaAListaDePresentes,
  comoFuncionaOAvisoDeQuedaDePreco,
  comoFuncionamOsFavoritos,
].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : 0))

export function getQuiz(slug: string): Quiz | undefined {
  return quizzes.find((q) => q.slug === slug)
}
