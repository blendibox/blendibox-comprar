import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Baby,
  Cake,
  CheckCircle2,
  Crown,
  Gift,
  Heart,
  Link2,
  PartyPopper,
  PawPrint,
  Search,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
} from 'lucide-react'
import { fetchHomeHighlights, fetchMerchants, fetchMeta } from '../lib/api'
import { formatPrice } from '../components/ProductCard'
import { getMyLists } from '../lib/registry'
import type { ProductIndexEntry } from '../types/product'

const STEPS = [
  { Icon: ShoppingBag, title: 'Monte a lista', text: 'Adicione produtos de qualquer loja parceira — de geladeira a fraldas, no mesmo link.' },
  { Icon: Share2, title: 'Compartilhe o link', text: 'Mande o link pros convidados por WhatsApp, Instagram, onde quiser.' },
  { Icon: Gift, title: 'Ninguém repete', text: 'Cada presente comprado é confirmado pela loja e some da lista automaticamente.' },
]

// Por que aqui — argumentos reais, sustentados pelo catálogo (multi-loja) e
// pelo mecanismo de confirmação de compra (clickref + webhook da loja).
const WHY: { Icon: typeof Store; title: string; text: string; tint: 'green' | 'pink' }[] = [
  { Icon: Store, tint: 'green', title: 'Não fica preso a uma loja', text: 'Misture produtos de várias lojas parceiras numa lista só. Seus convidados não precisam se cadastrar em cada loja.' },
  { Icon: Search, tint: 'pink', title: 'Compare antes de presentear', text: 'Cada item mostra o preço monitorado — o convidado vê se a oferta está boa antes de comprar.' },
  { Icon: CheckCircle2, tint: 'green', title: 'Sem presente repetido', text: 'A compra é confirmada pela própria loja, não no "chute". Assim que confirma, o item sai da lista.' },
  { Icon: Link2, tint: 'pink', title: 'Um link só', text: 'Nada de mandar várias listas de lojas diferentes. Um endereço reúne tudo.' },
  { Icon: ShieldCheck, tint: 'green', title: 'Compra direto na loja oficial', text: 'O convidado finaliza no site do parceiro, com a segurança da própria loja. A gente não processa pagamento.' },
  { Icon: Gift, tint: 'pink', title: 'De graça, sem conta', text: 'Não precisa criar cadastro. Informa o e-mail só pra você gerenciar e ser avisado das compras.' },
]

const OCCASIONS = [
  { Icon: Heart, title: 'Casamento', text: 'Monte o enxoval juntando eletrodomésticos, casa e decoração de várias lojas num link só.' },
  { Icon: Baby, title: 'Chá de bebê', text: 'Fraldas, enxoval e cuidados — com quantidade, pra vários convidados dividirem os itens.' },
  { Icon: Sparkles, title: 'Chá de panela / casa nova', text: 'Do micro-ondas ao jogo de panelas, de lojas diferentes, tudo reunido.' },
  { Icon: Cake, title: 'Aniversário & mêsversário', text: 'Deixe claro o que você realmente quer, sem ganhar presente repetido.' },
  { Icon: Crown, title: '15 anos', text: 'A debutante monta a lista dos sonhos e os convidados escolhem o presente.' },
  { Icon: PawPrint, title: 'Aniversário do pet', text: 'Brinquedos, caminha, petiscos — o niver do bichinho também merece lista.' },
  { Icon: PartyPopper, title: 'Formatura & bodas', text: 'Qualquer ocasião que junta gente pra presentear.' },
  { Icon: Gift, title: 'Amigo secreto', text: 'Cada um marca o que já comprou e ninguém dá a mesma coisa.' },
]

// Decoração festiva do hero (confete + corações) — puramente visual.
const CONFETTI: { top: string; left: string; color: string; rot: number }[] = [
  { top: '6%', left: '2%', color: '#f4b740', rot: 18 },
  { top: '2%', left: '46%', color: '#db2777', rot: -12 },
  { top: '10%', left: '92%', color: '#8b5cf6', rot: 24 },
  { top: '38%', left: '-4%', color: '#14b8a6', rot: -20 },
  { top: '60%', left: '96%', color: '#0a7d3f', rot: 14 },
  { top: '88%', left: '8%', color: '#fb923c', rot: -18 },
  { top: '92%', left: '58%', color: '#db2777', rot: 22 },
  { top: '80%', left: '90%', color: '#f4b740', rot: -10 },
]
const HEARTS: { top: string; left: string; size: number }[] = [
  { top: '20%', left: '-2%', size: 20 },
  { top: '4%', left: '78%', size: 16 },
  { top: '70%', left: '2%', size: 14 },
]

// Marcas reconhecíveis pra faixa — só entra a que estiver ATIVA no
// merchants.json (dado real). Ordem = preferência de reconhecimento.
const BRAND_LABELS: Record<string, string> = {
  nike: 'Nike',
  lg: 'LG',
  motorola: 'Motorola',
  panasonic: 'Panasonic',
  vivara: 'Vivara',
  centauro: 'Centauro',
  lego: 'LEGO',
  oboticario: 'O Boticário',
  loccitane: "L'Occitane",
  diesel: 'Diesel',
  mizuno: 'Mizuno',
  chillibeans: 'Chilli Beans',
  mac: 'MAC',
  kippling: 'Kipling',
  olympikus: 'Olympikus',
  eudora: 'Eudora',
}

export function RegistryLandingPage() {
  const myLists = getMyLists()
  const [totalProducts, setTotalProducts] = useState<number | null>(null)
  const [merchantsCount, setMerchantsCount] = useState<number | null>(null)
  const [brands, setBrands] = useState<string[]>([])
  const [preview, setPreview] = useState<ProductIndexEntry[]>([])

  useEffect(() => {
    fetchMeta().then((m) => setTotalProducts(m.totalProducts)).catch(() => {})
    fetchMerchants()
      .then((list) => {
        setMerchantsCount(list.length)
        const active = new Set(list.map((m) => m.slug))
        setBrands(Object.keys(BRAND_LABELS).filter((s) => active.has(s)).map((s) => BRAND_LABELS[s]))
      })
      .catch(() => {})
    // Card "Sua lista" ilustrativo, porém com produtos REAIS do catálogo.
    fetchHomeHighlights().then((h) => setPreview((h.featured || []).slice(0, 3))).catch(() => {})
  }, [])

  const productsLabel = totalProducts != null ? totalProducts.toLocaleString('pt-BR') : 'milhares de'
  const storesLabel = merchantsCount != null ? merchantsCount.toLocaleString('pt-BR') : 'várias'

  return (
    <div className="page registry-landing">
      <header className="registry-landing__hero">
        <div className="registry-landing__hero-copy">
          <Gift className="registry-landing__hero-icon" size={36} aria-hidden="true" />
          <h1>
            Sua lista de presentes, sem ficar presa a <span className="registry-landing__hl">uma loja só</span>.
          </h1>
          <p>
            Escolha entre <strong>{productsLabel} produtos</strong> de <strong>{storesLabel} lojas parceiras</strong> — das
            marcas que você já conhece — e junte tudo num link só.
          </p>

          <ul className="registry-landing__herostats">
            <li>
              <Store size={18} aria-hidden="true" />
              <span>
                <strong>{storesLabel}</strong> lojas parceiras
              </span>
            </li>
            <li>
              <ShoppingBag size={18} aria-hidden="true" />
              <span>
                <strong>{productsLabel}</strong> produtos
              </span>
            </li>
            <li>
              <ShieldCheck size={18} aria-hidden="true" />
              <span>Compra direto na loja</span>
            </li>
          </ul>

          <div className="registry-landing__cta">
            <Link to="/listas/nova" className="registry-landing__button">
              Criar minha lista grátis →
            </Link>
          </div>
          <p className="registry-landing__note">É de graça, sem cadastro de conta.</p>
        </div>

        <div className="registry-landing__hero-visual" aria-hidden="true">
          <span className="registry-deco registry-deco--blob" />
          {CONFETTI.map((c, i) => (
            <span
              key={`c${i}`}
              className="registry-deco registry-deco--confetti"
              style={{
                top: c.top,
                left: c.left,
                background: c.color,
                ['--rot']: `${c.rot}deg`,
                animationDuration: `${5 + (i % 4) * 0.8}s`,
                animationDelay: `${(i % 5) * 0.5}s`,
              } as React.CSSProperties}
            />
          ))}
          {HEARTS.map((h, i) => (
            <Heart
              key={`h${i}`}
              className="registry-deco registry-deco--heart"
              style={{
                top: h.top,
                left: h.left,
                animationDuration: `${4.5 + i * 0.9}s`,
                animationDelay: `${i * 0.6}s`,
              }}
              size={h.size}
              fill="currentColor"
            />
          ))}
          {preview.length > 0 && (
          <aside className="registry-preview">
            <div className="registry-preview__head">
              <Gift size={18} />
              <span>Sua lista</span>
            </div>
            <ul className="registry-preview__items">
              {preview.map((p, i) => (
                <li key={`${p.merchantSlug}/${p.slug}`} className="registry-preview__item">
                  <img src={p.awImageUrl} alt="" loading="lazy" />
                  <div className="registry-preview__body">
                    <span className="registry-preview__name">{p.productName}</span>
                    <span className="registry-preview__merchant">{p.merchantDisplayName.replace(/ BR$/, '')}</span>
                    <span className="registry-preview__price">{formatPrice(p.searchPrice, p.currency)}</span>
                  </div>
                  <span
                    className={`registry-preview__badge registry-preview__badge--${i === 1 ? 'bought' : 'available'}`}
                  >
                    {i === 1 ? 'Comprado' : 'Disponível'}
                  </span>
                </li>
              ))}
            </ul>
            <div className="registry-preview__foot">
              <CheckCircle2 size={16} />
              <span>Compras confirmadas pela loja parceira</span>
            </div>
          </aside>
          )}
        </div>
      </header>

      {brands.length > 0 && (
        <section className="registry-landing__brands">
          <span className="registry-landing__brands-label">As marcas que você conhece, num lugar só</span>
          <div className="registry-landing__brands-row">
            {brands.map((b) => (
              <span key={b} className="registry-landing__brand">
                {b}
              </span>
            ))}
            <span className="registry-landing__brand registry-landing__brand--more">
              +{merchantsCount != null ? merchantsCount : ''} lojas
            </span>
          </div>
        </section>
      )}

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
        <h2>Por que montar sua lista aqui</h2>
        <div className="registry-landing__why">
          {WHY.map(({ Icon, title, text, tint }) => (
            <div key={title} className="registry-landing__why-card">
              <span className={`registry-landing__why-chip registry-landing__why-chip--${tint}`}>
                <Icon size={20} aria-hidden="true" />
              </span>
              <strong>{title}</strong>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="registry-landing__section">
        <h2>Como funciona</h2>
        <p style={{ textAlign: 'center', margin: '-8px 0 18px' }}>
          <Link to="/como-funciona" className="registry-landing__seelink">Ver o passo a passo interativo →</Link>
        </p>
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
        <h2>Sua lista começa aqui 🎁</h2>
        <p className="registry-landing__bottom-sub">
          Uma lista. {merchantsCount != null ? `${storesLabel} lojas.` : 'Várias lojas.'} Zero presente repetido.
        </p>
        <Link to="/listas/nova" className="registry-landing__button">
          Criar minha lista grátis →
        </Link>
      </section>
    </div>
  )
}
