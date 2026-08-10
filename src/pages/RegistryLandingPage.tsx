import { Link } from 'react-router-dom'
import { Baby, Cake, Gift, Heart, PartyPopper, Share2, ShoppingBag, Sparkles } from 'lucide-react'
import { getMyLists } from '../lib/registry'

const STEPS = [
  { Icon: ShoppingBag, title: 'Monte a lista', text: 'Adicione produtos das lojas parceiras — de geladeira a fraldas.' },
  { Icon: Share2, title: 'Compartilhe o link', text: 'Mande o link da lista pros convidados por onde quiser.' },
  { Icon: Gift, title: 'Ninguém repete', text: 'Cada presente comprado é confirmado pela loja e some da lista.' },
]

const OCCASIONS = [
  { Icon: Heart, title: 'Casamento', text: 'Monte o enxoval com eletrodomésticos, casa e decoração das lojas parceiras.' },
  { Icon: Baby, title: 'Chá de bebê', text: 'Fraldas, itens de enxoval e cuidados — com quantidade pra vários convidados.' },
  { Icon: Cake, title: 'Aniversário', text: 'Deixe claro o que você realmente quer ganhar, sem presente repetido.' },
  { Icon: Sparkles, title: 'Chá de casa nova', text: 'Do micro-ondas ao jogo de panelas, tudo num link só.' },
  { Icon: PartyPopper, title: 'Formatura & bodas', text: 'Qualquer ocasião que junta gente pra presentear.' },
  { Icon: Gift, title: 'Amigo secreto', text: 'Cada um marca o que já comprou e ninguém dá a mesma coisa.' },
]

export function RegistryLandingPage() {
  const myLists = getMyLists()

  return (
    <div className="page registry-landing">
      <header className="registry-landing__hero">
        <Gift className="registry-landing__hero-icon" size={40} aria-hidden="true" />
        <h1>Lista de presentes</h1>
        <p>
          Monte sua lista com produtos das lojas parceiras e compartilhe o link. Os convidados escolhem o que
          presentear e compram direto na loja — e ninguém dá presente repetido, porque cada compra é confirmada pela
          própria loja.
        </p>
        <div className="registry-landing__cta">
          <Link to="/listas/nova" className="registry-landing__button">
            Criar minha lista
          </Link>
        </div>
        <p className="registry-landing__note">É de graça, sem cadastro de conta.</p>
      </header>

      {myLists.length > 0 && (
        <section className="registry-landing__section">
          <h2>Minhas listas</h2>
          <div className="registry-landing__mylists">
            {myLists.map((l) => (
              <Link key={l.id} to={`/lista/${l.id}/editar?token=${l.editToken}`} className="registry-landing__mylist">
                <Gift size={18} aria-hidden="true" />
                <span>{l.title || 'Lista sem título'}</span>
                <span className="registry-landing__mylist-manage">Gerenciar →</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="registry-landing__section">
        <h2>Como funciona</h2>
        <div className="registry-landing__steps">
          {STEPS.map(({ Icon, title, text }, i) => (
            <div key={title} className="registry-landing__step">
              <span className="registry-landing__step-num">{i + 1}</span>
              <Icon className="registry-landing__step-icon" size={24} aria-hidden="true" />
              <strong>{title}</strong>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="registry-landing__section">
        <h2>Pra qualquer ocasião</h2>
        <div className="registry-landing__occasions">
          {OCCASIONS.map(({ Icon, title, text }) => (
            <div key={title} className="registry-landing__occasion">
              <Icon className="registry-landing__occasion-icon" size={22} aria-hidden="true" />
              <div>
                <strong>{title}</strong>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="registry-landing__bottom">
        <h2>Pronto pra começar?</h2>
        <Link to="/listas/nova" className="registry-landing__button">
          Criar minha lista de presentes
        </Link>
      </section>
    </div>
  )
}
