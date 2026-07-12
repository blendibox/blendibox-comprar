import { Link } from 'react-router-dom'

export function AboutPage() {
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
          Não é só um repasse automático do feed das lojas: fazemos uma curadoria das ofertas,
          destacando marcas e produtos com histórico real de bom preço e relevância, em vez de
          simplesmente listar tudo sem critério.
        </p>
        <p>
          Quem assina nossa <Link to="/privacidade">newsletter</Link> recebe cupons exclusivos por
          e-mail, além de avisos de queda de preço em produtos de interesse. Você pode cancelar a
          inscrição quando quiser, direto no link presente em qualquer e-mail que enviarmos.
        </p>
        <p>Um projeto Blendibox.</p>
      </section>
    </div>
  )
}
