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

function corsHeaders(env, request) {
  const allowed = env.ALLOWED_ORIGIN || '*'
  const origin = request?.headers?.get('Origin') || ''
  // Reflete a origem quando é o domínio de produção ou qualquer localhost
  // (dev) — sem abrir pra '*'. localhost só é acessível na máquina do dev.
  const allowOrigin =
    origin && (origin === allowed || /^https?:\/\/localhost(:\d+)?$/.test(origin)) ? origin : allowed
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
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
  async fetch(request, env, ctx) {
    const headers = corsHeaders(env, request)
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers })
    }

    // Webhook da Awin (Transaction Notifications) — server-to-server, sem CORS.
    if (url.pathname === '/awin-transaction' && request.method === 'POST') {
      return handleAwinTransaction(request, env, ctx)
    }

    // API da lista de presentes (Fase 1).
    if (url.pathname === '/registry' || url.pathname.startsWith('/registry/')) {
      return handleRegistry(request, env, url, headers)
    }

    // Rotas existentes (newsletter/watch) — só POST.
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Método não permitido' }, 405, headers)
    }
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

// ---------------------------------------------------------------------------
// Lista de presentes (Fase 1) — D1 REGISTRY_DB. Ver worker/registry-schema.sql
// e docs/lista-presentes-spec.md. Estados do item:
//   disponível -> com interesse (alguém clicou) -> comprado (Awin confirmou).
// A compra SÓ é marcada pelo webhook da Awin, casada pelo clickref.
// ---------------------------------------------------------------------------

const EVENT_TYPES = [
  'casamento',
  'aniversario',
  'mesversario',
  'quinze-anos',
  'cha-bebe',
  'cha-casa',
  'pet',
  'formatura',
  'cha',
  'outro',
]

// Transforma texto num slug pra URL (sem acento, minúsculo, hífens) — usado
// pro id "amigável" da lista (ex.: "casamento-ana-e-joao-x7k2p9").
function slugifyRegistry(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function randomToken(len) {
  const bytes = new Uint8Array(len)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => (b % 36).toString(36)).join('')
}

// Anexa o clickref ao deeplink de afiliado da Awin — volta no webhook da
// transação e é como casamos a compra ao item exato.
function appendClickref(deeplink, clickref) {
  const sep = deeplink.includes('?') ? '&' : '?'
  return `${deeplink}${sep}clickref=${encodeURIComponent(clickref)}`
}

// O formato exato do payload da Transaction Notification varia; tenta os
// locais mais prováveis do clickref (Click-source data ligado no painel).
function extractClickref(t) {
  return (
    t.clickRef ?? t.clickref ?? t.clickRefs?.clickRef ?? t.clickRefs?.clickref ?? t.clickSourceData?.clickRef ?? null
  )
}

async function handleRegistry(request, env, url, headers) {
  if (!env.REGISTRY_DB) return jsonResponse({ error: 'Lista de presentes não configurada neste Worker' }, 500, headers)

  const parts = url.pathname.split('/').filter(Boolean) // ['registry', id?, 'items'?, itemId?, action?]
  const method = request.method

  if (parts.length === 1 && method === 'POST') return createRegistry(request, env, headers)

  const id = parts[1]
  if (!id) return jsonResponse({ error: 'Rota inválida' }, 404, headers)

  if (parts.length === 2 && method === 'GET') return getRegistry(id, env, headers)
  if (parts.length === 3 && parts[2] === 'access' && method === 'POST') return registerGuest(id, request, env, headers)
  if (parts.length === 3 && parts[2] === 'items' && method === 'POST') return addItem(id, request, env, headers)
  if (parts.length === 4 && parts[2] === 'items' && method === 'DELETE') return removeItem(id, parts[3], request, env, headers)
  if (parts.length === 5 && parts[2] === 'items' && parts[4] === 'interest' && method === 'POST')
    return recordInterest(id, parts[3], request, env, headers)

  return jsonResponse({ error: 'Rota não encontrada' }, 404, headers)
}

async function createRegistry(request, env, headers) {
  const body = await request.json().catch(() => null)
  if (!body) return jsonResponse({ error: 'JSON inválido' }, 400, headers)

  const ownerEmail = String(body.ownerEmail || '').trim().toLowerCase()
  const title = String(body.title || '').trim().slice(0, 120)
  const eventType = EVENT_TYPES.includes(body.eventType) ? body.eventType : 'outro'
  const eventDate = /^\d{4}-\d{2}-\d{2}$/.test(String(body.eventDate || '')) ? body.eventDate : null
  if (!EMAIL_REGEX.test(ownerEmail)) return jsonResponse({ error: 'E-mail inválido' }, 400, headers)
  if (!title) return jsonResponse({ error: 'Título obrigatório' }, 400, headers)

  // ID amigável na URL: código personalizado (se informado e ainda livre) ou
  // gerado do título + sufixo curto pra garantir unicidade e legibilidade.
  let id
  if (body.customId != null && String(body.customId).trim() !== '') {
    const custom = slugifyRegistry(body.customId)
    if (custom.length < 3) return jsonResponse({ error: 'O código precisa ter pelo menos 3 letras ou números.' }, 400, headers)
    const taken = await env.REGISTRY_DB.prepare('SELECT id FROM registries WHERE id=?').bind(custom).first()
    if (taken) return jsonResponse({ error: 'Esse código já está em uso — escolha outro.' }, 409, headers)
    id = custom
  } else {
    const base = slugifyRegistry(title) || 'lista'
    for (let i = 0; i < 4 && !id; i++) {
      const candidate = `${base}-${randomToken(6)}`
      const taken = await env.REGISTRY_DB.prepare('SELECT id FROM registries WHERE id=?').bind(candidate).first()
      if (!taken) id = candidate
    }
    if (!id) id = `${base}-${crypto.randomUUID().slice(0, 8)}`
  }
  const editToken = crypto.randomUUID()
  await env.REGISTRY_DB.prepare(
    'INSERT INTO registries (id, edit_token, title, event_type, event_date, owner_email, created_at) VALUES (?,?,?,?,?,?,?)'
  )
    .bind(id, editToken, title, eventType, eventDate, ownerEmail, new Date().toISOString())
    .run()

  return jsonResponse({ ok: true, id, editToken }, 200, headers)
}

async function getRegistry(id, env, headers) {
  const reg = await env.REGISTRY_DB.prepare(
    'SELECT id, title, event_type, event_date FROM registries WHERE id=?'
  )
    .bind(id)
    .first()
  if (!reg) return jsonResponse({ error: 'Lista não encontrada' }, 404, headers)

  const items = await env.REGISTRY_DB.prepare(
    `SELECT i.id, i.merchant_slug, i.slug, i.snap_name, i.snap_image, i.snap_price, i.quantity, i.purchased_count,
       (SELECT COUNT(*) FROM registry_interest ri WHERE ri.item_id = i.id) AS interest_count
     FROM registry_items i WHERE i.registry_id=? ORDER BY i.added_at`
  )
    .bind(id)
    .all()

  const list = (items.results || []).map((it) => {
    const quantity = it.quantity ?? 1
    const purchased = it.purchased_count ?? 0
    // "comprado" só quando toda a quantidade foi confirmada. Com quantidade
    // parcial ainda dá pra presentear (ex.: faltam 3 pacotes de fralda).
    const status = purchased >= quantity ? 'comprado' : it.interest_count > 0 ? 'interesse' : 'disponivel'
    return {
      id: it.id,
      merchantSlug: it.merchant_slug,
      slug: it.slug,
      name: it.snap_name,
      image: it.snap_image,
      price: it.snap_price,
      quantity,
      purchasedCount: purchased,
      status,
    }
  })

  // Nunca expõe e-mails de dono/convidados — só o que é público.
  return jsonResponse(
    { registry: { id: reg.id, title: reg.title, eventType: reg.event_type, eventDate: reg.event_date }, items: list },
    200,
    headers
  )
}

// Convidado se cadastra pra acessar a lista (captura o lead + permite
// atribuir interesse). Consentimento explícito é obrigatório (LGPD). A
// newsletter geral é opt-in separado.
async function registerGuest(id, request, env, headers) {
  const body = await request.json().catch(() => null)
  if (!body) return jsonResponse({ error: 'JSON inválido' }, 400, headers)
  const email = String(body.email || '').trim().toLowerCase()
  if (!EMAIL_REGEX.test(email)) return jsonResponse({ error: 'E-mail inválido' }, 400, headers)
  if (!body.consent) return jsonResponse({ error: 'Consentimento necessário' }, 400, headers)

  const reg = await env.REGISTRY_DB.prepare('SELECT id FROM registries WHERE id=?').bind(id).first()
  if (!reg) return jsonResponse({ error: 'Lista não encontrada' }, 404, headers)

  const existing = await env.REGISTRY_DB.prepare(
    'SELECT access_token FROM registry_guests WHERE registry_id=? AND email=?'
  )
    .bind(id, email)
    .first()

  let accessToken = existing?.access_token
  if (!accessToken) {
    accessToken = crypto.randomUUID()
    await env.REGISTRY_DB.prepare(
      'INSERT INTO registry_guests (id, registry_id, email, access_token, registered_at) VALUES (?,?,?,?,?)'
    )
      .bind(crypto.randomUUID(), id, email, accessToken, new Date().toISOString())
      .run()
    if (body.subscribeNewsletter) {
      try {
        await addToNewsletterAudience(email, env)
      } catch {
        // ignora — cadastro na lista já feito
      }
    }
  }

  return jsonResponse({ ok: true, accessToken }, 200, headers)
}

async function addItem(id, request, env, headers) {
  const body = await request.json().catch(() => null)
  if (!body) return jsonResponse({ error: 'JSON inválido' }, 400, headers)

  const reg = await env.REGISTRY_DB.prepare('SELECT edit_token FROM registries WHERE id=?').bind(id).first()
  if (!reg) return jsonResponse({ error: 'Lista não encontrada' }, 404, headers)
  if (reg.edit_token !== String(body.editToken || '')) return jsonResponse({ error: 'Não autorizado' }, 403, headers)

  const item = body.item || {}
  if (!item.merchantSlug || !item.slug || !item.name || !item.deeplink)
    return jsonResponse({ error: 'Item incompleto' }, 400, headers)

  const quantity = Math.min(99, Math.max(1, Math.floor(Number(item.quantity) || 1)))
  const itemId = crypto.randomUUID()
  await env.REGISTRY_DB.prepare(
    'INSERT INTO registry_items (id, registry_id, merchant_slug, slug, snap_name, snap_image, snap_price, snap_deeplink, quantity, added_at) VALUES (?,?,?,?,?,?,?,?,?,?)'
  )
    .bind(
      itemId,
      id,
      String(item.merchantSlug),
      String(item.slug),
      String(item.name).slice(0, 300),
      item.image ? String(item.image) : null,
      item.price != null ? Number(item.price) : null,
      String(item.deeplink),
      quantity,
      new Date().toISOString()
    )
    .run()

  return jsonResponse({ ok: true, itemId }, 200, headers)
}

async function removeItem(id, itemId, request, env, headers) {
  const body = await request.json().catch(() => ({}))
  const reg = await env.REGISTRY_DB.prepare('SELECT edit_token FROM registries WHERE id=?').bind(id).first()
  if (!reg) return jsonResponse({ error: 'Lista não encontrada' }, 404, headers)
  if (reg.edit_token !== String(body.editToken || '')) return jsonResponse({ error: 'Não autorizado' }, 403, headers)

  await env.REGISTRY_DB.prepare('DELETE FROM registry_items WHERE id=? AND registry_id=?').bind(itemId, id).run()
  return jsonResponse({ ok: true }, 200, headers)
}

// Convidado clicou pra ir à loja: registra o interesse com um clickref único
// e devolve o deeplink já com &clickref=... A compra só é confirmada depois,
// pelo webhook da Awin.
async function recordInterest(id, itemId, request, env, headers) {
  const body = await request.json().catch(() => ({}))
  const item = await env.REGISTRY_DB.prepare(
    'SELECT id, snap_deeplink FROM registry_items WHERE id=? AND registry_id=?'
  )
    .bind(itemId, id)
    .first()
  if (!item) return jsonResponse({ error: 'Item não encontrado' }, 404, headers)

  let guestId = null
  const accessToken = String(body.accessToken || '')
  if (accessToken) {
    const g = await env.REGISTRY_DB.prepare(
      'SELECT id FROM registry_guests WHERE registry_id=? AND access_token=?'
    )
      .bind(id, accessToken)
      .first()
    guestId = g?.id || null
  }

  const clickref = 'reg' + randomToken(14)
  await env.REGISTRY_DB.prepare(
    'INSERT INTO registry_interest (id, item_id, guest_id, clickref, created_at) VALUES (?,?,?,?,?)'
  )
    .bind(crypto.randomUUID(), itemId, guestId, clickref, new Date().toISOString())
    .run()

  return jsonResponse({ ok: true, deeplink: appendClickref(item.snap_deeplink, clickref), clickref }, 200, headers)
}

// Webhook da Awin (Transaction Notifications). Guarda a transação (idempotente
// por transaction_id) e, se o clickref bater com um interesse conhecido, marca
// o item como comprado. Responde 200 sempre que consegue processar — a Awin
// reenviaria em caso de erro.
async function handleAwinTransaction(request, env, ctx) {
  if (!env.REGISTRY_DB) return new Response('registry db not configured', { status: 500 })

  let body
  try {
    body = await request.json()
  } catch {
    return new Response('bad json', { status: 400 })
  }

  const txns = Array.isArray(body) ? body : Array.isArray(body?.transactions) ? body.transactions : [body]
  let matched = 0

  for (const t of txns) {
    const txnId = String(t.id ?? t.transactionId ?? '')
    if (!txnId) continue

    // Idempotência: a Awin pode reenviar a mesma notificação — se já
    // processamos essa transação, pula (senão contaria a compra duas vezes).
    const seen = await env.REGISTRY_DB.prepare('SELECT transaction_id FROM awin_transactions WHERE transaction_id=?')
      .bind(txnId)
      .first()
    if (seen) continue

    const clickref = extractClickref(t)
    const status = t.commissionStatus ?? t.status ?? null
    const amount = Number(t.saleAmount?.amount ?? t.transactionAmount ?? t.commissionAmount ?? 0) || null
    const currency = t.saleAmount?.currency ?? t.currency ?? null
    const advertiserId = String(t.advertiserId ?? t.advertiser?.id ?? '')

    await env.REGISTRY_DB.prepare(
      'INSERT INTO awin_transactions (transaction_id, clickref, advertiser_id, amount, currency, status, received_at, raw) VALUES (?,?,?,?,?,?,?,?)'
    )
      .bind(txnId, clickref, advertiserId, amount, currency, status, new Date().toISOString(), JSON.stringify(t))
      .run()

    if (!clickref) continue
    const interest = await env.REGISTRY_DB.prepare('SELECT item_id FROM registry_interest WHERE clickref=?')
      .bind(clickref)
      .first()
    if (!interest?.item_id) continue

    // +1 na quantidade comprada, sem passar do total desejado (quantity).
    const upd = await env.REGISTRY_DB.prepare(
      'UPDATE registry_items SET purchased_count = purchased_count + 1, purchased_at = COALESCE(purchased_at, ?), purchased_clickref = COALESCE(purchased_clickref, ?) WHERE id=? AND purchased_count < quantity'
    )
      .bind(new Date().toISOString(), clickref, interest.item_id)
      .run()

    if ((upd.meta?.changes ?? 0) > 0) {
      matched++
      // Avisa o dono por e-mail, sem segurar a resposta pra Awin.
      const notify = notifyOwnerOfPurchase(env, interest.item_id)
      if (ctx?.waitUntil) ctx.waitUntil(notify)
      else await notify
    }
  }

  console.log(`handleAwinTransaction: ${txns.length} transação(ões), ${matched} compra(s) confirmada(s) em item de lista`)
  return new Response('ok', { status: 200 })
}

// Avisa o dono da lista por e-mail (Resend) quando uma compra é confirmada.
// Best-effort — falha aqui não deve afetar a resposta pro webhook da Awin.
async function notifyOwnerOfPurchase(env, itemId) {
  try {
    if (!env.RESEND_API_KEY) return
    const row = await env.REGISTRY_DB.prepare(
      `SELECT ri.snap_name, ri.quantity, ri.purchased_count, r.owner_email, r.title, r.id AS registry_id, r.edit_token
       FROM registry_items ri JOIN registries r ON r.id = ri.registry_id WHERE ri.id=?`
    )
      .bind(itemId)
      .first()
    if (!row?.owner_email) return

    const siteUrl = (env.SITE_URL || 'https://comprar.blendibox.com.br').replace(/\/$/, '')
    const manageUrl = `${siteUrl}/lista/${row.registry_id}/editar?token=${row.edit_token}`
    const quantity = row.quantity ?? 1
    const purchased = row.purchased_count ?? 0
    const remaining = Math.max(0, quantity - purchased)
    const qtyLine = quantity > 1 ? ` (${purchased} de ${quantity})` : ''

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.DIGEST_FROM_EMAIL,
        to: row.owner_email,
        subject: `🎁 Presente comprado da sua lista "${row.title}"`,
        html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
            <h2 style="color:#0f172a;">Alguém comprou um presente 🎁</h2>
            <p style="font-size:15px;color:#333;">Um convidado comprou <strong>${escapeHtml(row.snap_name)}</strong>${qtyLine} da sua lista <strong>${escapeHtml(row.title)}</strong>.</p>
            ${remaining > 0 ? `<p style="font-size:14px;color:#666;">Ainda ${remaining === 1 ? 'falta' : 'faltam'} ${remaining} deste item.</p>` : ''}
            <p style="margin-top:20px;"><a href="${manageUrl}" style="color:#0a7d3f;">Ver a lista</a></p>
          </div>`,
        text: `Alguém comprou "${row.snap_name}"${qtyLine} da sua lista "${row.title}".${remaining > 0 ? ` ${remaining === 1 ? 'Falta' : 'Faltam'} ${remaining}.` : ''}\n${manageUrl}`,
      }),
    })
  } catch (e) {
    console.error('notifyOwnerOfPurchase falhou:', e)
  }
}
