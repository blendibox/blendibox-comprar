import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { HelpCircle } from '../Icon'

// Ícone de interrogação com explicação: no computador abre ao passar o mouse; no
// celular (e no teclado) abre ao tocar/clicar e fica aberto até tocar fora, Esc
// ou tocar de novo. O quadro se posiciona pelo pai com position:relative, pra
// caber na tela do celular.
export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  const [pinned, setPinned] = useState(false)
  const [hovered, setHovered] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const id = useId()
  const open = pinned || hovered

  function close() {
    setPinned(false)
    setHovered(false)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) close()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  return (
    <span
      ref={ref}
      className="info-tip"
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setHovered(false)}
    >
      <button
        type="button"
        className="info-tip__button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => (pinned ? close() : setPinned(true))}
      >
        <HelpCircle size={18} aria-hidden="true" />
      </button>
      {open && (
        <span id={id} className="info-tip__panel" role="note">
          {children}
        </span>
      )}
    </span>
  )
}
