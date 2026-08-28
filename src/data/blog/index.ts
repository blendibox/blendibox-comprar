import type { BlogPost } from '../../types/blog'
import { listaDePresentesOnlineGratis } from './lista-de-presentes-online-gratis'
import { comoDizerOQueQueroDePresente } from './como-dizer-o-que-quero-de-presente'
import { listaDeCasamentoOnline } from './lista-de-casamento-online'
import { comparativoSitesListaDeCasamento } from './comparativo-sites-lista-de-casamento'
import { listaDePresentesDeBodas } from './lista-de-presentes-de-bodas'
import { listaDePresentesDeNatal } from './lista-de-presentes-de-natal'
import { blackFridayListaDeCasamento } from './black-friday-lista-de-casamento'
import { listaDeAmigoSecreto } from './lista-de-amigo-secreto'
import { ideiasDePresenteDeNatal } from './ideias-de-presente-de-natal'
import { presenteDiaDasCriancas } from './presente-dia-das-criancas'
import { presenteDiaDasMaes } from './presente-dia-das-maes'
import { presenteDiaDosNamorados } from './presente-dia-dos-namorados'
import { quandoEABlackFriday } from './quando-e-a-black-friday'
import { kitDePresente } from './kit-de-presente'
import { listaDeChaDeBebe } from './lista-de-cha-de-bebe'
import { oQuePedirNoChaRevelacao } from './o-que-pedir-no-cha-revelacao'
import { melhoresPresentesParaRecemNascido } from './melhores-presentes-para-recem-nascido'
import { quantoCustaMontarUmEnxovalDeBebe } from './quanto-custa-montar-um-enxoval-de-bebe'
import { codigoParceiroBling } from './codigo-parceiro-bling'
import { livrosMaisVendidosNaAmazon } from './livros-mais-vendidos-na-amazon'
import { beneficiosDeAssinarSamsClub } from './beneficios-de-assinar-sams-club'
import { allugatorAssinaturaDeEletronicos } from './allugator-assinatura-de-eletronicos'
import { brazilcoreModaCopaDoMundo2026 } from './brazilcore-moda-copa-do-mundo-2026'
import { oQueVestirParaVotarEleicoes2026 } from './o-que-vestir-para-votar-eleicoes-2026'

// Cada artigo mora no próprio arquivo (facilita adicionar/revisar um por vez).
// Lista central agregada aqui, ordenada do mais recente pro mais antigo.
export const blogPosts: BlogPost[] = [
  listaDePresentesOnlineGratis,
  comoDizerOQueQueroDePresente,
  listaDeCasamentoOnline,
  comparativoSitesListaDeCasamento,
  listaDePresentesDeBodas,
  listaDePresentesDeNatal,
  blackFridayListaDeCasamento,
  listaDeAmigoSecreto,
  ideiasDePresenteDeNatal,
  presenteDiaDasCriancas,
  presenteDiaDasMaes,
  presenteDiaDosNamorados,
  quandoEABlackFriday,
  kitDePresente,
  listaDeChaDeBebe,
  oQuePedirNoChaRevelacao,
  melhoresPresentesParaRecemNascido,
  quantoCustaMontarUmEnxovalDeBebe,
  codigoParceiroBling,
  livrosMaisVendidosNaAmazon,
  beneficiosDeAssinarSamsClub,
  allugatorAssinaturaDeEletronicos,
  brazilcoreModaCopaDoMundo2026,
  oQueVestirParaVotarEleicoes2026,
].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug)
}

// Posts relacionados: usa relatedSlugs quando existem (link interno
// intencional), completa com os mais recentes se faltar — nunca quebra
// quando um artigo referenciado ainda não foi publicado.
export function getRelatedPosts(post: BlogPost, limit = 3): BlogPost[] {
  const related = (post.relatedSlugs ?? [])
    .map((slug) => blogPosts.find((p) => p.slug === slug))
    .filter((p): p is BlogPost => !!p)
  if (related.length >= limit) return related.slice(0, limit)
  const fallback = blogPosts.filter((p) => p.slug !== post.slug && !related.includes(p))
  return [...related, ...fallback].slice(0, limit)
}
