import { useEffect, useRef } from 'react'
import { sendPinterestEvent, type PinterestEventName, type PinterestEventParams } from '../lib/pinterest'

// Dispara o evento UMA vez por `key` (normalmente o caminho da página). `key`
// nulo = ainda não é hora (ex: produto carregando). Só roda no navegador —
// efeito não executa no prerender, então o HTML estático não muda.
export function usePinterestEvent(eventName: PinterestEventName, key: string | null, params?: PinterestEventParams) {
  const sentFor = useRef<string | null>(null)
  const latestParams = useRef(params)
  latestParams.current = params

  useEffect(() => {
    if (!key || sentFor.current === key) return
    sentFor.current = key
    sendPinterestEvent(eventName, latestParams.current)
  }, [eventName, key])
}

// Clique em qualquer link de saída pra loja parceira (todos levam
// rel="sponsored") — é o sinal de intenção de compra que o site consegue medir;
// a venda em si acontece na loja. Um ouvinte só, no Layout.
export function usePinterestOutboundClicks() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element) || !target.closest('a[rel~="sponsored"]')) return
      sendPinterestEvent('custom', { contentName: 'clique_loja' })
    }
    // captura: dispara mesmo se algum componente interromper a propagação
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])
}
