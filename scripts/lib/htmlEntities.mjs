// Decodifica entidades HTML que alguns anunciantes (ex: Kabum) mandam cru
// no texto do feed — ex: "Incompar&aacute;veis" em vez de "Incomparáveis".
// Cobre o conjunto Latin-1 (acentos/cedilha usados em pt-BR) + as 5
// entidades XML básicas + entidade numérica (&#123; e &#x7B;). Não é uma
// tabela HTML5 completa (~2000 entradas) de propósito — isso aqui cobre o
// que realmente aparece em texto de produto em português.
const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  Aacute: 'Á', aacute: 'á',
  Agrave: 'À', agrave: 'à',
  Acirc: 'Â', acirc: 'â',
  Atilde: 'Ã', atilde: 'ã',
  Auml: 'Ä', auml: 'ä',
  Aring: 'Å', aring: 'å',
  AElig: 'Æ', aelig: 'æ',
  Ccedil: 'Ç', ccedil: 'ç',
  Eacute: 'É', eacute: 'é',
  Egrave: 'È', egrave: 'è',
  Ecirc: 'Ê', ecirc: 'ê',
  Euml: 'Ë', euml: 'ë',
  Iacute: 'Í', iacute: 'í',
  Igrave: 'Ì', igrave: 'ì',
  Icirc: 'Î', icirc: 'î',
  Iuml: 'Ï', iuml: 'ï',
  Ntilde: 'Ñ', ntilde: 'ñ',
  Oacute: 'Ó', oacute: 'ó',
  Ograve: 'Ò', ograve: 'ò',
  Ocirc: 'Ô', ocirc: 'ô',
  Otilde: 'Õ', otilde: 'õ',
  Ouml: 'Ö', ouml: 'ö',
  Oslash: 'Ø', oslash: 'ø',
  Uacute: 'Ú', uacute: 'ú',
  Ugrave: 'Ù', ugrave: 'ù',
  Ucirc: 'Û', ucirc: 'û',
  Uuml: 'Ü', uuml: 'ü',
  Yacute: 'Ý', yacute: 'ý', yuml: 'ÿ',
  szlig: 'ß',
  ordm: 'º', ordf: 'ª',
  deg: '°',
  trade: '™', copy: '©', reg: '®',
  hellip: '…', ndash: '–', mdash: '—',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
}

const ENTITY_PATTERN = /&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g

export function decodeHtmlEntities(text) {
  if (typeof text !== 'string' || !text.includes('&')) return text
  return text.replace(ENTITY_PATTERN, (match, code) => {
    if (code[0] === '#') {
      const codePoint = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match
    }
    return NAMED_ENTITIES[code] ?? match
  })
}
