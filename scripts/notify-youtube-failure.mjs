// Avisa por e-mail (via Resend) quando o step "Publicar vídeo no YouTube"
// falha no deploy.yml. Esse step roda com continue-on-error:true (não pode
// travar o deploy do site por causa do YouTube), o que também significa que
// a falha fica invisível no resumo do Actions — foi assim que o
// YOUTUBE_REFRESH_TOKEN ficou expirado de 31/08 a 14/09/2026 sem ninguém
// perceber. Esse alerta existe só pra isso: avisar no mesmo dia, não 2
// semanas depois.
import { readFile } from 'node:fs/promises'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM = 'Compare Ofertas <ofertas@blendibox.com.br>'
const TO = process.env.ALERT_EMAIL
const LOG_PATH = process.env.YOUTUBE_UPLOAD_LOG || 'youtube-upload.log'

if (!TO) {
  console.error('ALERT_EMAIL não definida — não sei pra quem mandar o alerta. Pulando (sem falhar o job por isso).')
  process.exit(0)
}
if (!RESEND_API_KEY) {
  console.error('RESEND_API_KEY não definida — não consegui mandar o alerta (o erro original já está logado no step anterior).')
  process.exit(0)
}

const errorLog = await readFile(LOG_PATH, 'utf-8').catch(() => '(log não encontrado)')
// Só as últimas linhas — o log completo do npm run upload-video pode ter
// ruído de instalação/etc, o erro de verdade está sempre no final.
const errorTail = errorLog.trim().split('\n').slice(-15).join('\n')

const isTokenError = /invalid_grant/i.test(errorLog)

const subject = isTokenError
  ? 'YouTube: refresh token expirado — vídeo diário parou de publicar'
  : 'YouTube: falha ao publicar o vídeo diário'

const body = `O upload automático do vídeo diário pro YouTube falhou hoje.

Erro registrado:
${errorTail}

${
  isTokenError
    ? `Isso é o refresh token do YouTube expirado ou revogado (erro "invalid_grant") — precisa gerar um novo. Passo a passo:

1. No terminal, na raiz do projeto (blendibox-awin):

   $env:YOUTUBE_CLIENT_ID = "cole-o-client-id-aqui"
   $env:YOUTUBE_CLIENT_SECRET = "cole-o-client-secret-aqui"
   node scripts/youtube-auth.mjs

2. Faça login com a conta dona do canal e clique em Permitir. O terminal imprime o YOUTUBE_REFRESH_TOKEN novo.

3. Confirme que pegou o canal certo:

   node scripts/youtube-whoami.mjs

4. Atualize o secret no GitHub: Settings > Secrets and variables > Actions > YOUTUBE_REFRESH_TOKEN (substitui o valor antigo).

Client ID e Client Secret não precisam ser recriados, só o refresh token. Guia completo em docs/youtube-upload-setup.md.`
    : 'Não é o erro de token conhecido (invalid_grant) — vale olhar o log completo do job no GitHub Actions pra entender a causa.'
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
