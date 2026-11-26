import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Link } from '../components/Link'
import { fetchCoupons } from '../lib/api'
import { clearInitialData, peekInitialData } from '../lib/initialData'
import { isStillValid, prepareCoupons } from '../lib/coupons'
import type { CouponEntry } from '../types/product'
import { CouponTicket } from '../components/coupons/CouponTicket'
import { OfferCard } from '../components/coupons/OfferCard'

// Injetado por scripts/prerender.mjs pra a página já vir com os cupons no HTML
// estático (SEO) sem esperar o fetch client-side.
interface CouponsMerchantInitialData {
  merchantSlug: string
  displayName: string
  coupons: CouponEntry[]
}

// Perguntas visíveis na página — precisam bater com o FAQPage do JSON-LD
// (o Google exige que o conteúdo do FAQ esteja visível na página).
function faqFor(displayName: string) {
  return [
    {
      q: `Os cupons da ${displayName} são de verdade?`,
      a: `Sim. Todos os cupons e promoções da ${displayName} vêm direto do programa oficial de afiliados da loja e são verificados na nossa atualização diária. Cupons vencidos são removidos automaticamente.`,
    },
    {
      q: `Como usar um cupom de desconto da ${displayName}?`,
      a: `Copie o código do cupom aqui, clique para ir à loja e cole o código no carrinho ou na finalização da compra no site da ${displayName}. A compra é feita direto com a loja.`,
    },
    {
      q: `E as promoções da ${displayName} sem código de cupom?`,
      a: `Algumas ofertas da ${displayName} não precisam de código: é só clicar em "Ver oferta" e o desconto já está aplicado na página de ofertas do site da ${displayName}. Nesses casos não há código pra copiar — basta aproveitar a promoção direto na loja.`,
    },
    {
      q: `Com que frequência os cupons da ${displayName} são atualizados?`,
      a: `Todo dia. Buscamos as promoções ativas da ${displayName} diariamente, então a lista está sempre atualizada e sem cupons vencidos.`,
    },
  ]
}

export function CouponsMerchantPage() {
  const { loja = '' } = useParams()
  const path = `/cupons/${loja}/`
  const [initial] = useState<CouponsMerchantInitialData | null>(() =>
    peekInitialData<CouponsMerchantInitialData>(path)
  )
  const [coupons, setCoupons] = useState<CouponEntry[]>(initial?.coupons ?? [])
  const [displayName, setDisplayName] = useState(initial?.displayName ?? loja)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>(initial ? 'ready' : 'loading')

  useEffect(() => {
    clearInitialData(path)
  }, [path])

  // Relógio só depois de montar (o HTML estático não pode depender dele).
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    fetchCoupons()
      .then((data) => {
        const date = new Date()
        const mine = data.filter((c) => c.merchantSlug === loja && isStillValid(c, date))
        setNow(date)
        setCoupons(mine)
        if (mine[0]) setDisplayName(mine[0].advertiser)
        setState('ready')
      })
      .catch(() => setState('error'))
  }, [loja])

  // Sem duplicatas e com 127V/220V num cartão só (mesma regra do prerender).
  const items = useMemo(() => prepareCoupons(coupons), [coupons])
  const codes = items.filter((c) => c.isVoucher)
  const offers = items.filter((c) => !c.isVoucher)

  const faq = useMemo(() => faqFor(displayName), [displayName])

  return (
    <div className="page coupons-merchant">
      <nav className="breadcrumbs">
        <Link to="/">Início</Link>
        {' › '}
        <Link to="/cupons/">Cupons</Link>
        {' › '}
        <span style={{ textTransform: 'capitalize' }}>{displayName}</span>
      </nav>

      <header className="page__header">
        <h1 style={{ textTransform: 'capitalize' }}>Cupons {displayName}</h1>
        <p className="page__meta">
          {items.length > 0
            ? `${items.length} ${items.length === 1 ? 'cupom/promoção ativo' : 'cupons e promoções ativos'} da ${displayName}, verificados diariamente.`
            : `Códigos de desconto e promoções da ${displayName}.`}
        </p>
      </header>

      {state === 'loading' && <p className="status">Carregando cupons...</p>}
      {state === 'error' && <p className="status status--error">Não foi possível carregar os cupons.</p>}

      {state === 'ready' && coupons.length === 0 && (
        <p className="status">
          Nenhum cupom ativo da {displayName} no momento — mas as ofertas mudam todo dia.{' '}
          <Link to={`/${loja}/`}>Ver as ofertas da {displayName} →</Link>
        </p>
      )}

      {codes.length > 0 && (
        <section className="coupons-section" aria-labelledby="loja-codes-title">
          <div className="coupons-section__head">
            <h2 id="loja-codes-title">{`Cupons com código (${codes.length})`}</h2>
          </div>
          <div className="ticket-grid">
            {codes.map((coupon) => (
              <CouponTicket key={coupon.id} coupon={coupon} now={now} />
            ))}
          </div>
        </section>
      )}

      {offers.length > 0 && (
        <section className="coupons-section" aria-labelledby="loja-offers-title">
          <div className="coupons-section__head">
            <h2 id="loja-offers-title">{`Ofertas com desconto automático (${offers.length})`}</h2>
          </div>
          <div className="offer-grid">
            {offers.map((coupon) => (
              <OfferCard key={coupon.id} coupon={coupon} now={now} showStore={false} />
            ))}
          </div>
        </section>
      )}

      <section className="coupons-merchant__links">
        <Link to={`/${loja}/`}>Ver todas as ofertas da {displayName} →</Link>
        <Link to="/cupons/">Ver cupons de todas as lojas →</Link>
      </section>

      <section className="coupons-merchant__faq">
        <h2>Perguntas frequentes sobre cupons da {displayName}</h2>
        {faq.map((item) => (
          <div key={item.q} className="coupons-merchant__faq-item">
            <h3>{item.q}</h3>
            <p>{item.a}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
