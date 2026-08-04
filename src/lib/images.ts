// Contraparte client-side de scripts/lib/images.mjs (aquele é Node-only,
// não dá pra importar direto no bundle do site) — mesma checagem simples de
// URL, mantidas em sincronia manualmente se a regra mudar.
export function isRealImageUrl(url: string | null | undefined): boolean {
  return Boolean(url) && !/noimage/i.test(url as string)
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
