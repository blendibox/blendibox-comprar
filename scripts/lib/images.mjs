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
