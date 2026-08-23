import { Link as RouterLink, type LinkProps } from 'react-router-dom'

// Toda rota gerada estaticamente (scripts/prerender.mjs) tem barra final no
// arquivo/canonical (dist/{rota}/index.html, ${SITE_URL}${routePath}/) —
// sem a barra, o GitHub Pages responde com redirect 301 pra versão com
// barra sempre que o link é aberto fora do SPA (link copiado de um card,
// compartilhado, aberto direto, testado pelo Lighthouse). Dentro do SPA
// isso nunca aparece (React Router casa a rota com ou sem barra), o que
// tornava fácil esquecer a barra espalhado pelos ~20 arquivos que montam
// link interno — daí o wrapper: normaliza sozinho, sem depender de lembrar
// em cada lugar. Substitui todo `import { Link } from 'react-router-dom'`.
function normalizeTo(to: LinkProps['to']): LinkProps['to'] {
  if (typeof to !== 'string') return to
  // Âncora (#topo) ou link puramente de query (raro aqui) não tem "página"
  // própria pra levar barra — deixa como está.
  if (to.startsWith('#')) return to
  const hashIndex = to.indexOf('#')
  const beforeHash = hashIndex === -1 ? to : to.slice(0, hashIndex)
  const hash = hashIndex === -1 ? '' : to.slice(hashIndex)
  const queryIndex = beforeHash.indexOf('?')
  const pathname = queryIndex === -1 ? beforeHash : beforeHash.slice(0, queryIndex)
  const query = queryIndex === -1 ? '' : beforeHash.slice(queryIndex)
  if (!pathname || pathname.endsWith('/')) return to
  return `${pathname}/${query}${hash}`
}

export function Link({ to, ...rest }: LinkProps) {
  return <RouterLink to={normalizeTo(to)} {...rest} />
}
