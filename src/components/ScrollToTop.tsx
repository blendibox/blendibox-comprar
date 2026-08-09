import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// O React Router não reseta a rolagem ao trocar de rota — então, se o
// usuário rolava a listagem e clicava num produto, a página do produto
// abria já lá no meio/rodapé. Este componente sobe ao topo a cada nova
// navegação.
//
// Só age em navegações "novas" (PUSH/REPLACE — clicar num link). Quando é
// POP (botão voltar/avançar), deixa o navegador restaurar a posição anterior
// — assim, ao voltar pra listagem, o usuário cai de volta onde tinha parado.
export function ScrollToTop() {
  const { pathname } = useLocation()
  const navigationType = useNavigationType()

  useEffect(() => {
    if (navigationType !== 'POP') {
      window.scrollTo(0, 0)
    }
  }, [pathname, navigationType])

  return null
}
