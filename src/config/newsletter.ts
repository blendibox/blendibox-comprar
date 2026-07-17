export const NEWSLETTER_WORKER_URL = 'https://blendibox-newsletter.blendibox.workers.dev'
export const NEWSLETTER_CONFIGURED = true

// Compartilhada entre NewsletterSignup (rodapé) e TopBar — assinar em
// qualquer um dos dois marca o mesmo flag, pra não pedir de novo no outro.
export const NEWSLETTER_SUBSCRIBED_KEY = 'compare-ofertas:newsletter-subscribed'
