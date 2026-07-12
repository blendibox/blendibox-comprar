import { Link } from 'react-router-dom'
import { NewsletterSignup } from './NewsletterSignup'

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
          <h4>Navegação</h4>
          <Link to="/">Início</Link>
          <Link to="/cupons">Cupons</Link>
          <Link to="/comparar">Comparar</Link>
        </div>
        <div>
          <h4>Institucional</h4>
          <Link to="/sobre">Sobre nós</Link>
          <Link to="/termos">Termos de Uso</Link>
          <Link to="/privacidade">Privacidade</Link>
        </div>
        <NewsletterSignup />
      </div>
      <div className="footer__copy">{`© ${new Date().getFullYear()} Blendibox. Todos os direitos reservados.`}</div>
    </footer>
  )
}
