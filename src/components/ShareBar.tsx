import { useEffect, useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'

// Barra de compartilhamento do blog: visível, com link funcional de verdade
// pra cada rede (não só ícone decorativo) + compartilhamento nativo no
// celular quando o navegador suporta, + copiar link com feedback visual.
export function ShareBar({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false)
  // Começa sempre false (igual ao servidor, que não tem `navigator.share`) e
  // só liga depois de montado — decidir isso direto no render fazia o HTML
  // do cliente (em celulares com suporte) divergir do HTML pré-renderizado
  // no servidor e disparar erro de hidratação (#425).
  const [canNativeShare, setCanNativeShare] = useState(false)

  useEffect(() => {
    setCanNativeShare(typeof navigator.share === 'function')
  }, [])

  const encodedUrl = encodeURIComponent(url)
  const encodedText = encodeURIComponent(title)

  const links = [
    { key: 'wa', label: 'WhatsApp', href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`, cls: 'share-bar__btn--wa' },
    { key: 'fb', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, cls: 'share-bar__btn--fb' },
    { key: 'x', label: 'X', href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, cls: 'share-bar__btn--x' },
    { key: 'li', label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, cls: 'share-bar__btn--li' },
  ]

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard indisponível — os outros botões seguem funcionando normalmente
    }
  }

  const nativeShare = () => {
    navigator.share({ title, url }).catch(() => {})
  }

  return (
    <div className="share-bar">
      <span className="share-bar__label">
        <Share2 size={14} aria-hidden="true" /> Compartilhe
      </span>
      <div className="share-bar__buttons">
        {canNativeShare && (
          <button type="button" className="share-bar__btn share-bar__btn--native" onClick={nativeShare}>
            <Share2 size={13} aria-hidden="true" /> Compartilhar
          </button>
        )}
        {links.map((l) => (
          <a key={l.key} href={l.href} target="_blank" rel="noopener noreferrer" className={`share-bar__btn ${l.cls}`}>
            {l.label}
          </a>
        ))}
        <button type="button" className="share-bar__btn share-bar__btn--copy" onClick={copyLink}>
          {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
          {copied ? 'Copiado!' : 'Copiar link'}
        </button>
      </div>
    </div>
  )
}
