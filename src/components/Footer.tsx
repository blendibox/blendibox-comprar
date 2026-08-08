import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchHomeHighlights, fetchMerchants, fetchMeta } from '../lib/api'
import { NewsletterSignup } from './NewsletterSignup'
import { BlendiboxCarousel } from './BlendiboxCarousel'

const SAFE_BROWSING_URL =
  'https://transparencyreport.google.com/safe-browsing/search?url=comprar.blendibox.com.br'

const BENEFITS = [
  { icon: '🔄', title: 'Atualizado diariamente', text: 'Preços monitorados todo dia' },
  { icon: '🏷️', title: 'Cupons oficiais', text: 'Direto das lojas parceiras' },
  { icon: '📉', title: 'Histórico de preço', text: 'Veja se a oferta é boa de verdade' },
  { icon: '🔗', title: 'Compra na loja oficial', text: 'Você vai direto pro site do parceiro' },
]

export function Footer() {
  // Stats reais do sistema — só dado que a gente realmente tem (nada de
  // "847 ofertas em destaque" inventado). Buscados uma vez e mantidos no
  // Footer (que persiste entre navegações no SPA); arquivos pequenos, já
  // cacheados quando a home carrega.
  const [totalProducts, setTotalProducts] = useState<number | null>(null)
  const [priceDropsCount, setPriceDropsCount] = useState<number | null>(null)
  const [merchantsCount, setMerchantsCount] = useState<number | null>(null)

  useEffect(() => {
    fetchMeta().then((m) => setTotalProducts(m.totalProducts)).catch(() => {})
    fetchMerchants().then((m) => setMerchantsCount(m.length)).catch(() => {})
    fetchHomeHighlights().then((h) => setPriceDropsCount(h.priceDropsCount ?? null)).catch(() => {})
  }, [])

  return (
    <>
      <div className="footer-benefits">
        {BENEFITS.map((b) => (
          <div key={b.title} className="footer-benefits__item">
            <span className="footer-benefits__icon" aria-hidden="true">
              {b.icon}
            </span>
            <div>
              <strong>{b.title}</strong>
              <span className="footer-benefits__text">{b.text}</span>
            </div>
          </div>
        ))}
      </div>

      <footer className="footer">
        <div className="footer__grid">
          <div className="footer__brand">
            <div className="footer__brand-title">Compare Ofertas ✱</div>
            <p>Compare preços de milhares de produtos de marcas famosas em um só lugar.</p>
            <ul className="footer__stats">
              {totalProducts != null && (
                <li>
                  <span className="footer__stat-arrow footer__stat-arrow--up" aria-hidden="true">↑</span>
                  <span>
                    <strong>{totalProducts.toLocaleString('pt-BR')}</strong> produtos monitorados
                  </span>
                </li>
              )}
              {priceDropsCount != null && priceDropsCount > 0 && (
                <li>
                  <span className="footer__stat-arrow footer__stat-arrow--down" aria-hidden="true">↓</span>
                  <span>
                    <strong>{priceDropsCount.toLocaleString('pt-BR')}</strong> preços caíram esta semana
                  </span>
                </li>
              )}
              {merchantsCount != null && merchantsCount > 0 && (
                <li>
                  <span className="footer__stat-arrow footer__stat-arrow--up" aria-hidden="true">↑</span>
                  <span>
                    <strong>{merchantsCount.toLocaleString('pt-BR')}</strong> lojas parceiras
                  </span>
                </li>
              )}
              <li>
                <span className="footer__stat-arrow footer__stat-arrow--sync" aria-hidden="true">🔄</span>
                <span>Atualizado diariamente</span>
              </li>
            </ul>
          </div>
          <div>
            <h3>Navegação</h3>
            <Link to="/">Início</Link>
            <Link to="/cupons">Cupons</Link>
            <Link to="/favoritos">Favoritos</Link>
            <Link to="/comparar">Comparar</Link>
          </div>
          <div>
            <h3>Institucional</h3>
            <Link to="/sobre">Sobre nós</Link>
            <Link to="/perguntas-frequentes">Perguntas frequentes</Link>
            <Link to="/termos">Termos de Uso</Link>
            <Link to="/privacidade">Privacidade</Link>
          </div>
          <NewsletterSignup />
        </div>

        <BlendiboxCarousel />

        <div className="footer__bottom">
          <span className="footer__copy">
            {`© ${new Date().getFullYear()} Blendibox. Todos os direitos reservados.`}
          </span>
          <a
            className="footer__security"
            href={SAFE_BROWSING_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            🔒 Conexão segura · verificado no Google Safe Browsing
          </a>
          <span className="footer__made">
            {'Desenvolvido com '}
            <span aria-label="amor">❤️</span>
            {' no Brasil '}
            <span aria-label="Brasil">🇧🇷</span>
          </span>
        </div>
      </footer>
    </>
  )
}
