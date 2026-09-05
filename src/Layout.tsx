import { Outlet, useLocation, useMatch } from 'react-router-dom'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { ComparatorTray } from './components/ComparatorTray'
import { TopBar } from './components/TopBar'
import { CouponWheelButton } from './components/CouponWheel'
import { ScrollToTop } from './components/ScrollToTop'
import { ComparatorProvider } from './context/ComparatorContext'
import { FavoritesProvider } from './context/FavoritesContext'

export function Layout() {
  // Nas telas de lista de presentes o FAB da roleta de cupons compete
  // visualmente com o tema (presente) — esconde nessas rotas.
  const { pathname } = useLocation()
  // Esconde o FAB da roleta de cupons nas telas de lista de presentes e no
  // walkthrough (competem com o tema). Na barra fixa de "avise-me quando baixar
  // de preço" o próprio componente esconde o FAB via classe no body enquanto
  // estiver visível (some a barra, o FAB volta) — ver PriceDropWatchForm.
  const onRegistry = pathname.startsWith('/lista') || pathname === '/como-funciona'
  // Página de produto tem seu próprio exit-intent (o cupom real daquela
  // loja, em ProductExitIntentCoupon) — suprime o da roleta sitewide aqui
  // pra não empilhar os dois popups na mesma saída (ver CouponWheel.tsx).
  const onProductPage = Boolean(useMatch(':merchant/:slug'))

  return (
    <ComparatorProvider>
      <FavoritesProvider>
        <ScrollToTop />
        <TopBar />
        <Header />
        <main>
          <Outlet />
        </main>
        <Footer />
        <ComparatorTray />
        {!onRegistry && <CouponWheelButton suppressExitIntent={onProductPage} />}
      </FavoritesProvider>
    </ComparatorProvider>
  )
}
