import { useEffect, useState } from 'react'
import { Link } from './Link'
import { Clock, Heart, Info, Link2, Play, RefreshCw, Send, ShieldCheck, Tag, TrendingDown, TrendingUp } from './Icon'
import { fetchHomeHighlights, fetchMerchants, fetchMeta } from '../lib/api'
import { timeAgo } from '../lib/timeAgo'
import { NewsletterSignup } from './NewsletterSignup'
import { BlendiboxCarousel } from './BlendiboxCarousel'
import { TELEGRAM_URL, YOUTUBE_URL } from '../config/site'

const SAFE_BROWSING_URL =
  'https://transparencyreport.google.com/safe-browsing/search?url=comprar.blendibox.com.br'

const BENEFITS = [
  { Icon: RefreshCw, title: 'Atualizado diariamente', text: 'Preços monitorados todo dia' },
  { Icon: Tag, title: 'Cupons oficiais', text: 'Direto das lojas parceiras' },
  { Icon: TrendingDown, title: 'Histórico de preço', text: 'Veja se a oferta é boa de verdade' },
  { Icon: Link2, title: 'Compra na loja oficial', text: 'Você vai direto pro site do parceiro' },
]

export function Footer() {
  // Stats reais do sistema — só dado que a gente realmente tem (nada de
  // "847 ofertas em destaque" inventado). Buscados uma vez e mantidos no
  // Footer (que persiste entre navegações no SPA); arquivos pequenos, já
  // cacheados quando a home carrega.
  const [totalProducts, setTotalProducts] = useState<number | null>(null)
  const [priceDropsCount, setPriceDropsCount] = useState<number | null>(null)
  const [merchantsCount, setMerchantsCount] = useState<number | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    fetchMeta()
      .then((m) => {
        setTotalProducts(m.totalProducts)
        setGeneratedAt(m.generatedAt ?? null)
      })
      .catch(() => {})
    fetchMerchants().then((m) => setMerchantsCount(m.length)).catch(() => {})
    fetchHomeHighlights().then((h) => setPriceDropsCount(h.priceDropsCount ?? null)).catch(() => {})
  }, [])

  // Mantém o "há X" vivo sem recarregar a página.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  return (
    <>
      <div className="footer-benefits">
        {BENEFITS.map(({ Icon, title, text }) => (
          <div key={title} className="footer-benefits__item">
            <Icon className="footer-benefits__icon" size={22} strokeWidth={2} aria-hidden="true" />
            <div>
              <strong>{title}</strong>
              <span className="footer-benefits__text">{text}</span>
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
                  <TrendingUp className="footer__stat-arrow footer__stat-arrow--up" size={16} aria-hidden="true" />
                  <span>
                    <strong>{totalProducts.toLocaleString('pt-BR')}</strong> produtos monitorados
                  </span>
                </li>
              )}
              {priceDropsCount != null && priceDropsCount > 0 && (
                <li>
                  <TrendingDown className="footer__stat-arrow footer__stat-arrow--down" size={16} aria-hidden="true" />
                  <span>
                    <strong>{priceDropsCount.toLocaleString('pt-BR')}</strong> preços em queda
                  </span>
                </li>
              )}
              {merchantsCount != null && merchantsCount > 0 && (
                <li>
                  <TrendingUp className="footer__stat-arrow footer__stat-arrow--up" size={16} aria-hidden="true" />
                  <span>
                    <strong>{merchantsCount.toLocaleString('pt-BR')}</strong> lojas parceiras
                  </span>
                </li>
              )}
              <li>
                <Clock className="footer__stat-arrow footer__stat-arrow--sync" size={16} aria-hidden="true" />
                {generatedAt ? (
                  <span
                    title={`Última atualização: ${new Date(generatedAt).toLocaleString('pt-BR')} · atualizamos diariamente`}
                  >
                    Atualizado {timeAgo(generatedAt, now)}
                  </span>
                ) : (
                  <span>Atualizado diariamente</span>
                )}
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
            <Link to="/como-funciona">Como funciona</Link>
            <Link to="/perguntas-frequentes">Perguntas frequentes</Link>
            <Link to="/termos">Termos de Uso</Link>
            <Link to="/privacidade">Privacidade</Link>
          </div>
          <div>
            <h3>Siga a gente</h3>
            <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="footer__social-link">
              <Send size={16} aria-hidden="true" /> Telegram — ofertas em tempo real
            </a>
            <a href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer" className="footer__social-link">
              <Play size={16} aria-hidden="true" /> YouTube — vídeo diário
            </a>
          </div>
          <NewsletterSignup />
        </div>

        <BlendiboxCarousel />

        <div className="footer__bottom">
          <span className="footer__copy">
            {`© ${new Date().getFullYear()} Blendibox. Todos os direitos reservados.`}
          </span>
          <div className="footer__security">
            <ShieldCheck className="footer__security-shield" size={18} aria-hidden="true" />
            <span className="footer__security-text">
              <strong>Navegação segura</strong>
              <span className="footer__security-sep">·</span>
              compra direto na loja parceira
            </span>
            <a
              className="footer__security-info"
              href={SAFE_BROWSING_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="Site verificado no Google Safe Browsing — ver relatório"
              aria-label="Ver verificação no Google Safe Browsing"
            >
              <Info size={14} aria-hidden="true" />
            </a>
          </div>
          <span className="footer__made">
            {'Desenvolvido com '}
            <Heart size={13} fill="currentColor" className="footer__heart" aria-label="amor" />
            {' no Brasil '}
            <span aria-label="Brasil">🇧🇷</span>
          </span>
        </div>
      </footer>
    </>
  )
}
