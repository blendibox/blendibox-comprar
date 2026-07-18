# Compare Ofertas (Blendibox)

Site estático (React + Vite + React Router) que lista ofertas de vários feeds
de produtos da Awin, com páginas de produto pré-renderizadas (SEO real, sem
depender de JS pro Google indexar), comparador lado a lado, cupons de desconto
e migração de URLs do site antigo. Hospedado no GitHub Pages, atualizado
automaticamente por um workflow do GitHub Actions.

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

2. **`scripts/parse-coupons.mjs`** lê `data/promotions.csv` (exportado
   manualmente do painel da Awin — não tem link de download direto como o
   feed de produtos) e gera `public/data/coupons.json`, já filtrando cupons
   expirados.

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

7. **`scripts/update-price-history.mjs`** roda logo depois do fetch e guarda
   um retrato semanal de preço por produto em `data/price-history.json`
   (pequeno, versionado no git — o workflow faz commit dele de volta toda
   semana). Cada produto ganha um campo `priceHistory` com as últimas 12
   semanas, usado pro gráfico de preço na página do produto.

8. O workflow **`.github/workflows/deploy.yml`** roda tudo isso toda
   segunda-feira (cron), a cada push em `main`, ou manualmente, e publica via
   `actions/deploy-pages` — sem criar branch `gh-pages` nem histórico de
   commits com dados grandes (a única exceção é o `price-history.json`, que é
   pequeno e precisa persistir de uma semana pra outra).

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
   `AWIN_API_KEY` (só a chave, sem o resto da URL do feed) e, se for usar os
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
foram puladas, é só adicionar na tabela conforme for revisando.

O catálogo também começa limitado a `MAX_PER_VERTICAL` (300) produtos por
vertical, ranqueados por avaliação/curtidas do próprio feed — ajustável na
mesma constante.

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

`data/promotions.csv` é exportado manualmente do painel da Awin (sem link de
download direto) e versionado no repo — substitua o arquivo e dê push quando
quiser atualizar os cupons; o build já reprocessa tudo.

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

## Tamanho dos dados

`public/data/*.json` nunca é commitado versionado como "definitivo" no
histórico de deploy (só existe dentro do artefato de build do Pages), mas o
`index.json` e os arquivos de produto crescem junto com o catálogo — hoje
(11 lojas) o `index.json` fica na casa de dezenas de MB. Se isso virar
problema de performance de carregamento, considere particionar o índice por
vertical/categoria em vez de um arquivo único.
