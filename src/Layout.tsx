import { Outlet } from 'react-router-dom'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { ComparatorTray } from './components/ComparatorTray'
import { ComparatorProvider } from './context/ComparatorContext'

export function Layout() {
  return (
    <ComparatorProvider>
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
      <ComparatorTray />
    </ComparatorProvider>
  )
}
