// Contraparte client-side de scripts/lib/images.mjs (aquele é Node-only,
// não dá pra importar direto no bundle do site) — mesma checagem simples de
// URL, mantidas em sincronia manualmente se a regra mudar.
export function isRealImageUrl(url: string | null | undefined): boolean {
  return Boolean(url) && !/noimage/i.test(url as string)
}

// URL original do lojista, embutida pela proxy de imagens da Awin no parâmetro
// `url` (ex.: ?url=ssl%3Awww.lg.com%2F...jpg → https://www.lg.com/...jpg).
// Contraparte client-side de productServeOriginUrl em scripts/lib/images.mjs.
export function proxyOriginUrl(url: string): string | null {
  if (!url.includes('images2.productserve.com')) return null
  try {
    const raw = new URL(url).searchParams.get('url')
    return raw ? `https://${raw.replace(/^ssl:/, '')}` : null
  } catch {
    return null
  }
}

// Plano B quando a proxy da Awin (images2.productserve.com) falha: troca a
// imagem pela original do lojista. Caso real, 2026-11-23: o backend da proxy
// passou a responder 503 "Backend is unhealthy" pra ~65–75% das imagens que não
// estavam no cache dela, em todas as lojas, enquanto o arquivo no lojista
// seguia 200 — o site inteiro ficou com foto quebrada (só o texto alternativo).
//
// Um único ouvinte global em vez de onError em cada <img>: cobre cards, galeria,
// comparador, favoritos e blog sem mexer nos componentes, e (rodando no bundle,
// não no HTML) não pesa nas ~87 mil páginas pré-renderizadas. 'error' não
// borbulha, por isso a fase de captura. Só a imagem original é tentada (uma vez
// por <img>, sem laço); se ela também falhar, fica como estava.
export function installProxyImageFallback(): void {
  if (typeof window === 'undefined') return
  const w = window as Window & { __proxyImageFallback?: boolean }
  if (w.__proxyImageFallback) return
  w.__proxyImageFallback = true

  const swap = (img: HTMLImageElement) => {
    if (img.dataset.originFallback) return
    const origin = proxyOriginUrl(img.currentSrc || img.src)
    if (!origin) return
    img.dataset.originFallback = '1'
    img.src = origin
  }

  document.addEventListener(
    'error',
    (event) => {
      if (event.target instanceof HTMLImageElement) swap(event.target)
    },
    true
  )

  // Imagens do HTML pré-renderizado que já falharam antes deste script rodar
  // (o erro não será disparado de novo). No 'load' da janela todas já foram
  // tentadas — e a hidratação normalmente já começou.
  const repairAlreadyFailed = () => {
    for (const img of Array.from(document.images)) {
      if (img.complete && img.naturalWidth === 0) swap(img)
    }
  }
  if (document.readyState === 'complete') repairAlreadyFailed()
  else window.addEventListener('load', repairAlreadyFailed, { once: true })
}

interface GalleryCandidate {
  awImageUrl: string
  largeImage?: string
  alternateImage?: string
  alternateImageTwo?: string
  alternateImageThree?: string
  alternateImageFour?: string
}

// largeImage é só uma versão em resolução maior da mesma foto principal (pro
// Google Merchant) — usada aqui pra melhorar a imagem de destaque, não como
// um slot separado da galeria (senão apareceria uma foto duplicada). As
// alternate_image* entram como itens distintos, deduplicadas por URL exata.
export function getGalleryImages(product: GalleryCandidate): string[] {
  const main = isRealImageUrl(product.largeImage) ? (product.largeImage as string) : product.awImageUrl
  const candidates = [
    main,
    product.alternateImage,
    product.alternateImageTwo,
    product.alternateImageThree,
    product.alternateImageFour,
  ]

  const seen = new Set<string>()
  const images: string[] = []
  for (const url of candidates) {
    if (!isRealImageUrl(url) || seen.has(url as string)) continue
    seen.add(url as string)
    images.push(url as string)
  }
  return images
}
