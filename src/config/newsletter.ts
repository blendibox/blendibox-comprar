// Depois de criar a conta na Brevo (https://www.brevo.com), crie um formulário
// de inscrição (Contacts > Forms > Create a form) e copie a URL de "action"
// gerada por eles pra cá — ela é única da sua conta/lista, não dá pra
// adivinhar. O nome do campo de e-mail também vem de lá (geralmente "EMAIL").
export const NEWSLETTER_FORM_ACTION = 'https://SEU-ID.sibforms.com/serve/SEU-FORM-ID'
export const NEWSLETTER_EMAIL_FIELD = 'EMAIL'
export const NEWSLETTER_CONFIGURED = !NEWSLETTER_FORM_ACTION.includes('SEU-ID')
