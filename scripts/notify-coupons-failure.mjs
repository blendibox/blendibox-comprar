// Avisa por e-mail (via Resend) quando os cupons do dia NÃO vieram da API de
// promoções da Awin. O scripts/fetch-coupons.mjs não derruba mais o build nesse
// caso (republica os cupons do último build bom e segue), o que também significa
// que o problema não aparece como "run falhou" — este alerta existe pra isso.
// Mesmo padrão do notify-youtube-failure.mjs.
//
// Lê o arquivo-sinal .coupons-stale.json que o fetch-coupons.mjs deixa na raiz.
import { readFile } from 'node:fs/promises'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM = 'Compare Ofertas <ofertas@blendibox.com.br>'
const TO = process.env.ALERT_EMAIL
const FLAG_PATH = process.env.COUPONS_STALE_FLAG || '.coupons-stale.json'

if (!TO) {
  console.error('ALERT_EMAIL não definida — não sei pra quem mandar o alerta. Pulando (sem falhar o job por isso).')
  process.exit(0)
}
if (!RESEND_API_KEY) {
  console.error('RESEND_API_KEY não definida — não consegui mandar o alerta (o erro já está na anotação do run).')
  process.exit(0)
}

const info = await readFile(FLAG_PATH, 'utf-8').then(JSON.parse).catch(() => null)
if (!info) {
  console.log('Sem .coupons-stale.json — nada a avisar.')
  process.exit(0)
}

const subject = info.tokenProblem
  ? 'Awin: token de API recusado — cupons do site ficaram desatualizados'
  : 'Awin: falha ao buscar os cupons de hoje'

const keptLine = info.usedLastPublished
  ? `O site foi publicado normalmente com os ${info.coupons} cupons do último build bom (os vencidos foram removidos).`
  : 'O site foi publicado sem cupons (não consegui nem os do último build).'

const body = `A API de promoções da Awin falhou no build de hoje.

Erro: ${info.reason}
${keptLine}
O catálogo, os preços e o resto do deploy NÃO foram afetados.

${
  info.tokenProblem
    ? `Isso é o token da API da Awin (AWIN_PROMOTIONS_TOKEN) recusado — expirado, revogado ou invalidado numa manutenção da Awin. Passo a passo:

1. Entre em ui.awin.com e, no aviso do Painel ("generate a new token") ou em Conta > API credentials, gere/copie um token novo (precisa ser Admin da conta).

2. No terminal, na raiz do projeto (blendibox-awin), atualize o secret — ele pede o valor, não cole o token em chat/e-mail/código (o repositório é público):

   gh secret set AWIN_PROMOTIONS_TOKEN

3. Rode o deploy de novo (Actions > Deploy > Run workflow) ou espere o próximo agendado.

O mesmo token alimenta os "comprado recentemente" da home (API de Transações): enquanto ele estiver ruim, esse bloco fica com os dados do último build.`
    : 'Não parece ser o token (não foi 401/403) — pode ser instabilidade da Awin; se repetir amanhã, vale olhar o log do job no GitHub Actions.'
}

— Compare Ofertas (aviso automático)`

const res = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ from: FROM, to: TO, subject: `⚠️ ${subject}`, text: body }),
})
if (!res.ok) {
  console.error(`Falha mandando o alerta por e-mail: HTTP ${res.status} ${await res.text()}`)
  process.exit(0)
}
console.log(`Alerta enviado pra ${TO}.`)
