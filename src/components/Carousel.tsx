import { useEffect, useRef, useState, type ReactNode } from 'react'

// Carrossel manual (sem giro automático): rolagem por toque/swipe funciona
// nativamente via overflow-x, as setas são só um atalho pra desktop/mouse e
// somem sozinhas quando não há mais conteúdo pra rolar naquela direção.
export function Carousel({ children }: { children: ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const updateArrows = () => {
      setCanScrollLeft(track.scrollLeft > 4)
      setCanScrollRight(track.scrollLeft + track.clientWidth < track.scrollWidth - 4)
    }

    updateArrows()
    track.addEventListener('scroll', updateArrows, { passive: true })
    // ResizeObserver pega mudanças de largura do conteúdo (ex: imagens
    // carregando), não só resize da janela.
    const observer = new ResizeObserver(updateArrows)
    observer.observe(track)

    return () => {
      track.removeEventListener('scroll', updateArrows)
      observer.disconnect()
    }
  }, [children])

  const scrollByPage = (direction: 1 | -1) => {
    const track = trackRef.current
    if (!track) return
    track.scrollBy({ left: direction * track.clientWidth * 0.9, behavior: 'smooth' })
  }

  return (
    <div className="carousel">
      <button
        type="button"
        className="carousel__arrow carousel__arrow--left"
        onClick={() => scrollByPage(-1)}
        aria-label="Rolar para a esquerda"
        disabled={!canScrollLeft}
      >
        ‹
      </button>
      <div className="carousel__track" ref={trackRef}>
        {children}
      </div>
      <button
        type="button"
        className="carousel__arrow carousel__arrow--right"
        onClick={() => scrollByPage(1)}
        aria-label="Rolar para a direita"
        disabled={!canScrollRight}
      >
        ›
      </button>
    </div>
  )
}
