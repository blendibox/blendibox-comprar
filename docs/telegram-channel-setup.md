# Canal do Telegram com as ofertas do dia — configuração

Passo a passo pra `scripts/post-telegram-deals.mjs` publicar as maiores
quedas de preço do dia num canal do Telegram. Bem mais simples que o setup
do YouTube (sem OAuth) — é só um bot token.

## 1. Criar o bot

1. No Telegram, procure **@BotFather** e inicie uma conversa.
2. Mande `/newbot`, escolha um nome de exibição e um username terminado em
   `bot` (ex: `CompareOfertasBot`).
3. O BotFather devolve um **token** (formato `123456789:ABC-...`) — é o
   `TELEGRAM_BOT_TOKEN`. Guarde com segurança, equivale a uma senha.

## 2. Criar o canal (se ainda não tiver um)

1. No Telegram, crie um canal novo (público ou privado).
2. Adicione o bot criado no passo 1 como **administrador** do canal, com
   permissão de publicar mensagens — sem isso ele não consegue postar.

## 3. Pegar o `TELEGRAM_CHAT_ID`

- **Canal público** (tem um `@nomedocanal`): use o próprio `@nomedocanal`
  como `TELEGRAM_CHAT_ID` — não precisa de mais nada.
- **Canal privado**: precisa do ID numérico (algo como `-1001234567890`).
  Jeito mais simples: poste qualquer mensagem manualmente no canal, depois
  acesse `https://api.telegram.org/bot<SEU_TOKEN>/getUpdates` no navegador
  — o `chat.id` do canal aparece na resposta JSON.

## 4. Guardar os dois segredos

- **Local** (pra testar):
  ```powershell
  $env:TELEGRAM_BOT_TOKEN = "..."
  $env:TELEGRAM_CHAT_ID = "@seucanal"
  ```
- **GitHub Actions**: repositório → **Settings → Secrets and variables →
  Actions → New repository secret** → `TELEGRAM_BOT_TOKEN` e
  `TELEGRAM_CHAT_ID`.

## 5. Testar

Precisa de `data/price-drops-today.json` fresco (gerado durante o build, por
`update-price-history.mjs` — é a cópia pequena e versionada de
`public/data/price-drops-today.json`, pensada pra rodar sem rebuscar o feed):

```powershell
npm run fetch-feed
npm run price-history
node scripts/post-telegram-deals.mjs
```

Dias sem queda de preço não publicam nada — não é erro.

## 6. Dois horários, dois modos

O post de madrugada (cron principal, `deploy.yml`) não é um bom horário pra
divulgar — ninguém está olhando Telegram às 3h. Por isso a publicação em si
roda num workflow separado, **`.github/workflows/telegram-deals.yml`**, com
dois horários fixos (horário de Brasília):

- **12h15** — modo `single`: publica 1 oferta avulsa (a maior queda do dia),
  com foto.
- **19h30** — modo `digest`: publica uma imagem com as próximas ofertas do
  dia (foto real de cada produto, nome, preço e desconto), um botão por
  oferta no teclado inline — pula a #1, já publicada às 12h15, pra não
  repetir o mesmo produto duas vezes.

Pra testar cada modo manualmente:

```powershell
$env:TELEGRAM_MODE = "single"   # ou "digest"
node scripts/post-telegram-deals.mjs
```

`TELEGRAM_DIGEST_SIZE` (padrão 5) controla quantas ofertas entram no resumo
das 19h30. Também dá pra disparar manualmente pelo GitHub (aba **Actions** →
"Publicar ofertas no Telegram" → **Run workflow**, escolhendo o modo).

## 7. Vídeo diário

Diferente das ofertas (12h15/19h30), o vídeo é publicado no Telegram no
**mesmo momento em que é gerado** — dentro do próprio `deploy.yml`, logo
depois do upload pro YouTube, usando o `daily-video.mp4` que já está em
disco naquela run (sem esperar os horários do canal). Script:
`scripts/post-telegram-video.mjs` (`npm run telegram-video`), usa os mesmos
`TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID`.
