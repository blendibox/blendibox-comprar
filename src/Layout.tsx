import { Outlet } from 'react-router-dom'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { ComparatorTray } from './components/ComparatorTray'
import { TopBar } from './components/TopBar'
import { CouponWheelButton } from './components/CouponWheel'
import { ComparatorProvider } from './context/ComparatorContext'

export function Layout() {
  return (
    <ComparatorProvider>
      <TopBar />
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
      <ComparatorTray />
      <CouponWheelButton />
    </ComparatorProvider>
  )
}
