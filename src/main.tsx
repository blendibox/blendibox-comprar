import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './router'
import './index.css'

const rootEl = document.getElementById('root')!
const app = (
  <StrictMode>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </StrictMode>
)

// Páginas geradas pelo scripts/prerender.mjs já vêm com o HTML e os dados
// iniciais embutidos (window.__INITIAL_DATA__) — nesse caso hidratamos em vez
// de recriar do zero, senão a página piscaria em branco antes do JS rodar.
if (rootEl.hasChildNodes()) {
  hydrateRoot(rootEl, app)
} else {
  createRoot(rootEl).render(app)
}
