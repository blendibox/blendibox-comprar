import { useEffect, useRef } from 'react'

// Detecta o mouse saindo por cima da janela (relatedTarget nulo + clientY <=
// 0 — rumo à barra de abas/endereço), o sinal clássico de "a pessoa está
// indo embora". Só existe com mouse, então nunca dispara em touch/mobile —
// evita de graça o "interstitial intrusivo" que o Google penaliza no
// ranqueamento mobile (que só se aplica a popup ao carregar a página; este
// nunca abre sozinho nesse momento, só quando a pessoa já está saindo).
//
// onTrigger vem de uma ref (não da closure direta) pra não precisar recriar
// o listener a cada render só porque a função mudou de identidade.
export function useExitIntent(onTrigger: () => void, { enabled, armDelayMs = 4000 }: { enabled: boolean; armDelayMs?: number }) {
  const onTriggerRef = useRef(onTrigger)
  onTriggerRef.current = onTrigger

  useEffect(() => {
    if (!enabled) return

    let armed = false
    const armTimer = window.setTimeout(() => {
      armed = true
    }, armDelayMs)

    function handleMouseOut(e: MouseEvent) {
      if (!armed || e.relatedTarget || e.clientY > 0) return
      onTriggerRef.current()
    }

    document.addEventListener('mouseout', handleMouseOut)
    return () => {
      window.clearTimeout(armTimer)
      document.removeEventListener('mouseout', handleMouseOut)
    }
  }, [enabled, armDelayMs])
}
