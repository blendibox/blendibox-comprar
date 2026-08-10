import { Route, Routes } from 'react-router-dom'
import { Layout } from './Layout'
import { ListingPage } from './pages/ListingPage'
import { HubPage } from './pages/HubPage'
import { CategoryPage } from './pages/CategoryPage'
import { ProductPage } from './pages/ProductPage'
import { ComparePage } from './pages/ComparePage'
import { FavoritesPage } from './pages/FavoritesPage'
import { CouponsPage } from './pages/CouponsPage'
import { CouponsMerchantPage } from './pages/CouponsMerchantPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { TermsPage } from './pages/TermsPage'
import { AboutPage } from './pages/AboutPage'
import { FaqPage } from './pages/FaqPage'
import { RegistryLandingPage } from './pages/RegistryLandingPage'
import { CreateRegistryPage } from './pages/CreateRegistryPage'
import { RegistryPublicPage } from './pages/RegistryPublicPage'
import { RegistryManagePage } from './pages/RegistryManagePage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ListingPage />} />
        <Route path="comparar" element={<ComparePage />} />
        <Route path="favoritos" element={<FavoritesPage />} />
        <Route path="cupons" element={<CouponsPage />} />
        <Route path="cupons/:loja" element={<CouponsMerchantPage />} />
        <Route path="sobre" element={<AboutPage />} />
        <Route path="perguntas-frequentes" element={<FaqPage />} />
        <Route path="termos" element={<TermsPage />} />
        <Route path="privacidade" element={<PrivacyPage />} />
        <Route path="lista-de-presentes" element={<RegistryLandingPage />} />
        <Route path="listas/nova" element={<CreateRegistryPage />} />
        <Route path="lista/:id" element={<RegistryPublicPage />} />
        <Route path="lista/:id/editar" element={<RegistryManagePage />} />
        <Route path=":vertical/categoria/:categorySlug" element={<CategoryPage />} />
        <Route path=":slug" element={<HubPage />} />
        <Route path=":merchant/:slug" element={<ProductPage />} />
      </Route>
    </Routes>
  )
}
