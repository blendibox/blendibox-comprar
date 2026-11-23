// Avisa por e-mail (via Resend) quando o deploy foi publicado com o ÚLTIMO catálogo
// porque o feed de produtos da Awin não pôde ser usado hoje. Como o build segue e
// termina verde, sem este aviso o problema só apareceria numa anotação amarela do
// run. Mesmo padrão do notify-coupons-failure.mjs.
//
// Lê o arquivo-sinal .feed-fallback.json deixado por scripts/check-feed-fallback.mjs.
import { readFile } from 'node:fs/promises'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM = 'Compare Ofertas <ofertas@blendibox.com.br>'
const TO = process.env.ALERT_EMAIL
const FLAG_PATH = process.env.FEED_FALLBACK_FLAG || '.feed-fallback.json'

if (!TO) {
  console.error('ALERT_EMAIL não definida — não sei pra quem mandar o alerta. Pulando (sem falhar o job por isso).')
  process.exit(0)
}
if (!RESEND_API_KEY) {
  console.error('RESEND_API_KEY não definida — não consegui mandar o alerta (o aviso já está na anotação do run).')
  process.exit(0)
}

const info = await readFile(FLAG_PATH, 'utf-8').then(JSON.parse).catch(() => null)
if (!info) {
  console.log('Sem .feed-fallback.json — nada a avisar.')
  process.exit(0)
}

const catalogDate = new Date(info.catalogGeneratedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

const body = `O feed de produtos da Awin não pôde ser usado no build de hoje.

Motivo: ${info.reason}

O site FOI publicado, com o último catálogo bom (${catalogDate}, cerca de ${info.ageHours} h atrás). O rodapé mostra essa data em "Atualizado há X h".
Preços e estoque podem estar defasados enquanto isso durar. O vídeo diário, o YouTube e o Telegram foram pulados nesta rodada, pra não repostar ofertas velhas como se fossem de hoje.

Não precisa fazer nada: o próximo build (agendado todo dia) tenta o feed de novo e volta ao normal sozinho. Se o feed ficar fora por mais de ${info.maxDays} dias, o build passa a FALHAR de propósito, pra não publicar preço velho demais — aí vale olhar o status da Awin e o log do job no GitHub Actions.

— Compare Ofertas (aviso automático)`

const res = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ from: FROM, to: TO, subject: '⚠️ Awin: feed fora do ar — site publicado com o catálogo anterior', text: body }),
})
if (!res.ok) {
  console.error(`Falha mandando o alerta por e-mail: HTTP ${res.status} ${await res.text()}`)
  process.exit(0)
}
console.log(`Alerta enviado pra ${TO}.`)
