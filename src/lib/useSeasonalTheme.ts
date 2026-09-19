import { useEffect, useState } from 'react'
import { parseSeasonalOverride, resolveSeasonalTheme, type SeasonalThemeId } from './seasonalEvents'

// ?tema=<id> força o tema (pra revisar o visual antes das datas), ?tema=off
// desliga, ?tema=auto volta ao automático — ver parseSeasonalOverride. Fica
// guardado na aba (sessionStorage) pra sobreviver à navegação entre páginas.
const OVERRIDE_KEY = 'compare-ofertas:tema'

// undefined = sem override (usa a data); null = forçado a "sem tema".
function readOverride(): SeasonalThemeId | null | undefined {
  let stored: string | null = null
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('tema')
    if (fromUrl) {
      if (fromUrl === 'auto') sessionStorage.removeItem(OVERRIDE_KEY)
      else if (parseSeasonalOverride(fromUrl) !== undefined) sessionStorage.setItem(OVERRIDE_KEY, fromUrl)
    }
    stored = sessionStorage.getItem(OVERRIDE_KEY)
  } catch {
    // sessionStorage indisponível — segue só com a data
  }
  return stored ? parseSeasonalOverride(stored) : undefined
}

// Só resolve DEPOIS de montar (começa null): o HTML pré-renderizado é o mesmo
// pra todo mundo, sem tema — decidir por data no primeiro render faria o
// cliente divergir do servidor (erro de hidratação #418 já visto no projeto).
// O espaço do banner e da seção da home é reservado por outro caminho (ver
// SeasonalBanner e SeasonalHomeSection).
export function useSeasonalTheme(): SeasonalThemeId | null {
  const [theme, setTheme] = useState<SeasonalThemeId | null>(null)
  useEffect(() => {
    const override = readOverride()
    setTheme(override === undefined ? resolveSeasonalTheme() : override)
  }, [])
  return theme
}
