// Cloudflare Worker — a ponte segura entre o formulário estático do site e a
// API do Resend. A chave da API do Resend é secreta (não pode aparecer no
// JS do navegador), então esse Worker guarda a chave como secret e é o único
// lugar que fala com o Resend. Deploy com `wrangler deploy` (veja README).
//
// Variáveis de ambiente necessárias (configuradas via `wrangler secret put`):
//   RESEND_API_KEY     — chave secreta da API do Resend
//   RESEND_AUDIENCE_ID — ID da audience criada no painel do Resend (Audiences)
//   ALLOWED_ORIGIN     — origem permitida pro CORS, ex: https://comprar.blendibox.com.br

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export default {
  async fetch(request, env) {
    const headers = corsHeaders(env)

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers })
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método não permitido' }), {
        status: 405,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return new Response(JSON.stringify({ error: 'JSON inválido' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    const email = String(body.email || '').trim().toLowerCase()
    if (!EMAIL_REGEX.test(email)) {
      return new Response(JSON.stringify({ error: 'E-mail inválido' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    const resendResponse = await fetch(
      `https://api.resend.com/audiences/${env.RESEND_AUDIENCE_ID}/contacts`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, unsubscribed: false }),
      }
    )

    if (!resendResponse.ok) {
      const errText = await resendResponse.text()
      return new Response(JSON.stringify({ error: 'Falha ao cadastrar', detail: errText }), {
        status: 502,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    // Dispara o evento que aciona a automação de boas-vindas configurada no
    // painel do Resend (Automations). Best-effort: se isso falhar, o cadastro
    // em si já foi feito com sucesso, então não bloqueia a resposta ao usuário.
    try {
      await fetch('https://api.resend.com/events/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ event: 'newsletter.subscribed', email }),
      })
    } catch {
      // ignora — cadastro já confirmado, evento é best-effort
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  },
}
