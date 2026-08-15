// Ferramenta local, rodada UMA VEZ pra obter um refresh_token do YouTube
// (fluxo OAuth "installed app" / loopback). Depois de rodar, o refresh_token
// impresso no terminal vai pro secret YOUTUBE_REFRESH_TOKEN do GitHub Actions
// — nunca fica salvo em arquivo nem versionado. Ver instruções completas em
// docs/youtube-upload-setup.md pra criar o client OAuth antes de rodar isso.
//
// Uso: PowerShell:
//   $env:YOUTUBE_CLIENT_ID = "..."
//   $env:YOUTUBE_CLIENT_SECRET = "..."
//   node scripts/youtube-auth.mjs
import { createServer } from 'node:http'
import { exec } from 'node:child_process'

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    'Erro: defina YOUTUBE_CLIENT_ID e YOUTUBE_CLIENT_SECRET antes de rodar.\n' +
      'PowerShell:\n' +
      '  $env:YOUTUBE_CLIENT_ID = "seu-client-id"\n' +
      '  $env:YOUTUBE_CLIENT_SECRET = "seu-client-secret"'
  )
  process.exit(1)
}

const PORT = 51789
const REDIRECT_URI = `http://127.0.0.1:${PORT}`
const SCOPE = 'https://www.googleapis.com/auth/youtube.upload'

const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
authUrl.searchParams.set('client_id', CLIENT_ID)
authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
authUrl.searchParams.set('response_type', 'code')
authUrl.searchParams.set('scope', SCOPE)
authUrl.searchParams.set('access_type', 'offline')
authUrl.searchParams.set('prompt', 'consent') // força emitir refresh_token mesmo se já autorizou antes

console.log('\nAbra esta URL no navegador (com a conta do YouTube que vai publicar os vídeos)')
console.log('e clique em "Permitir":\n')
console.log(authUrl.toString())
console.log('')

// Tenta abrir o navegador padrão automaticamente — se falhar, o usuário
// copia a URL acima manualmente. Não é automação de login: só abre a aba,
// quem loga e autoriza é o usuário, na própria sessão dele.
exec(`start "" "${authUrl.toString()}"`, () => {})

const server = createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  if (error) {
    res.end('Autorização negada. Pode fechar esta aba e tentar de novo.')
    console.error(`\nErro retornado pelo Google: ${error}`)
    server.close()
    process.exit(1)
  }
  if (!code) {
    res.end('Sem código na resposta. Pode fechar esta aba.')
    return
  }

  res.end('Autorizado! Pode fechar esta aba e voltar pro terminal.')
  server.close()

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  })
  const tokens = await tokenRes.json()

  if (!tokenRes.ok || !tokens.refresh_token) {
    console.error('\nErro trocando o código por tokens:', tokens)
    console.error(
      '\nSe não veio "refresh_token": provavelmente essa conta já autorizou o app antes.\n' +
        'Revogue o acesso em https://myaccount.google.com/permissions e rode de novo.'
    )
    process.exit(1)
  }

  console.log('\n✅ Autorização concluída. Guarde este refresh_token com segurança —')
  console.log('   ele vale como uma senha de acesso à sua conta do YouTube.\n')
  console.log(`YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}\n`)
  console.log('Cole esse valor em GitHub → Settings → Secrets and variables → Actions,')
  console.log('junto com YOUTUBE_CLIENT_ID e YOUTUBE_CLIENT_SECRET. Nunca comite esse valor.')
})

server.listen(PORT)
