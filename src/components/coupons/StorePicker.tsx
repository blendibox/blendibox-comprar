import { useEffect, useMemo, useRef, useState } from 'react'
import { searchStores, type CouponItem, type StoreSummary } from '../../lib/coupons'
import { MerchantLogo } from '../MerchantLogo'
import { ChevronDown, Search, Store, X } from '../Icon'

// Seletor de loja com busca própria: digite o nome da loja, um produto
// ("cafeteira") ou o valor do desconto ("20%", "R$60") e ele mostra quais lojas
// têm aquilo e quantos itens. No celular abre como folha de baixo.
export function StorePicker({
  stores,
  pool,
  value,
  currentTerm,
  onSelect,
}: {
  stores: StoreSummary[]
  // itens já filtrados por tipo/categoria (null enquanto carregam)
  pool: CouponItem[] | null
  value: string
  currentTerm: string
  // term = busca que a página deve passar a usar depois da escolha
  onSelect: (slug: string, term: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const buttonRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const selected = stores.find((s) => s.slug === value)

  function close() {
    setOpen(false)
    setQuery('')
    buttonRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // no celular não abre o teclado sozinho (ele esconderia a lista)
    if (window.matchMedia('(pointer: fine)').matches) inputRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
    // close só usa setters e ref estáveis
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const searching = Boolean(query.trim())
  // Sem texto aqui, os números respeitam a busca principal da página.
  const results = useMemo(() => (open && pool ? searchStores(pool, query.trim() || currentTerm) : []), [open, pool, query, currentTerm])

  function choose(slug: string, nameMatches: boolean, matches: number) {
    // Digitou aqui e achou pelo conteúdo (produto/valor): a busca da página passa a
    // ser essa. Digitou o nome da loja: limpa a busca. Sem digitar aqui: mantém a
    // busca principal (a lista já só mostra lojas que têm algo com ela).
    let term = currentTerm
    if (searching && !nameMatches) term = query.trim()
    else if (searching || matches === 0) term = ''
    onSelect(slug, term)
    close()
  }

  return (
    <div className="coupons-store">
      <button ref={buttonRef} type="button" className={`coupons-store__button${selected ? ' coupons-store__button--active' : ''}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        <Store size={15} aria-hidden="true" />
        <span>{selected ? selected.name : 'Lojas'}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>

      {open && (
        <div className="store-picker" onClick={(e) => e.target === e.currentTarget && close()}>
          <div className="store-picker__panel" role="dialog" aria-modal="true" aria-label="Escolher loja">
            <div className="store-picker__head">
              <strong>Escolher loja</strong>
              <button type="button" onClick={close} aria-label="Fechar">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="coupons-search store-picker__search">
              <Search size={17} aria-hidden="true" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Loja, produto, código ou desconto %"
                aria-label="Buscar loja por nome, produto ou valor do desconto"
              />
            </div>
            <ul className="store-picker__list">
              {!searching && (
                <li>
                  <button type="button" aria-current={!value} onClick={() => choose('', true, 1)}>
                    <span className="store-picker__name">Todas as lojas</span>
                  </button>
                </li>
              )}
              {results.map((s) => (
                <li key={s.slug}>
                  <button type="button" aria-current={value === s.slug} onClick={() => choose(s.slug, s.nameMatches, s.matches)}>
                    <MerchantLogo merchantId={s.merchantId} displayName="" className="store-picker__logo" />
                    <span className="store-picker__name">{s.name}</span>
                    <span className="store-picker__info">
                      {searching && !s.nameMatches
                        ? `${s.matches} com “${query.trim()}”`
                        : `${s.matches} ${s.matches === 1 ? 'item' : 'itens'}${s.withCode ? ` · ${s.withCode} ${s.withCode === 1 ? 'cupom' : 'cupons'}` : ''}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {!pool && <p className="status">Carregando cupons...</p>}
            {pool && results.length === 0 && searching && <p className="status">{`Nenhuma loja com “${query.trim()}”.`}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
