import { Link } from 'react-router-dom'
import { NewsletterSignup } from './NewsletterSignup'
import { BlendiboxCarousel } from './BlendiboxCarousel'

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__grid">
        <div className="footer__brand">
          <div className="footer__brand-title">Compare Ofertas ✱</div>
          <p>
            Compare preços de milhares de produtos de marcas famosas em um só lugar.
          </p>
        </div>
        <div>
          <h3>Navegação</h3>
          <Link to="/">Início</Link>
          <Link to="/cupons">Cupons</Link>
          <Link to="/comparar">Comparar</Link>
        </div>
        <div>
          <h3>Institucional</h3>
          <Link to="/sobre">Sobre nós</Link>
          <Link to="/termos">Termos de Uso</Link>
          <Link to="/privacidade">Privacidade</Link>
        </div>
        <NewsletterSignup />
      </div>
      <BlendiboxCarousel />
      <div className="footer__copy">{`© ${new Date().getFullYear()} Blendibox. Todos os direitos reservados.`}</div>
    </footer>
  )
}
