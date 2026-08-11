# "Adicionar à lista enquanto navega" — Spec de Viabilidade

Permitir que a pessoa, navegando na loja, salve um produto direto na sua
**lista de presentes** do Compare Ofertas — sem copiar link, sem voltar pro
nosso site. Duas formas possíveis: **PWA (compartilhar → lista)** no mobile e
**extensão de navegador** no desktop.

> **Status:** análise de viabilidade. Nada implementado. Objetivo é decidir
> *se* e *como* vale construir. Ver também [lista-presentes-spec.md](lista-presentes-spec.md).

---

## 1. A restrição central (define tudo)

Nosso diferencial — **"sem presente repetido"** — depende de conseguir
**confirmar a compra**. E só confirmamos compra quando o convidado clica pelo
**deeplink de afiliado** da loja, que dispara o `clickref` → webhook do Awin
(mesma mecânica da lista atual: `reg<token>` no deeplink → `POST /awin-transaction`).

Isso só funciona em **loja parceira** (advertiser Awin em que somos afiliados).
Logo, qualquer forma de "adicionar de fora" **precisa ser travada às lojas
parceiras**. Em loja fora da rede não há deeplink nem confirmação → volta o
"chute" que já foi descartado.

| Produto está em… | Geramos deeplink? | Rastreamos compra? | Entra na lista? |
|---|---|---|---|
| Loja parceira (25 do Awin) | ✅ deeplink pra qualquer URL do domínio | ✅ clickref/webhook | ✅ item rastreável |
| Loja fora da rede | ❌ | ❌ | ❌ (avisar, não salvar) |

**Ganho sobre o que já existe:** a busca no site já cobre os ~98 mil produtos
indexados das 25 lojas. O "adicionar de fora" agrega quando o SKU específico da
loja parceira **não está no nosso feed** — o deeplink do Awin funciona pra
qualquer URL do domínio do advertiser, então dá pra salvar produtos além do
catálogo indexado.

---

## 2. O mecanismo de deeplink por domínio (comum às duas abordagens)

Dado um URL de produto de uma loja parceira, o Worker monta o link rastreável
do Awin (deep linking):

```
https://www.awin1.com/cread.php
  ?awinmid={merchantId}      # ID do advertiser (temos em merchants.config.json)
  &awinaffid=2104315         # nosso publisher ID
  &clickref=reg{token}       # pra casar a compra no webhook
  &ued={URL do produto, encodeURIComponent}
```

Pré-requisito: um **mapa domínio → merchantId** (ex.: `nike.com.br` → Nike).
Precisa ser montado uma vez (temos os merchantIds; falta associar o domínio de
storefront de cada advertiser). Domínio não mapeado = não é parceira → rejeita.

**Captura dos metadados do produto (nome, imagem, preço):**
- Fonte robusta e padrão: `og:title`, `og:image`, `product:price:amount`
  (Open Graph / schema.org `Product`) — presentes na maioria das páginas de
  e-commerce.
- Na **extensão**, o content script lê essas meta tags direto no DOM (fácil).
- No **PWA share target**, geralmente só chega o **URL** (às vezes título).
  Então o Worker faria um `fetch` do URL + parse do OG server-side pra obter
  imagem/preço. Funciona, mas: (a) adiciona dependência de rede; (b) alguns
  sites bloqueiam bot/fetch. Fallback: salvar com nome/URL e o dono confirma
  imagem/preço depois na gestão da lista.

Reaproveita o `POST /registry/:id/items` já existente (token do dono),
acrescentando o `deeplink` gerado e marcando origem `externo`.

---

## 3. Abordagem A — PWA "compartilhar → lista" (mobile) · recomendada primeiro

Usa **Web Share Target API**: o site (instalado como PWA) se registra como
destino de compartilhamento. Na loja, o usuário toca "Compartilhar" → escolhe
"Compare Ofertas" → cai numa tela `/lista/adicionar?url=…` que:
1. valida o domínio (parceira?);
2. mostra o produto detectado + seletor de lista + quantidade;
3. salva via Worker.

**Prós**
- Sem revisão de loja (Chrome Web Store / Firefox AMO).
- Mobile-first — é onde a maioria monta lista, e "compartilhar" é gesto natural.
- Manutenção baixa; vive no próprio site (só um `manifest.json` + rota + service worker mínimo).

**Contras / limites**
- Só Android/Chrome-based robusto; **iOS/Safari não suporta Web Share Target**
  (no iOS o caminho seria um Atalho/Shortcut ou copiar-colar — degradação).
- Metadados podem vir só como URL (ver §2).

---

## 4. Abordagem B — Extensão de navegador (desktop)

Botão "Adicionar à minha lista" que aparece na página do produto (partner).
Content script lê os metadados; popup escolhe lista + quantidade; envia ao Worker.

**Prós**
- UX de 1 clique no desktop; lê metadados com precisão (DOM na mão).
- "Universal registry" clássico (modelo MyRegistry) — porém restrito às parceiras.

**Contras / custo**
- **Revisão na Chrome Web Store** (e AMO p/ Firefox) + política de permissões
  (`activeTab`/host permissions só nos domínios parceiros — não `<all_urls>`).
- Manutenção contínua (Manifest V3, quebras de DOM por loja).
- Só faz sentido em ~25 domínios — alcance limitado pro esforço.

---

## 5. Compliance Awin (por que aqui é leve)

Diferente de extensão de **cupom/cashback** (Honey-style, suspensa por
sequestrar last-click): a nossa **não injeta link de afiliado na loja nem toca
no checkout**. Ela só **captura metadados** pra salvar na lista. O clique de
afiliado acontece **depois, no nosso site**, quando o **convidado** clica em
"Presentear" (clique editorial legítimo). Ou seja, a extensão/PWA **não é
espaço promocional fazendo atribuição** — risco baixo.

Cuidados pra manter assim:
- **Não** setar cookie de afiliado nem redirecionar por link de afiliado na
  página da loja durante a captura.
- Deeplink só é gerado **no momento em que o convidado vai comprar**, no site.
- Manter last-click limpo: nada de sobrescrever origem de outra fonte.

(Ainda assim, se a extensão for publicada, vale um aviso ao Partner Compliance
do Awin descrevendo que é ferramenta de wishlist, não de atribuição.)

---

## 6. Privacidade / LGPD

- **Permissões mínimas**: extensão só com host permissions nos domínios
  parceiros (não `<all_urls>`); PWA só recebe o que o usuário compartilha.
- **Dados capturados**: URL, título, imagem, preço do produto + token da lista.
  Nenhum dado de navegação, histórico ou credencial.
- Deixar explícito na Política de Privacidade e na store listing.

---

## 7. Escopo mínimo (MVP), se for construir

1. Mapa `domínio → merchantId` das 25 parceiras (dado novo, 1x).
2. Endpoint/ajuste no Worker: recebe `{listId, token, url, name?, image?, price?}`,
   valida domínio, gera deeplink, salva item (origem `externo`), dedupe por URL.
3. **Abordagem A**: `manifest.json` (share_target) + service worker + rota
   `/lista/adicionar`. **Abordagem B**: extensão MV3 (content script + popup).
4. Fallback de metadados (fetch/parse OG server-side ou confirmação do dono).

**Fora de escopo:** lojas não-parceiras; captura de variação/estoque; multi-idioma.

---

## 8. Recomendação

1. **Não** começar pela extensão Chrome — custo de revisão/manutenção alto pra
   alcance de 25 domínios.
2. Se validar demanda, fazer **Abordagem A (PWA share target)** primeiro:
   mobile-first, leve, sem revisão de store, mesma lógica de deeplink.
3. Pré-requisito de qualquer caminho: montar o **mapa domínio → merchantId** e o
   endpoint de deeplink no Worker (útil por si só).
4. Antes de tudo: **validar** que existe gente querendo "adicionar de fora"
   (vs. usar a busca no site, que já cobre as 25 lojas) — talvez com um simples
   **bookmarklet** de teste, custo quase zero.

> Decisão pendente do dono: priorizar isso agora ou seguir com melhorias na
> experiência in-site (que já cobre o essencial).
