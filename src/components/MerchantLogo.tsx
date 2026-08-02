import { useState } from 'react'

// Awin hospeda um logo por anunciante nesse padrão de URL, indexado pelo
// merchant_id numérico — descoberto testando manualmente alguns IDs
// (200 pros que existem, 404 pros que não existem/não têm logo).
function awinLogoUrl(merchantId: string) {
  return `https://ui.awin.com/images/upload/merchant/profile/${merchantId}.png`
}

// Fontes que não são merchants Awin de verdade (Amazon, Shopee, revenda
// direta via Grupo Boticário) usam um slug como merchantId em vez do ID
// numérico do anunciante — não existe logo da Awin pra esses.
function isAwinMerchantId(merchantId: string | null | undefined): merchantId is string {
  return Boolean(merchantId) && /^\d+$/.test(merchantId as string)
}

export function MerchantLogo({
  merchantId,
  displayName,
  className,
}: {
  merchantId: string | null | undefined
  displayName: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)

  if (!isAwinMerchantId(merchantId) || failed) return null

  return (
    <img
      className={className ? `merchant-logo ${className}` : 'merchant-logo'}
      src={awinLogoUrl(merchantId)}
      alt={displayName}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}
