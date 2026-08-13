import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchMerchants } from '../lib/api'
import type { MerchantMeta } from '../types/product'
import { MerchantLogo } from '../components/MerchantLogo'

export function AboutPage() {
  const [merchants, setMerchants] = useState<MerchantMeta[]>([])

  useEffect(() => {
    fetchMerchants()
      .then((data) => setMerchants([...data].sort((a, b) => a.displayName.localeCompare(b.displayName))))
      .catch(() => setMerchants([]))
  }, [])

  return (
    <div className="page legal-page">
      <header className="page__header">
        <h1>Sobre nós</h1>
      </header>
      <section>
        <p>
          O Compare Ofertas nasceu pra resolver um problema simples: encontrar o melhor preço
          entre várias lojas dá trabalho. Reunimos ofertas de marcas conhecidas em um só lugar,
          atualizadas semanalmente, pra você comparar preços, ver produtos similares e economizar
          tempo (e dinheiro) na hora de comprar.
        </p>
        <p>
          Fazemos uma curadoria das ofertas, destacando marcas e produtos com histórico real de
          bom preço e relevância, em vez de simplesmente listar tudo sem critério.
        </p>
        <p>
          Quem assina nossa <Link to="/privacidade">newsletter</Link> recebe, por e-mail, cupons e as
          maiores quedas de preço da semana — além de avisos de queda em produtos que você escolhe
          acompanhar. Você pode cancelar a inscrição quando quiser, direto no link presente em
          qualquer e-mail que enviarmos.
        </p>
        <p>Um projeto Blendibox.</p>
      </section>

      {merchants.length > 0 && (
        <section>
          <h2>Nossas lojas parceiras</h2>
          <div className="partners-grid">
            {merchants.map((m) => (
              <Link key={m.slug} to={`/${m.slug}`} className="partners-grid__item">
                <MerchantLogo merchantId={m.merchantId} displayName={m.displayName} className="partners-grid__logo" />
                <span>{m.displayName}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
