// Cloudflare Worker — a ponte segura entre o site estático e a API do
// Resend (+ KV pra acompanhamento de queda de preço). A chave da API do
// Resend é secreta (não pode aparecer no JS do navegador), então esse Worker
// guarda a chave como secret e é o único lugar que fala com o Resend. Deploy
// com `wrangler deploy` (veja README).
//
// Variáveis de ambiente necessárias (configuradas via `wrangler secret put`):
//   RESEND_API_KEY     — chave secreta da API do Resend
//   RESEND_AUDIENCE_ID — ID da audience criada no painel do Resend (Audiences)
//   ALLOWED_ORIGIN     — origem permitida pro CORS, ex: https://comprar.blendibox.com.br
//
// Variáveis não-secretas (em wrangler.toml, [vars]):
//   RESEND_SEGMENT_ID  — segment da audience alvo do resumo semanal
//   DIGEST_FROM_EMAIL  — remetente dos e-mails automáticos, ex: "Compare Ofertas <ofertas@blendibox.com.br>"
//   SITE_URL           — origem do site publicado, usada pra buscar digest.json/price-drops.json
//
// Binding necessário (KV, ver wrangler.toml):
//   PRICE_WATCH — guarda, por produto (`watch:{merchantSlug}/{slug}`), a lista
//   de e-mails que pediram aviso de queda de preço.
//
// Rotas HTTP (`fetch`):
//   POST /          — cadastro na newsletter geral (Resend Audience)
//   POST /watch     — "avise-me quando baixar de preço" (grava em PRICE_WATCH,
//                      opcionalmente também cadastra na newsletter geral)
//
// `scheduled` (Cron Triggers, ver [triggers] em wrangler.toml) tem duas
// rotinas, diferenciadas por `event.cron`:
//   - semanal: dispara o "resumo semanal de ofertas" via Resend Broadcast API
//     usando public/data/digest.json (scripts/generate-digest.mjs).
//   - diária: lê public/data/price-drops.json (scripts/update-price-history.mjs),
//     cruza com PRICE_WATCH e manda um e-mail avulso (não Broadcast, é
//     conteúdo por destinatário) pra cada e-mail que tinha algum produto
//     observado nessa lista. O aviso é único — a entrada é apagada do KV
//     assim que o e-mail é enviado, não fica reavisando todo dia enquanto o
//     preço continuar baixo.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_WATCH_ITEMS = 20
const DAILY_CRON = '0 9 * * *'

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function jsonResponse(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } })
}

// Cadastra o e-mail na Audience geral do Resend (newsletter semanal) e
// dispara o evento de boas-vindas — usado tanto pelo cadastro direto quanto,
// opcionalmente, pelo cadastro de aviso de queda de preço.
async function addToNewsletterAudience(email, env) {
  const resendResponse = await fetch(`https://api.resend.com/audiences/${env.RESEND_AUDIENCE_ID}/contacts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, unsubscribed: false }),
  })
  if (!resendResponse.ok) return { ok: false, detail: await resendResponse.text() }

  // Dispara o evento que aciona a automação de boas-vindas configurada no
  // painel do Resend (Automations → trigger de evento custom "subscriber").
  // Best-effort: se isso falhar, o cadastro em si já foi feito com sucesso.
  try {
    await fetch('https://api.resend.com/events/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'subscriber', email }),
    })
  } catch {
    // ignora — cadastro já confirmado, evento é best-effort
  }
  return { ok: true }
}

async function handleNewsletterSignup(request, env, headers) {
  let body
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'JSON inválido' }, 400, headers)
  }

  const email = String(body.email || '').trim().toLowerCase()
  if (!EMAIL_REGEX.test(email)) return jsonResponse({ error: 'E-mail inválido' }, 400, headers)

  const result = await addToNewsletterAudience(email, env)
  if (!result.ok) return jsonResponse({ error: 'Falha ao cadastrar', detail: result.detail }, 502, headers)

  return jsonResponse({ ok: true }, 200, headers)
}

// "Avise-me quando baixar de preço": grava o e-mail contra cada produto
// informado no KV PRICE_WATCH. O checkbox de newsletter geral é uma
// finalidade separada e opcional (LGPD) — só cadastra na Audience se
// `subscribeNewsletter` vier true, nunca por padrão.
async function handleWatch(request, env, headers) {
  if (!env.PRICE_WATCH) {
    return jsonResponse({ error: 'Aviso de queda de preço não configurado neste Worker' }, 500, headers)
  }

  let body
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'JSON inválido' }, 400, headers)
  }

  const email = String(body.email || '').trim().toLowerCase()
  if (!EMAIL_REGEX.test(email)) return jsonResponse({ error: 'E-mail inválido' }, 400, headers)

  const items = Array.isArray(body.items) ? body.items.slice(0, MAX_WATCH_ITEMS) : []
  const validItems = items.filter(
    (item) => item && typeof item.merchantSlug === 'string' && typeof item.slug === 'string'
  )
  if (!validItems.length) return jsonResponse({ error: 'Nenhum produto pra acompanhar' }, 400, headers)

  for (const item of validItems) {
    const key = `watch:${item.merchantSlug}/${item.slug}`
    const raw = await env.PRICE_WATCH.get(key)
    const watchers = raw ? JSON.parse(raw) : []
    if (!watchers.some((w) => w.email === email)) {
      watchers.push({ email, addedAt: new Date().toISOString() })
      await env.PRICE_WATCH.put(key, JSON.stringify(watchers))
    }
  }

  if (body.subscribeNewsletter) {
    // Best-effort: se a newsletter geral falhar, o aviso de queda (o que a
    // pessoa realmente pediu) já foi gravado e não deve ser desfeito por isso.
    try {
      await addToNewsletterAudience(email, env)
    } catch {
      // ignora
    }
  }

  return jsonResponse({ ok: true }, 200, headers)
}

export default {
  async fetch(request, env) {
    const headers = corsHeaders(env)

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers })
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Método não permitido' }, 405, headers)
    }

    const url = new URL(request.url)
    if (url.pathname === '/watch') return handleWatch(request, env, headers)
    return handleNewsletterSignup(request, env, headers)
  },

  async scheduled(event, env, ctx) {
    if (event.cron === DAILY_CRON) {
      ctx.waitUntil(checkPriceDropsAndNotify(env))
    } else {
      ctx.waitUntil(sendWeeklyDigest(env))
    }
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

// Versão em texto puro do mesmo conteúdo — e-mails só-HTML (sem a parte
// text/plain) são um sinal que filtros de spam penalizam.
function buildDigestText(digest) {
  const lines = ['Ofertas da semana no Compare Ofertas', '']

  for (const item of digest.items) {
    lines.push(`${item.merchantDisplayName} — ${item.productName}`)
    lines.push(`${formatPrice(item.price, item.currency)}`)
    lines.push(item.url)
    lines.push('')
  }

  if (digest.coupons.length) {
    lines.push('Cupons ativos:')
    for (const c of digest.coupons) {
      lines.push(`- ${c.advertiser}: ${c.title} — código ${c.code}`)
    }
    lines.push('')
  }

  lines.push('Você recebeu esse e-mail porque assinou a newsletter do Compare Ofertas.')
  lines.push('{{{RESEND_UNSUBSCRIBE_URL}}}')

  return lines.join('\n')
}

async function sendWeeklyDigest(env) {
  const siteUrl = (env.SITE_URL || 'https://comprar.blendibox.com.br').replace(/\/$/, '')
  const digestRes = await fetch(`${siteUrl}/data/digest.json`)
  if (!digestRes.ok) {
    console.error(`sendWeeklyDigest: falha ao buscar digest.json (HTTP ${digestRes.status})`)
    return
  }
  const digest = await digestRes.json()
  if (!digest.items?.length) {
    console.error('sendWeeklyDigest: digest.json sem items, nada pra enviar')
    return
  }

  const broadcastRes = await fetch('https://api.resend.com/broadcasts', {
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
      text: buildDigestText(digest),
      send: true,
    }),
  })

  const broadcastBody = await broadcastRes.text()
  if (!broadcastRes.ok) {
    console.error(`sendWeeklyDigest: Resend recusou o broadcast (HTTP ${broadcastRes.status}): ${broadcastBody}`)
  } else {
    console.log(`sendWeeklyDigest: broadcast criado com sucesso: ${broadcastBody}`)
  }
}

function buildPriceDropEmailHtml(products, siteUrl) {
  const itemsHtml = products
    .map(
      (p) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
            <a href="${siteUrl}/${p.merchantSlug}/${p.slug}" style="text-decoration:none;color:inherit;display:flex;gap:12px;align-items:center;">
              <img src="${p.awImageUrl}" width="72" height="72" style="border-radius:8px;background:#fafafa;object-fit:contain;" alt="${escapeHtml(p.productName)}" />
              <span>
                <span style="display:block;font-size:11px;color:#888;text-transform:uppercase;">${escapeHtml(p.merchantDisplayName)}</span>
                <span style="display:block;font-size:14px;color:#111;margin:2px 0;">${escapeHtml(p.productName)}</span>
                <span style="display:block;font-size:16px;font-weight:700;color:#0a7d3f;">
                  ${formatPrice(p.searchPrice, p.currency)}
                  <span style="font-size:12px;font-weight:700;color:#db2777;">(-${p.priceDropPercent}%)</span>
                </span>
              </span>
            </a>
          </td>
        </tr>`
    )
    .join('')

  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
      <h2 style="color:#0f172a;">O preço caiu 📉</h2>
      <p style="color:#444;font-size:14px;">
        ${products.length === 1 ? 'Um produto' : `${products.length} produtos`} que você marcou pra acompanhar no
        Compare Ofertas ${products.length === 1 ? 'baixou' : 'baixaram'} de preço:
      </p>
      <table style="width:100%;border-collapse:collapse;">${itemsHtml}</table>
      <p style="margin-top:24px;font-size:12px;color:#888;">
        Você recebeu esse e-mail porque pediu, na página de Favoritos do Compare Ofertas, pra ser avisado quando
        esse(s) produto(s) baixasse(m) de preço. Esse aviso é único — não vamos mandar de novo pra essa mesma queda.
      </p>
    </div>`
}

function buildPriceDropEmailText(products, siteUrl) {
  const lines = ['O preço caiu!', '']
  for (const p of products) {
    lines.push(`${p.merchantDisplayName} — ${p.productName}`)
    lines.push(`${formatPrice(p.searchPrice, p.currency)} (-${p.priceDropPercent}%)`)
    lines.push(`${siteUrl}/${p.merchantSlug}/${p.slug}`)
    lines.push('')
  }
  lines.push(
    'Você recebeu esse e-mail porque pediu, na página de Favoritos do Compare Ofertas, pra ser avisado quando esse(s) produto(s) baixasse(m) de preço. Esse aviso é único — não vamos mandar de novo pra essa mesma queda.'
  )
  return lines.join('\n')
}

async function sendPriceDropEmail(email, products, env, siteUrl) {
  const subject =
    products.length === 1
      ? `Baixou de preço: ${products[0].productName}`
      : `${products.length} produtos que você acompanha baixaram de preço`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.DIGEST_FROM_EMAIL,
      to: email,
      subject,
      html: buildPriceDropEmailHtml(products, siteUrl),
      text: buildPriceDropEmailText(products, siteUrl),
    }),
  })

  if (!res.ok) {
    console.error(`sendPriceDropEmail: falha ao enviar pra ${email} (HTTP ${res.status}): ${await res.text()}`)
  }
}

// Roda todo dia (DAILY_CRON): cruza public/data/price-drops.json (gerado a
// cada build por scripts/update-price-history.mjs) com o KV PRICE_WATCH.
// Agrupa por e-mail antes de enviar — quem acompanha vários produtos que
// caíram no mesmo dia recebe um e-mail só, não um por produto.
async function checkPriceDropsAndNotify(env) {
  if (!env.PRICE_WATCH) {
    console.error('checkPriceDropsAndNotify: binding PRICE_WATCH não configurado')
    return
  }

  const siteUrl = (env.SITE_URL || 'https://comprar.blendibox.com.br').replace(/\/$/, '')
  const res = await fetch(`${siteUrl}/data/price-drops.json`)
  if (!res.ok) {
    console.error(`checkPriceDropsAndNotify: falha ao buscar price-drops.json (HTTP ${res.status})`)
    return
  }
  const drops = await res.json()
  if (!drops.length) return

  const byEmail = new Map()
  for (const product of drops) {
    const key = `watch:${product.merchantSlug}/${product.slug}`
    const raw = await env.PRICE_WATCH.get(key)
    if (!raw) continue

    const watchers = JSON.parse(raw)
    for (const watcher of watchers) {
      if (!byEmail.has(watcher.email)) byEmail.set(watcher.email, [])
      byEmail.get(watcher.email).push(product)
    }
    // Aviso é único — apaga assim que processado, não fica reavisando todo
    // dia enquanto o preço permanecer baixo.
    await env.PRICE_WATCH.delete(key)
  }

  for (const [email, products] of byEmail) {
    await sendPriceDropEmail(email, products, env, siteUrl)
  }

  console.log(`checkPriceDropsAndNotify: ${byEmail.size} e-mail(s) avisado(s) sobre ${drops.length} queda(s) de preço`)
}
