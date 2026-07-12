import { Route, Routes } from 'react-router-dom'
import { Layout } from './Layout'
import { ListingPage } from './pages/ListingPage'
import { HubPage } from './pages/HubPage'
import { CategoryPage } from './pages/CategoryPage'
import { ProductPage } from './pages/ProductPage'
import { ComparePage } from './pages/ComparePage'
import { CouponsPage } from './pages/CouponsPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { TermsPage } from './pages/TermsPage'
import { AboutPage } from './pages/AboutPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ListingPage />} />
        <Route path="comparar" element={<ComparePage />} />
        <Route path="cupons" element={<CouponsPage />} />
        <Route path="sobre" element={<AboutPage />} />
        <Route path="termos" element={<TermsPage />} />
        <Route path="privacidade" element={<PrivacyPage />} />
        <Route path=":vertical/categoria/:categorySlug" element={<CategoryPage />} />
        <Route path=":slug" element={<HubPage />} />
        <Route path=":merchant/:slug" element={<ProductPage />} />
      </Route>
    </Routes>
  )
}
