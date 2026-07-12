// Depois de fazer o deploy do Worker (veja worker/README ou o README
// principal), cole aqui a URL gerada pelo `wrangler deploy`
// (algo como https://blendibox-newsletter.SEU-SUBDOMINIO.workers.dev).
export const NEWSLETTER_WORKER_URL = 'https://blendibox-newsletter.SEU-SUBDOMINIO.workers.dev'
export const NEWSLETTER_CONFIGURED = !NEWSLETTER_WORKER_URL.includes('SEU-SUBDOMINIO')
