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
  const onRegistry = pathname.startsWith('/lista')

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
