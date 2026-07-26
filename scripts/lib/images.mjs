// A proxy de imagem images2.productserve.com (usada por vários lojistas —
// Mizuno, Nike, Centauro etc.) serve o tamanho pedido nos parâmetros w/h da
// própria URL, geralmente 200x200 — pequeno demais pro Google Merchant
// (exige ≥500x500px) e mais baixa resolução do que precisa no site. Trocar
// só esses dois parâmetros pega a mesma imagem em resolução maior, sem
// depender de o lojista ter uma coluna de imagem grande separada no feed.
export function upsizeProductServeImage(url, size = 500) {
  if (!url || !url.includes('images2.productserve.com')) return url
  return url.replace(/([?&]w=)\d+/, `$1${size}`).replace(/([?&]h=)\d+/, `$1${size}`)
}

// Alguns lojistas da Awin mandam um GIF placeholder (ex:
// images2.productserve.com/noimage.gif) em vez de deixar o campo vazio
// quando não têm foto real do produto — pior que vazio, porque passa
// despercebido nas checagens de "campo ausente".
const NO_IMAGE_PATTERN = /noimage/i

export function isRealImageUrl(url) {
  return Boolean(url) && !NO_IMAGE_PATTERN.test(url)
}

// Ordem de preferência ao escolher a imagem principal: campos "primários"
// primeiro, depois as alternativas do feed, deixando large_image por último
// (ela existe principalmente pro Google Merchant, mas serve como fallback
// aqui também). Retorna a primeira URL real encontrada, ou null se todas as
// opções forem vazias/placeholder.
const IMAGE_FALLBACK_FIELDS = [
  'awImageUrl',
  'merchantImageUrl',
  'alternateImage',
  'alternateImageTwo',
  'alternateImageThree',
  'alternateImageFour',
  'awThumbUrl',
  'largeImage',
]

export function pickRealImage(product) {
  for (const field of IMAGE_FALLBACK_FIELDS) {
    if (isRealImageUrl(product[field])) return product[field]
  }
  return null
}
