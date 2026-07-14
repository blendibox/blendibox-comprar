// Busca o catálogo da revenda O.U.i Paris (Grupo Boticário) direto da API que
// alimenta o portal "Minha Loja Digital" da própria revendedora (a dona do
// site). Diferente do feed da Awin, aqui não existe link de afiliado — a
// "compra" é uma mensagem pronta pro WhatsApp da revendedora, com o produto
// já preenchido.
//
// OUIPARIS_USER_ID é o identificador da conta de revendedora (não é senha,
// mas ainda assim não deve ficar hardcoded no repo) — configurado como
// secret, igual AWIN_API_KEY.
const API_URL = 'https://minhaloja-api.grupoboticario.digital/product/'
const WHATSAPP_NUMBER = '5519991061426'
const PAGE_SIZE = 50
const MAX_PAGES = 20

function stripHtml(value) {
  return String(value ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildWhatsappLink(product) {
  const price = (product.salePrice ?? product.price ?? 0).toFixed(2).replace('.', ',')
  const message =
    `Olá! Tenho interesse neste produto do catálogo O.U.i Paris: ${product.name} ` +
    `(R$ ${price}). Pode me ajudar com o pedido?`
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}

async function fetchPage(userId, page) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-business-unit': 'oui',
      'x-user-id': userId,
    },
    body: JSON.stringify({ state: 'PR', page, pageSize: PAGE_SIZE }),
  })
  if (!res.ok) {
    throw new Error(`[ouiparis] falha ao buscar página ${page}: HTTP ${res.status}`)
  }
  return res.json()
}

export async function fetchOuiParisRows() {
  const userId = process.env.OUIPARIS_USER_ID
  if (!userId) {
    console.log('[ouiparis] OUIPARIS_USER_ID não definida — build segue sem o catálogo O.U.i Paris.')
    return []
  }

  let page = 1
  let all = []
  let total = Infinity

  try {
    while (all.length < total && page <= MAX_PAGES) {
      const data = await fetchPage(userId, page)
      total = data.count ?? all.length
      all = all.concat(data.products ?? [])
      page++
    }
  } catch (err) {
    console.error(`[ouiparis] erro ao buscar catálogo, seguindo sem ele: ${err.message}`)
    return []
  }

  console.log(`[ouiparis] ${all.length} produtos encontrados.`)

  return all
    .filter((p) => p.availability?.available)
    .map((p) => ({
      aw_deep_link: buildWhatsappLink(p),
      product_name: p.name,
      aw_product_id: p.sku,
      merchant_product_id: p.sku,
      merchant_image_url: p.images?.[0] ?? '',
      description: stripHtml(p.details?.shortDescription || p.description),
      merchant_category: [p.category, p.subcategory].filter(Boolean).join(' > ') || 'Geral',
      search_price: p.salePrice ?? p.price ?? '',
      merchant_name: 'O.U.i Paris',
      merchant_id: 'ouiparis',
      category_name: p.category ?? '',
      category_id: p.subcategory ?? '',
      aw_image_url: p.images?.[0] ?? '',
      currency: 'BRL',
      store_price: p.price ?? '',
      delivery_cost: '',
      merchant_deep_link: buildWhatsappLink(p),
      language: 'pt',
      last_updated: new Date().toISOString(),
      display_price: p.salePrice ?? p.price ?? '',
      data_feed_id: 'ouiparis',
      alternate_image_two: p.images?.[1] ?? p.images?.[0] ?? '',
      reviews: p.rating?.ratingCount ?? '',
      rating: p.rating?.ratingValue ?? '',
      average_rating: p.rating?.ratingValue ?? '',
      number_available: '',
      product_GTIN: '',
    }))
}
