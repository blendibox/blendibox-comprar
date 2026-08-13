# Compare Ofertas (Blendibox)

Site estático (React + Vite + React Router) que lista ofertas de vários feeds
de produtos da Awin, com páginas de produto pré-renderizadas (SEO real, sem
depender de JS pro Google indexar), comparador lado a lado, cupons de desconto
(inclusive páginas por loja), gráfico de histórico de preço, favoritos com
aviso de queda de preço por e-mail, seção "comprado recentemente" a partir de
vendas reais, uma **lista de presentes** (registro de casamento/chá/aniversário)
e migração de URLs do site antigo. Hospedado no GitHub Pages, atualizado
automaticamente por um workflow do GitHub Actions. Partes dinâmicas (newsletter,
avisos, lista de presentes) rodam num **Cloudflare Worker** (`worker/`) com KV
e D1.

## Como funciona

1. **`scripts/fetch-feeds.mjs`** baixa o(s) feed(s) configurado(s) em
   `scripts/feeds.config.json` (CSV comprimido em gzip), descompacta e gera:
   - `public/data/index.json` — array leve (nome, preço, imagem, loja, categoria)
     usado pela listagem/busca no navegador.
   - `public/data/products/{merchant}/{slug}.json` — um arquivo por produto com
     detalhe completo + produtos similares.
   - `public/data/merchants.json`, `meta.json`.

   Cada loja é mapeada em **`scripts/merchants.config.json`** (slug, nome,
   vertical, e se é `priority` — lojas com histórico comprovado de vendas/SEO
   que sempre ganham página estática, ignorando o limiar de "produtos
   similares" anti-conteúdo-fino).

2. **`scripts/fetch-coupons.mjs`** busca cupons/promoções direto na API oficial
   da Awin (não precisa mais exportar CSV) e gera `public/data/coupons.json`,
   já filtrando cupons expirados. Ver a seção **Cupons** abaixo. Também existem
   páginas de SEO por loja em `/cupons/{loja}` (`src/pages/CouponsMerchantPage.tsx`),
   com JSON-LD (`FAQPage` + `BreadcrumbList`).

3. **`vite build`** builda o SPA normalmente.

4. **`scripts/prerender.mjs`** gera HTML estático de verdade (não só o shell
   do SPA) pra cada produto elegível, loja, categoria e vertical — com
   `<title>`, meta description, Open Graph e JSON-LD (`Product`,
   `BreadcrumbList`) próprios. Usa esbuild pra rodar o mesmo React do cliente
   em Node (`src/entry-server.tsx`), sem precisar de um pipeline SSR separado.

5. **`scripts/generate-redirects.mjs`** cuida da migração do site antigo
   (`comprar.blendibox.com.br`, ~104 mil URLs já indexadas no Google segundo o
   Search Console). Lê `data/legacy-urls.txt` (extraído do sitemap antigo) e,
   pra cada loja já ativa no feed, tenta casar a URL antiga com o produto atual
   pelo `merchant_product_id` (sufixo do slug). GitHub Pages não faz redirect
   301 de verdade (hospedagem estática, sem servidor), então gera uma página
   HTML com meta refresh + JS + `rel=canonical` apontando pra URL nova. Se não
   achar o produto exato, redireciona pro hub da loja em vez de deixar 404.

6. **`scripts/generate-sitemap.mjs`** gera `sitemap.xml` (particionado em
   `sitemap-N.xml` a cada 10 mil URLs — dá diagnóstico mais granular no Search
   Console) + `robots.txt`, só com as páginas reais (nunca com os stubs de
   redirect).

7. **`scripts/update-price-history.mjs`** roda logo depois do fetch e mantém
   `data/price-history.json` (versionado no git — o workflow faz commit dele de
   volta a cada rodada). Regras pra o arquivo não estourar o limite de 100 MB
   do GitHub:
   - **grava só quando o preço muda** (subida ou queda) — nunca repete o mesmo
     valor todo dia (o histórico vira uma função-degrau enxuta);
   - **poda** chaves de produtos que saíram do catálogo (reconstrói o objeto só
     com os produtos da rodada atual);
   - **só rastreia** produtos ativos com página estática (`eligibleForStaticPage`).

   Cada produto ganha um campo `priceHistory` (usado pro gráfico em degrau na
   página do produto) e, quando o preço cai **em relação ao último registro
   anterior**, `priceDropPercent`/`previousPrice`. A queda é marcada **no dia da
   mudança** e não persiste (no dia seguinte, estável, o preço atual já é o
   último registro). Também gera `public/data/price-drops.json` (lista enxuta
   pro Worker de e-mail — ver "Aviso de queda de preço").

8. **`scripts/parse-sales-highlights.mjs`** monta a seção "Comprado
   recentemente" da home a partir das transações reais da **API de Transações
   da Awin** (`showBasketProducts=true`, mesmo `AWIN_PROMOTIONS_TOKEN` dos
   cupons, últimos 90 dias). Casa cada compra ao produto do catálogo por
   SKU/nome, inclui compras `pending` (venda real) e ignora `declined`/`deleted`.
   Se a API falhar, cai no CSV manual (`data/sales-highlights.csv`) e nunca
   esvazia a seção.

9. O workflow **`.github/workflows/deploy.yml`** roda tudo isso **todo dia**
   (cron), a cada push em `main`, ou manualmente, e publica via
   `actions/deploy-pages` — sem criar branch `gh-pages` nem histórico de
   commits com dados grandes (a única exceção é o `price-history.json`, que
   precisa persistir de uma rodada pra outra).

## Estrutura de URL

As URLs de loja/produto são **planas** (`/{loja}/{produto}-{sku}/`, sem
prefixo de vertical) — de propósito, pra bater com o que já está indexado no
Google no site antigo. O vertical (`beleza`, `joias`, `esporte`...) vira uma
página de categoria/curadoria em `/{vertical}/`, e categorias dentro dele em
`/{vertical}/categoria/{slug}/`. Uma mesma rota `/:slug` no cliente
(`src/pages/HubPage.tsx`) decide se é hub de vertical ou de loja olhando o
dado carregado.

## Setup no GitHub

1. Crie o repositório no GitHub e suba este projeto.
2. Em **Settings → Pages**, escolha **Source: GitHub Actions**.
3. Em **Settings → Secrets and variables → Actions**, adicione o secret
   `AWIN_API_KEY` (só a chave, sem o resto da URL do feed), `AWIN_PROMOTIONS_TOKEN`
   (token separado, ver seção "Cupons" abaixo) e, se for usar os
   catálogos de revenda do Grupo Boticário (ver seção própria abaixo),
   `OUIPARIS_USER_ID`. Pro catálogo de livros da Amazon (ver seção própria
   abaixo), adicione também `AMAZON_ACCESS_KEY`, `AMAZON_SECRET_KEY` e
   `AMAZON_PARTNER_TAG`. Pro catálogo da Shopee (ver seção própria abaixo),
   adicione `SHOPEE_FEED_URL`.
4. **Domínio próprio**: o arquivo `public/CNAME` já aponta pra
   `comprar.blendibox.com.br`. No provedor de DNS do domínio, configure um
   registro `CNAME` apontando pro `<usuario>.github.io` (ou os registros `A`
   que o GitHub Pages documenta, se for o domínio raiz). Isso é manual, não dá
   pra automatizar por aqui.
5. Dê push na branch `main` — o workflow builda e publica automaticamente.

## Rodando localmente

```bash
npm install

# Buscar o feed real (precisa da API key):
$env:AWIN_API_KEY = "sua-chave"   # PowerShell
npm run fetch-feed

# Opcional: catálogos de revenda do Grupo Boticário — O.U.i Paris, Eudora,
# O Boticário e Quem Disse Berenice (revenda, não é feed da Awin — ver
# scripts/lib/grupoboticario.mjs). Sem essa variável, o build segue sem esses produtos.
$env:OUIPARIS_USER_ID = "seu-user-id"   # PowerShell

# Build completo (feed + cupons + build + pré-renderização + redirects + sitemap):
npm run build
npm run preview   # serve a pasta dist/ de verdade (não o dev server)

# Só o dev server (SPA, sem pré-renderização, usa os dados já em public/data):
npm run dev
```

## Catálogo de livros (Amazon BR)

Fonte: Product Advertising API (PA-API 5.0) da Amazon Associates — ver
`scripts/lib/amazon.mjs`. Diferente do feed da Awin, a PA-API não expõe um
"feed de mais vendidos" pra baixar de uma vez; a aproximação usada é rodar
buscas fixas por palavra-chave dentro de `SearchIndex=Books` (lista em
`SEARCHES`, ajustável sem tocar no resto do pipeline).

Credenciais necessárias (geradas em Associates Central → Tools → Product
Advertising API): `AMAZON_ACCESS_KEY`, `AMAZON_SECRET_KEY` e
`AMAZON_PARTNER_TAG` (o Associate Tag). Sem essas variáveis definidas, o
build segue normalmente sem o catálogo da Amazon.

```bash
$env:AMAZON_ACCESS_KEY = "sua-access-key"     # PowerShell
$env:AMAZON_SECRET_KEY = "sua-secret-key"
$env:AMAZON_PARTNER_TAG = "seu-associate-tag"
```

**Importante sobre a periodicidade**: o termo de uso da Amazon Associates
exige que conteúdo vindo da PA-API (preço, disponibilidade, imagem) não
fique em cache por mais de 24h. Por isso o `deploy.yml` roda todo dia (não
mais só às segundas) — como o GitHub Pages sempre republica o `dist/`
inteiro, isso também rebusca Awin e Grupo Boticário com mais frequência,
efeito colateral aceito por simplicidade.

### Catálogo manual (sem depender da PA-API)

A PA-API exige pelo menos 3 vendas qualificadas nos últimos 180 dias pra
liberar acesso — enquanto isso não vale, ou pra qualquer livro que as
buscas fixas (`SEARCHES` em `scripts/lib/amazon.mjs`) não cubram, dá pra
adicionar produtos à mão em `data/amazon-books.csv` (mesmo espírito do
`data/promotions.csv` dos cupons: pequeno, versionado no git, você edita e
o próximo push já reprocessa).

Colunas: `asin,title,price,image,description` (as duas últimas são
opcionais). Só precisa do ASIN (o código do produto, visível na URL:
`amazon.com.br/dp/{ASIN}`) — o link de afiliado com `tag=` é sempre gerado
automaticamente a partir dele, não precisa colar o link do SiteStripe
inteiro. Requer apenas `AMAZON_PARTNER_TAG` definida (não precisa das
credenciais da API pra essa parte funcionar).

```csv
asin,title,price,image,description
B0GKZ4CGQ1,Nome do livro,49.90,https://m.media-amazon.com/images/I/xxxx.jpg,
```

Livros vindos da API e do CSV manual nunca se duplicam (o mesmo ASIN só
entra uma vez, priorizando o dado automático da API quando os dois
existirem).

A PA-API também exige pelo menos 3 vendas qualificadas nos últimos 180 dias
pra manter o acesso liberado — se ficar muito tempo sem vendas, vale
conferir em Associates Central se o acesso à API continua ativo antes de
assumir que as credenciais ainda funcionam.

## Catálogo Shopee (datafeed)

Fonte: link de datafeed do painel de Afiliados da Shopee
(`affiliate.shopee.com.br/creative/product_feed`) — ver
`scripts/lib/shopee.mjs`. Diferente dos outros merchants (um lojista = um
vertical fixo), esse único feed cobre categorias muito diferentes (beleza,
eletrônicos, alimentos...) dentro do mesmo "merchant" Shopee — por isso o
vertical é calculado por produto, a partir da coluna `global_category1` do
feed, via a tabela `CATEGORY_TO_VERTICAL` em `scripts/lib/shopee.mjs`.
Categorias que não estão nessa tabela são **ignoradas de propósito** (não
importa o feed inteiro de cara) — o log do build mostra quais categorias
foram puladas, é só adicionar na tabela conforme for revisando. Alguns
casos dependem da subcategoria (`global_category3`), não só da categoria
1 — ex: álbum/figurinha de copa do mundo entra como "colecionável" na
Shopee (`Hobbies & Collections`), não como livro, mas faz sentido junto
de "livros" no site — esses casos ficam em `CATEGORY3_OVERRIDES`.

O catálogo também começa limitado por vertical, ajustável em
`VERTICAL_CAPS`/`DEFAULT_MAX_PER_VERTICAL` em `scripts/lib/shopee.mjs`.
Moda, beleza, eletrônicos e casa (as categorias de maior venda na Shopee
em geral) têm limite de 1000; o resto (joias, livros, esporte) fica em
300 até termos dado de conversão real pra reajustar. Dentro de cada
vertical, a seleção é **round-robin por subcategoria** (não um corte
único por avaliação/curtidas) — sem isso, subgêneros pequenos (ex:
bíblia/devocional, autoajuda) ficavam de fora só porque outros subgêneros
maiores tinham nota média mais alta.

`SHOPEE_FEED_URL` é a URL completa copiada do painel (já inclui um token
de autenticação — trate como secret, nunca cole no repo). Confirmado que
essa URL é fixa e reutilizável: o conteúdo por trás dela é atualizado pela
própria Shopee, o link não expira ao gerar de novo.

```bash
$env:SHOPEE_FEED_URL = "https://affiliate.shopee.com.br/api/v1/datafeed/download?id=..."   # PowerShell
```

O link de afiliado (coluna `product_short link` do feed) já vem pronto da
própria Shopee — não construímos nenhum link aqui, só repassamos o que o
feed fornece.

## Adicionando mais lojas (feeds)

1. Adicione o `fid` da loja na URL em `scripts/feeds.config.json` (lista
   separada por vírgula).
2. Adicione uma entrada em `scripts/merchants.config.json` com o
   `merchant_id` (campo `merchant_id` do CSV) como chave: `slug`,
   `displayName`, `vertical`, `active: true`. Use `priority: true` se a loja já
   tem histórico de vendas ou tráfego orgânico comprovado (aí sempre gera
   página estática, sem depender do limiar de produtos similares).
3. Se a loja já existia no site antigo, confira se o slug bate com o
   `merchant_id`/formato usado lá (veja a seção de migração) antes de rodar
   `npm run redirects`.

Veja a lista de estágios de expansão de marcas e a análise de performance real
(vendas + Search Console) no plano salvo em `.claude/plans/` desta sessão.

## Migração do site antigo / redirects

`data/legacy-urls.txt` (~104 mil linhas, uma URL por linha) é o dump do
sitemap do site antigo. Pra atualizar essa lista (se descobrir mais URLs
indexadas), baixe os `sitemap-N.xml` de `comprar.blendibox.com.br/sitemap` e
extraia os `<loc>`. Rode `npm run redirects` (já faz parte de `npm run
build`) pra regenerar os stubs de redirect em `dist/`.

Lojas que não estão em `merchants.config.json` com `active: true` **não** geram
redirect (ex: Telhanorte, descontinuada) — essas URLs antigas ficam sem
tratamento e o Google as remove do índice naturalmente com o tempo.

## Cupons

`scripts/fetch-coupons.mjs` busca os cupons/promoções direto na API oficial
da Awin ([Retrieve Offers](https://help.awin.com/apidocs/promotions)) a cada
build — não precisa mais exportar CSV manualmente do painel. Precisa de um
token separado do `AWIN_API_KEY` (aquele é só do datafeed de produtos):

1. No painel da Awin, gere um token de API de publisher (seção de
   credenciais/API em `ui.awin.com` — token do tipo Bearer, não o mesmo da
   URL do datafeed).
2. Adicione como secret `AWIN_PROMOTIONS_TOKEN` no GitHub (ver seção "Setup
   no GitHub" acima).

O script filtra direto na API pelos merchant IDs já configurados em
`scripts/merchants.config.json` (a API não filtra por padrão — o corpo da
requisição precisa aninhar os filtros em `filters.advertiserIds`, não como
campo solto), então só traz cupom das lojas que a gente já acompanha. Sem a
variável definida, o build segue normalmente sem cupons.

## Newsletter, Resend e LGPD

O formulário no rodapé (`src/components/NewsletterSignup.tsx`) usa o Resend
pra guardar os e-mails cadastrados numa Audience. Como a chave da API do
Resend é secreta (não pode ficar no JS do navegador), o formulário não fala
direto com o Resend — ele chama um **Cloudflare Worker** (`worker/`), que é
quem de fato conversa com a API do Resend usando a chave guardada como secret.

Deploy do Worker (precisa de conta gratuita na Cloudflare e do `wrangler`):

```bash
cd worker
npx wrangler login
npx wrangler secret put RESEND_API_KEY        # cole a chave do painel do Resend
npx wrangler secret put RESEND_AUDIENCE_ID    # ID da Audience criada em resend.com/audiences
npx wrangler deploy
```

O comando `deploy` imprime uma URL tipo
`https://blendibox-newsletter.<seu-subdominio>.workers.dev` — cole ela em
`src/config/newsletter.ts` (`NEWSLETTER_WORKER_URL`). Até isso ser
configurado, o formulário mostra "em breve" em vez de quebrado.

Pra mandar a newsletter semanal de verdade, use a aba **Broadcasts** do
Resend (compõe e envia pra Audience inteira) — ela já cuida do link de
descadastro por contato automaticamente, sem precisar programar nada extra.

O cadastro exige aceite explícito da Política de Privacidade
(`/privacidade`, `src/pages/PrivacyPage.tsx`) — os textos de política e termos
são um modelo geral, vale revisão jurídica antes de publicar oficialmente.

### Aviso de queda de preço (favoritos)

Na página `/favoritos`, quem já tem algum produto salvo pode deixar o e-mail
pra ser avisado quando ele baixar de preço (`src/components/PriceDropWatchForm.tsx`).
É uma finalidade separada da newsletter geral — o cadastro só entra na
Audience do Resend se a pessoa marcar o checkbox opcional "também quero o
resumo semanal", nunca por padrão.

Esse recurso precisa de um KV namespace novo no mesmo Worker (guarda, por
produto, a lista de e-mails que pediram aviso). Antes do primeiro deploy
depois de puxar essa mudança:

```bash
cd worker
npx wrangler kv namespace create PRICE_WATCH
```

O comando imprime um `id` — cole ele em `worker/wrangler.toml`, no lugar de
`COLE_AQUI_O_ID_DO_NAMESPACE`, e rode `npx wrangler deploy` de novo.

Ao pedir o aviso, o Worker guarda no KV, por produto, o e-mail **e o preço
naquele momento** (`priceAtWatch`, o baseline). Todo dia
`scripts/update-price-history.mjs` gera `public/data/price-drops.json` com todo
produto que caiu de preço nessa rodada (vs. o último registro anterior). O
Worker tem um segundo Cron Trigger (09h UTC, `wrangler.toml`) que lê esse
arquivo, cruza com o KV `PRICE_WATCH` e só avisa quem tem **baseline maior que
o preço atual** — ou seja, caiu **depois** que a pessoa começou a acompanhar,
não por um desconto que já existia. É um e-mail avulso (não Broadcast) e único:
o watcher avisado é removido do KV; quem ainda não caiu abaixo do seu preço
continua na fila.

A barra fixa de "avise-me quando baixar de preço" aparece na página de
Favoritos e também na página de produto (modo "favoritar e acompanhar" num
clique) — ver `src/components/PriceDropWatchForm.tsx`. E há a barra de
newsletter no topo (`src/components/TopBar.tsx`), ambas dispensáveis e com
consentimento LGPD explícito.

## Lista de presentes

Registro de presentes (casamento, chá de bebê/panela, aniversário, mêsversário,
15 anos, pet…) — o dono monta uma lista com produtos do catálogo, compartilha um
link curto e os convidados escolhem o que presentear, comprando direto na loja
parceira. Landing em `/lista-de-presentes`, criação em `/listas/nova`, gestão em
`/lista/:id/editar`, página pública em `/lista/:id`.

O estado persiste no **Cloudflare D1** (`REGISTRY_DB`, schema em
`worker/registry-schema.sql`) — é a primeira parte não-estática do projeto. O
clique em "Presentear" só marca **interesse**; a **compra é confirmada apenas
pela Awin**, via webhook de Transaction Notifications (`POST /awin-transaction`),
casando pelo `clickref` (`reg<token>` anexado ao deeplink). Idempotente por
`transaction_id`; ao confirmar, incrementa a quantidade comprada e avisa o dono
por e-mail (Resend). Ver `docs/lista-presentes-spec.md`.

Setup do D1 (uma vez):

```bash
cd worker
npx wrangler d1 create blendibox-registry            # cole o id em wrangler.toml (REGISTRY_DB)
npx wrangler d1 execute blendibox-registry --remote --file ./registry-schema.sql
```

No painel da Awin, configure as Transaction Notifications apontando pra
`https://<seu-worker>/awin-transaction`.

Há também um passo a passo interativo em `/como-funciona`
(`src/pages/WalkthroughPage.tsx`), com abas pra Lista de presentes, Newsletter e
Alerta de preço.

## Tamanho dos dados

`public/data/*.json` não é versionado no git (só existe dentro do artefato de
build do Pages) — a exceção é `data/price-history.json`, que precisa persistir
entre rodadas e por isso é commitado de volta. Como ele cresce com o catálogo,
o `update-price-history.mjs` o mantém pequeno (grava só na mudança + poda
produtos fora do catálogo + só produtos com página) pra não passar do limite de
100 MB do GitHub.

O `index.json` e os arquivos de produto crescem junto com o catálogo — hoje
o `index.json` fica na casa de dezenas de MB. Se isso virar problema de
performance de carregamento, considere particionar o índice por
vertical/categoria em vez de um arquivo único. (A home já não depende dele:
usa `home-highlights.json`, bem menor, gerado no build.)
