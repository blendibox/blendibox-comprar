import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftRight, BookOpen, Gift, Heart, HelpCircle, Home, Menu, Ticket } from './Icon'

const NAV_LINKS = [
  { to: '/', label: 'Início', Icon: Home },
  { to: '/lista-de-presentes', label: 'Presentes', Icon: Gift },
  { to: '/cupons', label: 'Cupons', Icon: Ticket },
  { to: '/favoritos', label: 'Favoritos', Icon: Heart },
  { to: '/comparar', label: 'Comparar', Icon: ArrowLeftRight },
  { to: '/blog', label: 'Blog', Icon: BookOpen },
  { to: '/como-funciona', label: 'Como funciona', Icon: HelpCircle },
]

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="header">
      <div className="header__bar">
        <button
          className="header__menu-btn"
          aria-label="Abrir menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <Menu size={22} />
        </button>
        <Link to="/" className="header__brand">
          Compare <span className="header__brand-accent">Ofertas</span>{' '}
          <span className="header__brand-mark">✱</span>
        </Link>
        <nav className="header__nav header__nav--desktop">
          {NAV_LINKS.map(({ to, label, Icon }) => (
            <Link key={to} to={to}>
              <Icon size={16} strokeWidth={2} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
      </div>
      {menuOpen && (
        <nav className="header__nav header__nav--mobile">
          {NAV_LINKS.map(({ to, label, Icon }) => (
            <Link key={to} to={to} onClick={() => setMenuOpen(false)}>
              <Icon size={16} strokeWidth={2} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
