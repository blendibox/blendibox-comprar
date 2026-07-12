import { Link } from 'react-router-dom'
import { NEWSLETTER_CONFIGURED, NEWSLETTER_EMAIL_FIELD, NEWSLETTER_FORM_ACTION } from '../config/newsletter'

export function NewsletterSignup() {
  if (!NEWSLETTER_CONFIGURED) {
    return (
      <div className="newsletter">
        <h4>Newsletter</h4>
        <p className="newsletter__soon">Cadastro de cupons por e-mail em breve.</p>
      </div>
    )
  }

  return (
    <div className="newsletter">
      <h4>Receba cupons por e-mail</h4>
      <form className="newsletter__form" action={NEWSLETTER_FORM_ACTION} method="POST" target="_blank">
        <input
          type="email"
          name={NEWSLETTER_EMAIL_FIELD}
          placeholder="Seu e-mail"
          required
          aria-label="Seu e-mail"
        />
        <label className="newsletter__consent">
          <input type="checkbox" required />
          {' Concordo em receber e-mails com cupons e ofertas, e li e aceito a '}
          <Link to="/privacidade">Política de Privacidade</Link>
          {'.'}
        </label>
        <button type="submit">Cadastrar</button>
      </form>
    </div>
  )
}
