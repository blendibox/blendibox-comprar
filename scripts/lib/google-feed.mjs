// Converte o feed no formato "Google Novo" da Awin (CSV separado por ";", colunas
// da especificação do Google Shopping + advertiser_id / aw_deep_link) pras MESMAS
// colunas do feed Awin padrão, pra seguir o pipeline normal do fetch-feeds.mjs.
// Usado por entradas de feeds.config.json com "format": "google".
//
// Levantado com o feed real da Cama inBox (F4884, 26/11/2026):
// - `id` é o id da variação na loja (igual ao ?variant= do link): estável, então
//   serve de merchant_product_id (e de chave do histórico de preços);
// - preço vem como "2190.43 BRL"; sale_price pode vir vazio;
// - não há item_group_id: as variações (cor/tamanho) são agrupadas pelo
//   endereço do produto (/products/<handle>), ver `variantGroup`;
// - categoria vem em inglês (google_product_category) e às vezes vazia.

// Nome em português da categoria, a partir do último nível da categoria do Google.
// Categoria que não estiver aqui fica vazia (o pipeline tenta categoryByTitle e,
// sem isso, "geral") — melhor que publicar um slug em inglês.
const CATEGORY_PT = {
  Sofas: 'Sofás',
  Mattresses: 'Colchões',
  'Beds & Bed Frames': 'Camas',
  'Foot Rests': 'Puffs',
  'Throw Pillows': 'Almofadas',
  'Armchairs, Recliners & Sleeper Chairs': 'Poltronas',
}

// Quando o feed não manda categoria, o começo do título resolve (nas 356 linhas
// sem categoria da Cama inBox, todos eram sofás).
// (?=\s|$) e não \b: o \b do JavaScript não trata "á" como letra, então
// /^sofá\b/ nunca casa com "Sofá " (pego no teste ponta a ponta: 355 sofás em "geral").
const CATEGORY_BY_TITLE_START = [[/^sof[aá](?=\s|$)/i, 'Sofás']]

export function parseGooglePrice(raw) {
  const match = String(raw ?? '')
    .trim()
    .match(/^(\d+(?:\.\d+)?)\s+([A-Z]{3})$/)
  if (!match) return null
  const value = Number(match[1])
  return value > 0 ? { value, currency: match[2] } : null
}

// sale_price_effective_date é "inicio/fim" em ISO 8601. Vazio = vale sempre.
export function isSaleActive(effectiveDate, now = new Date()) {
  const text = String(effectiveDate ?? '').trim()
  if (!text) return true
  const [start, end] = text.split('/').map((part) => new Date(part.trim()))
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false
  return now >= start && now <= end
}

// Preço que o comprador paga hoje: o promocional só vale se for menor que o cheio,
// na mesma moeda e dentro do período (quando informado).
export function currentPrice(row, now = new Date()) {
  const full = parseGooglePrice(row.price)
  if (!full) return null
  const sale = parseGooglePrice(row.sale_price)
  if (sale && sale.currency === full.currency && sale.value < full.value && isSaleActive(row.sale_price_effective_date, now)) {
    return sale
  }
  return full
}

function productHandle(link) {
  try {
    return new URL(link).pathname.split('/').filter(Boolean).pop() || ''
  } catch {
    return ''
  }
}

function categoryName(row) {
  const leaf = String(row.google_product_category ?? '')
    .split('>')
    .pop()
    .trim()
  if (CATEGORY_PT[leaf]) return CATEGORY_PT[leaf]
  return CATEGORY_BY_TITLE_START.find(([pattern]) => pattern.test(row.title || ''))?.[1] ?? ''
}

export function googleRowToAwinRow(row, now = new Date()) {
  if (row.availability !== 'in_stock') return null
  const price = currentPrice(row, now)
  if (!price) return null
  if (!row.id || !row.title || !row.aw_deep_link || !row.advertiser_id) return null
  return {
    aw_deep_link: row.aw_deep_link,
    product_name: row.title,
    aw_product_id: row.id,
    merchant_product_id: row.id,
    merchant_image_url: row.image_link,
    description: row.description,
    merchant_category: categoryName(row),
    search_price: String(price.value),
    currency: price.currency,
    merchant_name: row.advertiser_name,
    merchant_id: row.advertiser_id,
    merchant_deep_link: row.link,
    brand_name: row.brand || '',
    product_GTIN: row.gtin || '',
    colour: row.color || '',
    size: row.size || '',
    material: row.material || '',
    in_stock: '1',
    language: 'pt',
    variantGroup: row.item_group_id || productHandle(row.link),
  }
}

export function convertGoogleRows(records, now = new Date()) {
  return records.map((row) => googleRowToAwinRow(row, now)).filter(Boolean)
}
