import { Outlet, useLocation } from 'react-router-dom'
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
        {!onRegistry && <CouponWheelButton />}
      </FavoritesProvider>
    </ComparatorProvider>
  )
}
