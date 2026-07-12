// Cloudflare Worker — a ponte segura entre o formulário estático do site e a
// API do Resend. A chave da API do Resend é secreta (não pode aparecer no
// JS do navegador), então esse Worker guarda a chave como secret e é o único
// lugar que fala com o Resend. Deploy com `wrangler deploy` (veja README).
//
// Variáveis de ambiente necessárias (configuradas via `wrangler secret put`):
//   RESEND_API_KEY     — chave secreta da API do Resend
//   RESEND_AUDIENCE_ID — ID da audience criada no painel do Resend (Audiences)
//   ALLOWED_ORIGIN     — origem permitida pro CORS, ex: https://comprar.blendibox.com.br
//
// Variáveis não-secretas (em wrangler.toml, [vars]):
//   RESEND_SEGMENT_ID  — segment da audience alvo do resumo semanal
//   DIGEST_FROM_EMAIL  — remetente do resumo semanal, ex: "Compare Ofertas <ofertas@blendibox.com.br>"
//   SITE_URL           — origem do site publicado, usada pra buscar o digest.json
//
// Além do handler HTTP (`fetch`, chamado pelo formulário de newsletter), esse
// Worker tem um handler `scheduled` (Cron Trigger, ver [triggers] em
// wrangler.toml) que roda semanalmente e dispara o "resumo semanal de
// ofertas" via Resend Broadcast API, usando o public/data/digest.json gerado
// no build (scripts/generate-digest.mjs) — pequeno de propósito, o
// index.json completo tem dezenas de MB e não daria pra buscar num Worker.

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
    // DEBUG TEMPORÁRIO: captura status/corpo da chamada pra diagnosticar por
    // que a automação não estava disparando — remover depois de confirmado.
    let eventDebug
    try {
      const eventRes = await fetch('https://api.resend.com/events/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ event: 'subscriber', email }),
      })
      eventDebug = { status: eventRes.status, body: await eventRes.text() }
    } catch (err) {
      eventDebug = { error: String(err) }
    }

    return new Response(JSON.stringify({ ok: true, eventDebug }), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(sendWeeklyDigest(env))
  },
}

function formatPrice(value, currency) {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency || 'BRL' }).format(value)
  } catch {
    return `${value} ${currency}`
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function buildDigestHtml(digest) {
  const itemsHtml = digest.items
    .map(
      (item) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
            <a href="${item.url}" style="text-decoration:none;color:inherit;display:flex;gap:12px;align-items:center;">
              <img src="${item.image}" width="72" height="72" style="border-radius:8px;background:#fafafa;object-fit:contain;" alt="${escapeHtml(item.productName)}" />
              <span>
                <span style="display:block;font-size:11px;color:#888;text-transform:uppercase;">${escapeHtml(item.merchantDisplayName)}</span>
                <span style="display:block;font-size:14px;color:#111;margin:2px 0;">${escapeHtml(item.productName)}</span>
                <span style="display:block;font-size:16px;font-weight:700;color:#0a7d3f;">${formatPrice(item.price, item.currency)}</span>
              </span>
            </a>
          </td>
        </tr>`
    )
    .join('')

  const couponsHtml = digest.coupons.length
    ? `
      <h3 style="margin:24px 0 8px;font-size:15px;">Cupons ativos</h3>
      ${digest.coupons
        .map(
          (c) => `
        <p style="margin:0 0 8px;font-size:13px;color:#444;">
          <strong>${escapeHtml(c.advertiser)}:</strong> ${escapeHtml(c.title)}
          — código <code style="background:#fdf2f8;color:#db2777;padding:2px 8px;border-radius:4px;">${escapeHtml(c.code)}</code>
        </p>`
        )
        .join('')}`
    : ''

  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
      <h2 style="color:#0f172a;">Ofertas da semana no Compare Ofertas</h2>
      <table style="width:100%;border-collapse:collapse;">${itemsHtml}</table>
      ${couponsHtml}
      <p style="margin-top:24px;font-size:12px;color:#888;">
        Você recebeu esse e-mail porque assinou a newsletter do Compare Ofertas.
        {{{RESEND_UNSUBSCRIBE_URL}}}
      </p>
    </div>`
}

async function sendWeeklyDigest(env) {
  const siteUrl = (env.SITE_URL || 'https://comprar.blendibox.com.br').replace(/\/$/, '')
  const digestRes = await fetch(`${siteUrl}/data/digest.json`)
  if (!digestRes.ok) return
  const digest = await digestRes.json()
  if (!digest.items?.length) return

  await fetch('https://api.resend.com/broadcasts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      segment_id: env.RESEND_SEGMENT_ID,
      from: env.DIGEST_FROM_EMAIL,
      subject: 'Ofertas da semana no Compare Ofertas',
      name: `Resumo semanal ${new Date().toISOString().slice(0, 10)}`,
      html: buildDigestHtml(digest),
      send: true,
    }),
  })
}
