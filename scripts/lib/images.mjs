// A proxy de imagem images2.productserve.com (usada por vários lojistas —
// Mizuno, Nike, Centauro etc.) serve o tamanho pedido nos parâmetros w/h da
// própria URL, geralmente 200x200 — pequeno demais pro Google Merchant
// (exige ≥500x500px) e mais baixa resolução do que precisa no site. Trocar
// só esses dois parâmetros pega a mesma imagem em resolução maior, sem
// depender de o lojista ter uma coluna de imagem grande separada no feed.
export function upsizeProductServeImage(url, size = 500) {
  if (!url || !url.includes('images2.productserve.com')) return url
  return url.replace(/([?&]w=)\d+/, `$1${size}`).replace(/([?&]h=)\d+/, `$1${size}`)
}

// Alguns lojistas da Awin mandam um GIF placeholder (ex:
// images2.productserve.com/noimage.gif) em vez de deixar o campo vazio
// quando não têm foto real do produto — pior que vazio, porque passa
// despercebido nas checagens de "campo ausente".
const NO_IMAGE_PATTERN = /noimage/i

export function isRealImageUrl(url) {
  return Boolean(url) && !NO_IMAGE_PATTERN.test(url)
}

// Ordem de preferência ao escolher a imagem principal: campos "primários"
// primeiro, depois as alternativas do feed, deixando large_image por último
// (ela existe principalmente pro Google Merchant, mas serve como fallback
// aqui também). Retorna a primeira URL real encontrada, ou null se todas as
// opções forem vazias/placeholder.
const IMAGE_FALLBACK_FIELDS = [
  'awImageUrl',
  'merchantImageUrl',
  'alternateImage',
  'alternateImageTwo',
  'alternateImageThree',
  'alternateImageFour',
  'awThumbUrl',
  'largeImage',
]

// Mesma ordem de fallback, mas retorna a lista inteira de candidatos válidos
// por string (não só o primeiro) — usado quando é preciso testar mais de um
// ao vivo (ver verifyImageUrl) em vez de confiar no primeiro.
export function getRealImageCandidates(product) {
  return IMAGE_FALLBACK_FIELDS.map((field) => product[field]).filter(isRealImageUrl)
}

export function pickRealImage(product) {
  return getRealImageCandidates(product)[0] ?? null
}

// A checagem por string (isRealImageUrl) não pega todo caso: a proxy
// images2.productserve.com responde HTTP 200 mesmo quando a imagem de
// origem está quebrada — ela redireciona (302) pra /noimage.gif, então a URL
// requisitada continua "normal" na CSV, só o destino final do redirect
// revela o problema. Campos que não passam pela proxy também podem estar
// quebrados (link morto, 404) — mesma checagem serve pros dois casos, só o
// critério de "quebrado" muda (redirect pra noimage.gif vs. status de erro).
// Só dá pra descobrir isso fazendo a requisição de verdade — caro demais pra
// rodar no catálogo inteiro, então é usado só nos merchants marcados com
// "verifyImages" em merchants.config.json.
const VERIFY_TIMEOUT_MS = 6000

async function fetchImageStatus(url, timeoutMs) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    // Sem User-Agent, alguns CDNs/WAFs jogam a requisição num caminho mais
    // lento (rate limit/challenge) em vez de responder rápido como fazem pra
    // tráfego de navegador de verdade — imita um browser real pra evitar isso.
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    })
    if (!res.ok) return { ok: false, reason: 'http-error' }
    return res.url.includes('noimage.gif') ? { ok: false, reason: 'broken' } : { ok: true, reason: 'real' }
  } catch (err) {
    return { ok: false, reason: err?.name === 'AbortError' ? 'timeout' : 'error' }
  } finally {
    clearTimeout(timeout)
  }
}

// Retorna um motivo (não só true/false) pra dar visibilidade real do que
// aconteceu. Testado contra dados reais (AMOBELEZA): tratar timeout como
// "assume real" mascarava imagem de verdade quebrada — o servidor de origem
// de uma foto quebrada às vezes demora pra responder o redirect em vez de
// falhar rápido, então timeout correlaciona com quebrado, não com sorte de
// rede. Por isso timeout/erro conta como falha (tenta o próximo candidato,
// ou descarta o produto se for o último) — só dá uma segunda chance com o
// dobro do tempo antes de desistir, pra não derrubar um produto bom só por
// uma lentidão pontual da nossa própria conexão.
export async function verifyImageUrl(url, timeoutMs = VERIFY_TIMEOUT_MS) {
  if (!url) return { ok: false, reason: 'empty' }
  const first = await fetchImageStatus(url, timeoutMs)
  if (first.reason !== 'timeout' && first.reason !== 'error') return first
  return fetchImageStatus(url, timeoutMs * 2)
}

// Roda `fn` sobre `items` com no máximo `limit` chamadas em paralelo — usado
// pra verificação ao vivo de imagens sem abrir milhares de conexões de uma vez.
export async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}
