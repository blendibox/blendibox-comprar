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

Precisa de `public/data/price-drops-today.json` fresco (gerado durante o
build, por `update-price-history.mjs`):

```powershell
npm run fetch-feed
npm run price-history
node scripts/post-telegram-deals.mjs
```

Por padrão publica até 10 ofertas (`TELEGRAM_TOP_N` muda esse número), uma
a cada ~1,5s. Dias sem queda de preço não publicam nada — não é erro.
