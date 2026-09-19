import { useEffect, useState } from 'react'
import { Carousel } from './Carousel'
import { Link } from './Link'
import { ProductCard } from './ProductCard'
import { SeasonalIcon } from './SeasonalIcon'
import { fetchTopPriceDrops } from '../lib/api'
import {
  HOME_SECTION_MAX_ITEMS,
  HOME_SECTION_MIN_ITEMS,
  getSeasonalEvent,
  getSeasonalLanding,
  selectDrops,
} from '../lib/seasonalEvents'
import { useSeasonalTheme } from '../lib/useSeasonalTheme'
import type { SeasonalDropsSlice } from '../types/product'

// Seção extra da home nas datas com departamentos (Dia das Mães, Namorados,
// Pais, Mês das Noivas): as quedas confirmadas daqueles departamentos. Nas
// épocas sem filtro (Black Friday, Natal, Dia do Consumidor) não entra seção
// nova — o carrossel "Caiu de preço" já é o mesmo dado, então só ganha título
// da campanha (ver ListingPage).
//
// O <div class="seasonal-home-slot"> sempre existe no HTML (vazio) e a seção
// só entra depois de montar. A altura é reservada antes da pintura por um
// atributo no <html> que o prerender.mjs coloca quando o build cai numa época
// com essa seção e com produto suficiente (html[data-season-home] no CSS).
export function SeasonalHomeSection() {
  const event = getSeasonalEvent(useSeasonalTheme())
  const landing = event?.landing ? getSeasonalLanding(event.landing) : null
  const verticals = landing?.verticals ?? null
  const active = Boolean(event?.home && verticals)
  const [slice, setSlice] = useState<SeasonalDropsSlice | null>(null)

  useEffect(() => {
    if (!active) {
      setSlice(null)
      return
    }
    let cancelled = false
    fetchTopPriceDrops()
      .then((file) => {
        if (!cancelled) setSlice(selectDrops(file, verticals, HOME_SECTION_MAX_ITEMS))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [active, event?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const show = active && event?.home && landing && slice && slice.items.length >= HOME_SECTION_MIN_ITEMS
  return (
    <div className="seasonal-home-slot">
      {show && (
        <section className={`featured-section seasonal-home seasonal-theme--${event.palette}`}>
          <h2 className="section-title">
            <SeasonalIcon name={event.icon} className="section-title__icon" size={22} strokeWidth={2.5} aria-hidden="true" />
            {event.home!.title}
          </h2>
          {/* O link fica na linha da dica (não abaixo do carrossel) pra a seção
              manter a altura de .featured-section reservada no CSS. */}
          <p className="featured-section__hint seasonal-home__hint">
            <span>{event.home!.hint}</span>
            <Link className="seasonal-home__more" to={landing.path}>
              Ver todas →
            </Link>
          </p>
          <Carousel>
            {slice.items.map((product) => (
              <ProductCard key={`seasonal-${product.merchantSlug}-${product.slug}`} product={product} />
            ))}
          </Carousel>
        </section>
      )}
    </div>
  )
}
