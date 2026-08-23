import type { SVGProps } from 'react'

// Contraparte client-side de scripts/generate-icon-sprite.mjs (aquele roda
// no build, gera public/icons-sprite.svg com o path completo de cada ícone
// UMA vez só) — aqui cada ícone é só uma referência <use> pro símbolo
// correspondente nesse arquivo, ~215 bytes por uso em vez dos ~300-500 bytes
// de um SVG completo do lucide-react repetido a cada ocorrência. Antes, uma
// página de produto sozinha somava 41 usos de ícone, 15,5KB (33% do peso da
// página) — nas 145 mil páginas do catálogo, isso é o que pesava no deploy.
//
// fill/stroke/stroke-width/stroke-linecap/stroke-linejoin default NÃO viram
// atributo aqui — ficam só na classe .lucide (src/index.css), repetida uma
// vez só no CSS em vez de 5 atributos em cada um dos 41 usos por página.
// Quando um caller passa fill/strokeWidth diferente do padrão (ex: coração
// preenchido, estrela sem contorno), isso vira style inline, não atributo —
// atributo de apresentação SVG perde pra QUALQUER regra CSS externa
// (prioridade mais baixa da cascata), então só style garante que o valor
// customizado realmente vence a classe .lucide.
//
// Mesma API de props que os componentes reais do lucide-react (size,
// strokeWidth, fill, className, aria-*) — trocar o import de 'lucide-react'
// pra daqui não muda nenhuma chamada existente. Lista de nomes mantida em
// sincronia manual com scripts/lib/iconNames.mjs — ao usar um ícone novo,
// adicione a factory abaixo E na outra lista, depois rode
// "npm run generate-icon-sprite".
interface IconShimProps extends Omit<SVGProps<SVGSVGElement>, 'strokeWidth' | 'fill'> {
  size?: number | string
  strokeWidth?: number | string
  fill?: string
}

function makeIcon(kebabName: string) {
  const href = `/icons-sprite.svg#lucide-${kebabName}`
  function IconShim({ size = 24, strokeWidth, fill, className, style, ...rest }: IconShimProps) {
    const overrideStyle =
      strokeWidth != null || fill != null || style
        ? { ...(strokeWidth != null ? { strokeWidth } : null), ...(fill != null ? { fill } : null), ...style }
        : undefined
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        className={className ? `lucide ${className}` : 'lucide'}
        style={overrideStyle}
        {...rest}
      >
        <use href={href} />
      </svg>
    )
  }
  return IconShim
}

export const ArrowLeftRight = makeIcon('arrow-left-right')
export const Baby = makeIcon('baby')
export const BadgeCheck = makeIcon('badge-check')
export const Bell = makeIcon('bell')
export const BookOpen = makeIcon('book-open')
export const Cake = makeIcon('cake')
export const CalendarDays = makeIcon('calendar-days')
export const Check = makeIcon('check')
export const CheckCircle2 = makeIcon('check-circle-2')
export const ChevronDown = makeIcon('chevron-down')
export const ChevronLeft = makeIcon('chevron-left')
export const ChevronRight = makeIcon('chevron-right')
export const Clock = makeIcon('clock')
export const Copy = makeIcon('copy')
export const Crown = makeIcon('crown')
export const Flame = makeIcon('flame')
export const Gift = makeIcon('gift')
export const Heart = makeIcon('heart')
export const HelpCircle = makeIcon('help-circle')
export const Home = makeIcon('home')
export const Info = makeIcon('info')
export const Link2 = makeIcon('link-2')
export const Lock = makeIcon('lock')
export const Mail = makeIcon('mail')
export const Menu = makeIcon('menu')
export const MessageCircle = makeIcon('message-circle')
export const PartyPopper = makeIcon('party-popper')
export const PawPrint = makeIcon('paw-print')
export const Percent = makeIcon('percent')
export const Play = makeIcon('play')
export const Plus = makeIcon('plus')
export const RefreshCw = makeIcon('refresh-cw')
export const Search = makeIcon('search')
export const Send = makeIcon('send')
export const Share2 = makeIcon('share-2')
export const ShieldCheck = makeIcon('shield-check')
export const Shirt = makeIcon('shirt')
export const ShoppingBag = makeIcon('shopping-bag')
export const Sparkles = makeIcon('sparkles')
export const Star = makeIcon('star')
export const Store = makeIcon('store')
export const Tag = makeIcon('tag')
export const Ticket = makeIcon('ticket')
export const Trash2 = makeIcon('trash-2')
export const TrendingDown = makeIcon('trending-down')
export const TrendingUp = makeIcon('trending-up')
export const X = makeIcon('x')
