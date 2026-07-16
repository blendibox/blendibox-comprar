// Busca o catálogo de revenda de marcas do Grupo Boticário direto da API que
// alimenta o portal "Minha Loja Digital" da própria revendedora (a dona do
// site) — mesma conta pras 4 marcas, só muda o header x-business-unit.
// Diferente do feed da Awin, aqui não existe link de afiliado — a "compra" é
// uma mensagem pronta pro WhatsApp da revendedora, com o produto já
// preenchido.
//
// OUIPARIS_USER_ID é o identificador da conta de revendedora (não é senha,
// mas ainda assim não deve ficar hardcoded no repo) — configurado como
// secret, igual AWIN_API_KEY. Nome mantido do integração original (só a OUI);
// hoje cobre as 4 marcas, já que é a mesma conta pra todas.
const API_URL = 'https://minhaloja-api.grupoboticario.digital/product/'
const WHATSAPP_NUMBER = '5519991061426'
const PAGE_SIZE = 50
// Teto de segurança contra loop infinito se a API nunca convergir pro count
// esperado — bem acima do maior catálogo observado (O Boticário, ~3.950
// produtos com pageSize 50 = ~79 páginas).
const MAX_PAGES = 200

// Cada marca usa um x-business-unit diferente na mesma API — descoberto
// inspecionando as chamadas de rede de cada portal (não documentado
// publicamente pelo Grupo Boticário).
export const GRUPO_BOTICARIO_BRANDS = [
  { businessUnit: 'oui', merchantId: 'ouiparis', slug: 'ouiparis', displayName: 'O.U.i Paris' },
  { businessUnit: 'eudora', merchantId: 'eudora-revenda', slug: 'eudora-revenda', displayName: 'Eudora (Revenda)' },
  { businessUnit: 'boticario', merchantId: 'boticario-revenda', slug: 'boticario-revenda', displayName: 'O Boticário (Revenda)' },
  { businessUnit: 'euamomake', merchantId: 'qdb-revenda', slug: 'qdb-revenda', displayName: 'Quem Disse, Berenice?' },
]

function stripHtml(value) {
  return String(value ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildWhatsappLink(brandLabel, product) {
  const price = (product.salePrice ?? product.price ?? 0).toFixed(2).replace('.', ',')
  const message =
    `Olá! Tenho interesse neste produto do catálogo ${brandLabel}: ${product.name} ` +
    `(R$ ${price}). Pode me ajudar com o pedido?`
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}

async function fetchPage(businessUnit, userId, page) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-business-unit': businessUnit,
      'x-user-id': userId,
    },
    body: JSON.stringify({ state: 'PR', page, pageSize: PAGE_SIZE }),
  })
  if (!res.ok) {
    throw new Error(`[${businessUnit}] falha ao buscar página ${page}: HTTP ${res.status}`)
  }
  return res.json()
}

async function fetchBrandRows(brand, userId) {
  let page = 1
  let all = []
  let total = Infinity

  try {
    while (all.length < total && page <= MAX_PAGES) {
      const data = await fetchPage(brand.businessUnit, userId, page)
      total = data.count ?? all.length
      all = all.concat(data.products ?? [])
      page++
    }
  } catch (err) {
    console.error(`[${brand.slug}] erro ao buscar catálogo, seguindo sem ele: ${err.message}`)
    return []
  }

  console.log(`[${brand.slug}] ${all.length} produtos encontrados.`)

  return all
    .filter((p) => p.availability?.available)
    .map((p) => ({
      aw_deep_link: buildWhatsappLink(brand.displayName, p),
      product_name: p.name,
      aw_product_id: p.sku,
      merchant_product_id: p.sku,
      merchant_image_url: p.images?.[0] ?? '',
      description: stripHtml(p.details?.shortDescription || p.description),
      merchant_category: [p.category, p.subcategory].filter(Boolean).join(' > ') || 'Geral',
      search_price: p.salePrice ?? p.price ?? '',
      merchant_name: brand.displayName,
      merchant_id: brand.merchantId,
      category_name: p.category ?? '',
      category_id: p.subcategory ?? '',
      aw_image_url: p.images?.[0] ?? '',
      currency: 'BRL',
      store_price: p.price ?? '',
      delivery_cost: '',
      merchant_deep_link: buildWhatsappLink(brand.displayName, p),
      language: 'pt',
      last_updated: new Date().toISOString(),
      display_price: p.salePrice ?? p.price ?? '',
      data_feed_id: brand.slug,
      alternate_image_two: p.images?.[1] ?? p.images?.[0] ?? '',
      reviews: p.rating?.ratingCount ?? '',
      rating: p.rating?.ratingValue ?? '',
      average_rating: p.rating?.ratingValue ?? '',
      number_available: '',
      product_GTIN: '',
    }))
}

export async function fetchGrupoBoticarioRows() {
  const userId = process.env.OUIPARIS_USER_ID
  if (!userId) {
    console.log('[grupoboticario] OUIPARIS_USER_ID não definida — build segue sem esses catálogos de revenda.')
    return []
  }

  const rowsPerBrand = await Promise.all(GRUPO_BOTICARIO_BRANDS.map((brand) => fetchBrandRows(brand, userId)))
  return rowsPerBrand.flat()
}
