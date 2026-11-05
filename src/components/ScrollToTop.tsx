import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// O React Router não reseta a rolagem ao trocar de rota — então, se o
// usuário rolava a listagem e clicava num produto, a página do produto
// abria já lá no meio/rodapé. Este componente sobe ao topo a cada nova
// navegação.
//
// Só age em navegações "novas" (PUSH/REPLACE — clicar num link). Quando é
// POP (botão voltar/avançar), deixa o navegador restaurar a posição anterior
// — assim, ao voltar pra listagem, o usuário cai de volta onde tinha parado
// (as listagens com busca completam isso sozinhas, ver useListingScroll).
//
// Só reage a MUDANÇA DE PÁGINA (pathname). A busca e os filtros reescrevem a
// query da URL com replace (useUrlParam) sem trocar de página; se o tipo de
// navegação entrasse nas dependências, a primeira dessas reescritas jogaria a
// pessoa pro topo no meio da digitação.
export function ScrollToTop() {
  const { pathname } = useLocation()
  const navigationType = useNavigationType()
  const navigationTypeRef = useRef(navigationType)
  navigationTypeRef.current = navigationType

  useEffect(() => {
    if (navigationTypeRef.current !== 'POP') {
      window.scrollTo(0, 0)
    }
  }, [pathname])

  return null
}
