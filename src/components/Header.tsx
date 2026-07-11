import { useState } from 'react'
import { Link } from 'react-router-dom'

const NAV_LINKS = [
  { to: '/', label: 'Início' },
  { to: '/cupons', label: 'Cupons' },
  { to: '/comparar', label: 'Comparar' },
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
          ☰
        </button>
        <Link to="/" className="header__brand">
          Compare Ofertas <span className="header__brand-mark">✱</span>
        </Link>
        <nav className="header__nav header__nav--desktop">
          {NAV_LINKS.map((link) => (
            <Link key={link.to} to={link.to}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      {menuOpen && (
        <nav className="header__nav header__nav--mobile">
          {NAV_LINKS.map((link) => (
            <Link key={link.to} to={link.to} onClick={() => setMenuOpen(false)}>
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
