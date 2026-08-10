import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Check, Copy, Heart, PartyPopper, Search, Trash2, X } from 'lucide-react'
import { fetchIndex, fetchProduct } from '../lib/api'
import { matchesSearch } from '../lib/search'
import { formatPrice } from '../components/ProductCard'
import { RegistrySteps } from '../components/RegistrySteps'
import { useFavorites } from '../context/FavoritesContext'
import type { ProductIndexEntry } from '../types/product'
import {
  addRegistryItem,
  getOwnerToken,
  getRegistry,
  removeRegistryItem,
  type RegistryData,
} from '../lib/registry'

export function RegistryManagePage() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const editToken = params.get('token') || getOwnerToken(id) || ''
  const justCreated = params.get('novo') === '1'

  const [data, setData] = useState<RegistryData | null>(null)
  const [loadError, setLoadError] = useState('')
  const [copied, setCopied] = useState(false)

  const [search, setSearch] = useState('')
  const [index, setIndex] = useState<ProductIndexEntry[] | null>(null)
  const [indexLoading, setIndexLoading] = useState(false)
  const [adding, setAdding] = useState('')
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const { items: favorites, remove: removeFavorite } = useFavorites()
  const [showFavorites, setShowFavorites] = useState(false)

  const shareUrl = `${window.location.origin}/lista/${id}`

  const reload = () => getRegistry(id).then(setData).catch((e) => setLoadError(e.message))

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Índice completo só carrega quando o dono começa a buscar produtos.
  useEffect(() => {
    if (!search.trim() || index || indexLoading) return
    setIndexLoading(true)
    fetchIndex()
      .then(setIndex)
      .catch(() => setIndex([]))
      .finally(() => setIndexLoading(false))
  }, [search, index, indexLoading])

  const results = useMemo(() => {
    if (!search.trim() || !index) return []
    return index
      .filter((p) => matchesSearch([p.productName, p.merchantDisplayName, p.categorySlug], search))
      .slice(0, 24)
  }, [index, search])

  const addedKeys = useMemo(
    () => new Set((data?.items || []).map((i) => `${i.merchantSlug}/${i.slug}`)),
    [data]
  )

  // Genérico — usado tanto pela busca quanto pelos favoritos. O deeplink de
  // afiliado só existe no JSON completo do produto (o índice leve não traz),
  // então busca só na hora de adicionar.
  const addProduct = async (
    entry: { merchantSlug: string; slug: string; name: string; image: string | null; price: number | null },
    quantity = 1
  ) => {
    setAdding(`${entry.merchantSlug}/${entry.slug}`)
    try {
      const full = await fetchProduct(entry.merchantSlug, entry.slug)
      await addRegistryItem(id, editToken, {
        merchantSlug: entry.merchantSlug,
        slug: entry.slug,
        name: entry.name,
        image: entry.image,
        price: entry.price,
        deeplink: full.awDeepLink,
        quantity,
      })
      await reload()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao adicionar')
    } finally {
      setAdding('')
    }
  }

  const remove = async (itemId: string) => {
    try {
      await removeRegistryItem(id, itemId, editToken)
      await reload()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao remover')
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard indisponível — o link fica visível pra copiar manual
    }
  }

  if (loadError) return <div className="page"><p className="status status--error">{loadError}</p></div>
  if (!data) return <div className="page"><p className="status">Carregando...</p></div>
  if (!editToken) {
    return (
      <div className="page">
        <p className="status status--error">
          Link de gestão sem token. Abra o link que você recebeu ao criar a lista.
        </p>
      </div>
    )
  }

  return (
    <div className="page registry-page">
      {justCreated ? (
        <header className="registry-success">
          <PartyPopper className="registry-success__icon" size={38} aria-hidden="true" />
          <h1>Sua lista está pronta!</h1>
          <p>{data.registry.title} — agora adicione os presentes e compartilhe o link.</p>
        </header>
      ) : (
        <header className="registry-manage__header">
          <h1>{data.registry.title}</h1>
          <p className="page__meta">Gestão da lista · {data.items.length} itens</p>
        </header>
      )}

      <RegistrySteps current={2} />

      {data.items.length > 0 && (
        <div className="registry-dashboard">
          <span>
            <strong>{data.items.filter((i) => i.status === 'comprado').length}</strong> de {data.items.length} presentes
            recebidos
          </span>
          {(() => {
            const boughtValue = data.items.reduce((sum, i) => sum + (i.price || 0) * i.purchasedCount, 0)
            return boughtValue > 0 ? (
              <span>
                <strong>{formatPrice(boughtValue, 'BRL')}</strong> em presentes comprados
              </span>
            ) : null
          })()}
        </div>
      )}

      <div className="registry-share">
        <span className="registry-share__label">Link pra compartilhar com os convidados:</span>
        <div className="registry-share__row">
          <input readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
          <button type="button" onClick={copyLink} className="registry-share__copy">
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
      </div>

      <section className="registry-add">
        <h2>Adicionar presentes</h2>
        <div className="registry-add__search">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto pra adicionar..."
          />
        </div>
        {indexLoading && <p className="status">Carregando catálogo...</p>}
        {search.trim() && !indexLoading && results.length === 0 && (
          <p className="status">Nenhum produto encontrado.</p>
        )}
        {results.length > 0 && (
          <div className="registry-results">
            {results.map((p) => {
              const key = `${p.merchantSlug}/${p.slug}`
              const already = addedKeys.has(key)
              return (
                <div key={key} className="registry-result">
                  <img src={p.awImageUrl} alt="" loading="lazy" />
                  <div className="registry-result__body">
                    <span className="registry-result__merchant">{p.merchantDisplayName}</span>
                    <span className="registry-result__name">{p.productName}</span>
                    <span className="registry-result__price">{formatPrice(p.searchPrice, p.currency)}</span>
                  </div>
                  {!already && (
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={quantities[key] ?? 1}
                      onChange={(e) =>
                        setQuantities((q) => ({ ...q, [key]: Math.max(1, Math.min(99, Number(e.target.value) || 1)) }))
                      }
                      className="registry-result__qty"
                      aria-label="Quantidade"
                      title="Quantidade"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      addProduct(
                        { merchantSlug: p.merchantSlug, slug: p.slug, name: p.productName, image: p.awImageUrl, price: p.searchPrice },
                        quantities[key] || 1
                      )
                    }
                    disabled={already || adding === key}
                    className="registry-result__add"
                  >
                    {already ? 'Já na lista' : adding === key ? 'Adicionando...' : 'Adicionar'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {favorites.length > 0 && (
        <section className="registry-add">
          <button
            type="button"
            className="registry-fav-toggle"
            onClick={() => setShowFavorites((v) => !v)}
            aria-expanded={showFavorites}
          >
            <Heart size={16} aria-hidden="true" /> Carregar meus favoritos ({favorites.length})
          </button>
          {showFavorites && (
            <div className="registry-results">
              {favorites.map((f) => {
                const key = `${f.merchantSlug}/${f.slug}`
                const already = addedKeys.has(key)
                return (
                  <div key={key} className="registry-result">
                    <img src={f.awImageUrl} alt="" loading="lazy" />
                    <div className="registry-result__body">
                      <span className="registry-result__merchant">{f.merchantDisplayName}</span>
                      <span className="registry-result__name">{f.productName}</span>
                      <span className="registry-result__price">{formatPrice(f.searchPrice, f.currency)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        addProduct({
                          merchantSlug: f.merchantSlug,
                          slug: f.slug,
                          name: f.productName,
                          image: f.awImageUrl,
                          price: f.searchPrice,
                        })
                      }
                      disabled={already || adding === key}
                      className="registry-result__add"
                    >
                      {already ? 'Já na lista' : adding === key ? 'Adicionando...' : 'Adicionar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFavorite(f.merchantSlug, f.slug)}
                      className="registry-result__remove"
                      aria-label="Remover dos favoritos"
                      title="Remover dos favoritos"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      <section className="registry-add">
        <h2>Itens da lista</h2>
        {data.items.length === 0 ? (
          <p className="status">Nenhum item ainda — busque acima pra adicionar.</p>
        ) : (
          <div className="registry-results">
            {data.items.map((it) => (
              <div key={it.id} className="registry-result">
                {it.image && <img src={it.image} alt="" loading="lazy" />}
                <div className="registry-result__body">
                  <span className="registry-result__name">{it.name}</span>
                  <span className="registry-result__price">
                    {formatPrice(it.price, 'BRL')}
                    {it.quantity > 1 ? (
                      <span className={`registry-tag ${it.status === 'comprado' ? 'registry-tag--bought' : 'registry-tag--interest'}`}>
                        {' · '}
                        {it.purchasedCount} de {it.quantity} comprados
                      </span>
                    ) : (
                      <>
                        {it.status === 'comprado' && <span className="registry-tag registry-tag--bought"> · já comprado</span>}
                        {it.status === 'interesse' && <span className="registry-tag registry-tag--interest"> · alguém demonstrou interesse</span>}
                      </>
                    )}
                  </span>
                </div>
                <button type="button" onClick={() => remove(it.id)} className="registry-result__remove" aria-label="Remover item">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="registry-form__note">
        Guarde este link de gestão — é só por ele que você edita a lista. A página pública fica em{' '}
        <Link to={`/lista/${id}`}>/lista/{id}</Link>.
      </p>
    </div>
  )
}
