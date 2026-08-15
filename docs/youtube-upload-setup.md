# Upload automático no YouTube — configuração

Passo a passo pra criar as credenciais OAuth que `scripts/youtube-auth.mjs` e
`scripts/upload-daily-video.mjs` usam pra publicar o `daily-video.mp4` (ver
`scripts/generate-daily-video.mjs`) sem depender de login manual todo dia.

> Essa parte precisa ser feita por você, na sua própria conta Google — é
> onde mora a autorização de publicar vídeos no seu canal.

---

## 1. Criar o projeto e ativar a API

1. Acesse https://console.cloud.google.com/ e crie um projeto novo (ou use
   um existente) — ex: "Compare Ofertas".
2. No menu, vá em **APIs e serviços → Biblioteca**, procure
   **YouTube Data API v3** e clique em **Ativar**.

## 2. Configurar a tela de consentimento OAuth

1. **APIs e serviços → Tela de permissão OAuth**.
2. Tipo de usuário: **Externo**.
3. Preencha nome do app ("Compare Ofertas"), e-mail de suporte e e-mail de
   contato do desenvolvedor (pode ser o mesmo e-mail).
4. Em **Escopos**, adicione `https://www.googleapis.com/auth/youtube.upload`.
5. Em **Usuários de teste**, adicione o e-mail da conta Google dona do canal
   do YouTube (a mesma que vai publicar os vídeos).
6. Salve e, na tela de status do app, clique em **Publicar app** (status
   "Em produção"). Isso evita um problema chato: enquanto o app fica em
   "Teste", o Google expira o refresh token a cada 7 dias — inviável pra
   automação diária. Publicado, o token não expira sozinho (só se ficar 6
   meses sem uso, ou se você revogar o acesso).
   - Como o app não passa pela revisão completa do Google (não precisa,
     pra uso pessoal), a tela de login vai mostrar um aviso "app não
     verificado". Isso é esperado — clique em **Avançado → Acessar
     Compare Ofertas (não seguro)** pra continuar. É a sua própria conta
     autorizando o seu próprio app, não é risco de terceiro.

## 3. Criar as credenciais OAuth

1. **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**.
2. Tipo de aplicativo: **App para computador** (Desktop app).
3. Nome: "Compare Ofertas — upload script".
4. Copie o **Client ID** e o **Client secret** gerados — vai precisar deles
   no próximo passo.

## 4. Gerar o refresh token (uma vez só, localmente)

No terminal, na raiz do projeto:

```powershell
$env:YOUTUBE_CLIENT_ID = "cole-o-client-id-aqui"
$env:YOUTUBE_CLIENT_SECRET = "cole-o-client-secret-aqui"
node scripts/youtube-auth.mjs
```

O script abre uma aba no navegador — faça login com a conta dona do canal e
clique em **Permitir**. O terminal imprime o `YOUTUBE_REFRESH_TOKEN`.

> **Conta Google com vários canais?** O Google *não* deixa você escolher o
> canal no meio desse fluxo — o token fica associado ao "canal padrão" da
> conta na hora da autorização. Se você já tinha autorizado esse app antes
> (mesmo que pra testar), revogue o acesso em
> https://myaccount.google.com/permissions (procure "Compare Ofertas —
> upload script") antes de rodar `youtube-auth.mjs` de novo — assim você
> força o Google a te deixar escolher o canal correto na tela de consulta.
> Depois, **antes de publicar de verdade**, confirme qual canal o token
> pegou:
> ```powershell
> node scripts/youtube-whoami.mjs
> ```
> Esse comando só lê, não publica nada — mostra o nome e o ID do canal
> autorizado. Se não bater com o canal que você queria, troque o canal
> padrão em https://www.youtube.com/account_advanced (ou gerencie qual
> canal está ativo em https://myaccount.google.com/) e repita o passo 4.

## 5. Guardar os três segredos

- **Local** (pra testar com `node scripts/upload-daily-video.mjs`):
  ```powershell
  $env:YOUTUBE_CLIENT_ID = "..."
  $env:YOUTUBE_CLIENT_SECRET = "..."
  $env:YOUTUBE_REFRESH_TOKEN = "..."
  ```
- **GitHub Actions**: repositório → **Settings → Secrets and variables →
  Actions → New repository secret**. Crie os três: `YOUTUBE_CLIENT_ID`,
  `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`.

Nenhum desses valores deve ir pro código ou ser colado no chat — são
equivalentes a uma senha da sua conta do YouTube.

## 6. Testar o upload

Por padrão o vídeo sobe como **"private"** (só você vê), pra revisar antes
de publicar de verdade:

```powershell
node scripts/generate-daily-video.mjs
node scripts/upload-daily-video.mjs
```

Quando estiver satisfeito com a qualidade, publique de verdade rodando com
`$env:YOUTUBE_PRIVACY_STATUS = "public"` (ou `"unlisted"`) antes do upload.

## Pendências pra automatizar no GitHub Actions

- `AUDIO_PATH` em `generate-daily-video.mjs` ainda aponta pra um arquivo
  local (`Downloads/...mp3`) — pra rodar no CI, a trilha precisa virar um
  arquivo versionado no repo (com a licença confirmada) ou buscado de algum
  storage acessível pelo Actions.
- Ainda não existe um step no `.github/workflows/deploy.yml` chamando esses
  dois scripts — precisa ser adicionado (rodando depois do build, só se
  houver `priceDrops` no dia).
