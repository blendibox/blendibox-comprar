import { useEffect, useState } from 'react'
import { fetchBlogOffers } from '../lib/api'
import { OFFER_KIND_LABEL, type BlogOffer, type BlogOffersData } from '../lib/blogOffers'
import { clearInitialData, peekInitialData } from '../lib/initialData'
import { Link } from './Link'

const BRL = { style: 'currency', currency: 'BRL' } as const

// Bloco "offers" do blog: ofertas do catálogo de hoje, com link pra página do
// produto no próprio site (preço atual, histórico e botão da loja). A lista vem
// no HTML (prerender) e é relida no navegador. Sem ofertas, sobra o link de busca.
export function BlogOffersBlock({
  path,
  listId,
  searchHref,
  searchLabel,
}: {
  path: string
  listId: string
  searchHref: string
  searchLabel: string
}) {
  const [data, setData] = useState<BlogOffersData | null>(() => peekInitialData<BlogOffersData>(path))

  useEffect(() => {
    clearInitialData(path)
  }, [path])

  useEffect(() => {
    fetchBlogOffers()
      .then(setData)
      .catch(() => {})
  }, [])

  const offers = data?.lists[listId] ?? []
  const search = (
    <p className="blog-offers__search">
      <Link to={searchHref}>{searchLabel} →</Link>
    </p>
  )
  if (!data || offers.length === 0) return search

  const platforms = new Map<string, BlogOffer[]>()
  for (const offer of offers) platforms.set(offer.platform, [...(platforms.get(offer.platform) ?? []), offer])
  // fuso fixo: o mesmo texto no build e no navegador
  const date = new Date(data.generatedAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })

  return (
    <div className="blog-offers">
      {[...platforms].map(([platform, list]) => (
        <section key={platform} aria-label={`Ofertas para ${platform}`}>
          <p className="blog-offers__platform">{platform}</p>
          <ul>
            {list.map((offer) => (
              <li key={`${offer.merchantSlug}/${offer.slug}`}>
                <Link to={`/${offer.merchantSlug}/${offer.slug}/`} className="blog-offers__item">
                  {offer.imageUrl ? <img src={offer.imageUrl} alt="" width={72} height={72} loading="lazy" decoding="async" /> : <span />}
                  <span className="blog-offers__info">
                    <strong>{offer.merchantName}</strong>
                    <span>{`Edição ${offer.edition}`}</span>
                    <span className="blog-offers__kind">{offer.kind ? OFFER_KIND_LABEL[offer.kind] : 'Confira na loja o que vem'}</span>
                  </span>
                  <span className="blog-offers__price">
                    <strong>{offer.price.toLocaleString('pt-BR', BRL)}</strong>
                    <span>Ver oferta →</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="blog-offers__note">{`Preços do nosso catálogo em ${date}. Podem valer só à vista ou no Pix (parcelado pode sair mais caro) e mudam sem aviso: confira na loja antes de comprar.`}</p>
      {search}
    </div>
  )
}
