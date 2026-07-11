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
   `sitemap-N.xml` se passar de 45 mil URLs) + `robots.txt`, só com as páginas
   reais (nunca com os stubs de redirect).

7. O workflow **`.github/workflows/deploy.yml`** roda tudo isso toda
   segunda-feira (cron), a cada push em `main`, ou manualmente, e publica via
   `actions/deploy-pages` — sem criar branch `gh-pages` nem histórico de
   commits com dados grandes.

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
   `AWIN_API_KEY` (só a chave, sem o resto da URL do feed).
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

# Build completo (feed + cupons + build + pré-renderização + redirects + sitemap):
npm run build
npm run preview   # serve a pasta dist/ de verdade (não o dev server)

# Só o dev server (SPA, sem pré-renderização, usa os dados já em public/data):
npm run dev
```

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

## Tamanho dos dados

`public/data/*.json` nunca é commitado versionado como "definitivo" no
histórico de deploy (só existe dentro do artefato de build do Pages), mas o
`index.json` e os arquivos de produto crescem junto com o catálogo — hoje
(11 lojas) o `index.json` fica na casa de dezenas de MB. Se isso virar
problema de performance de carregamento, considere particionar o índice por
vertical/categoria em vez de um arquivo único.
