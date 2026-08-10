# Lista de Presentes — Especificação do MVP

Registro de presentes (casamento / aniversário / chá) no Compare Ofertas.
O dono monta uma lista com produtos do nosso catálogo e compartilha um link;
os convidados marcam (com o e-mail) o que já compraram, pra ninguém dar
produto repetido. Cada compra sai pelo **link de afiliado** da loja parceira
— ou seja, é on-model e monetizável (uma lista = várias compras de
convidados).

> **Status:** especificação. Nada implementado ainda. É o maior recurso do
> projeto até hoje — primeiro com **estado persistente** (não é mais site
> estático). Escopo abaixo é deliberadamente enxuto pra validar a ideia.

---

## 1. Escopo do MVP

**Inclui:**
- Criar uma lista (título, tipo de evento, data, e-mail do dono).
- Adicionar itens do nosso catálogo (reaproveita a busca existente).
- Link público compartilhável da lista.
- Convidado marca item como "vou comprar / já comprei" informando o e-mail.
- Link mágico pro dono editar (sem senha/conta).

**Fora do MVP (fase 2):** quantidade > 1 do mesmo item, contas de usuário /
múltiplas listas, notificar o dono quando marcam, mensagem de agradecimento,
foto de capa, temas visuais, endereço/frete.

---

## 2. Fluxos

**Dono**
1. Abre `/listas/nova`, preenche título + tipo + data + e-mail.
2. Adiciona itens buscando no catálogo.
3. Recebe **link público** (compartilhar) + **link de gestão** (com token
   secreto, enviado por e-mail).

**Convidado**
1. Abre o link público → vê os itens com status (disponível / já comprado).
2. Escolhe um disponível → "Vou comprar este".
3. Informa e-mail + aceita o consentimento → item vira "comprado".
4. É levado ao **link de afiliado da loja** pra concluir a compra.

---

## 3. Modelo de dados (Cloudflare D1 / SQLite)

D1 é mais adequado que KV aqui (dados relacionais: lista → itens → marcações).

```sql
CREATE TABLE registries (
  id           TEXT PRIMARY KEY,   -- uuid público (vai na URL)
  edit_token   TEXT NOT NULL,      -- uuid secreto do dono (link mágico)
  title        TEXT NOT NULL,
  event_type   TEXT NOT NULL,      -- casamento | aniversario | cha | outro
  event_date   TEXT,               -- YYYY-MM-DD
  owner_email  TEXT NOT NULL,
  created_at   TEXT NOT NULL
);

CREATE TABLE registry_items (
  id             TEXT PRIMARY KEY,
  registry_id    TEXT NOT NULL REFERENCES registries(id),
  merchant_slug  TEXT NOT NULL,
  slug           TEXT NOT NULL,
  -- Snapshot no momento de adicionar (sobrevive ao item sair do feed):
  snap_name      TEXT NOT NULL,
  snap_image     TEXT,
  snap_price     REAL,
  snap_deeplink  TEXT NOT NULL,
  added_at       TEXT NOT NULL
);

CREATE TABLE registry_claims (
  id           TEXT PRIMARY KEY,
  item_id      TEXT NOT NULL REFERENCES registry_items(id),
  guest_email  TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'comprado',  -- reservado | comprado
  claim_token  TEXT NOT NULL,   -- pra o convidado desmarcar via e-mail
  claimed_at   TEXT NOT NULL
);

CREATE INDEX idx_items_registry ON registry_items(registry_id);
CREATE INDEX idx_claims_item ON registry_claims(item_id);
```

---

## 4. Endpoints (Cloudflare Worker)

Estende o Worker que já temos (`worker/`).

| Método | Rota | Auth | O quê |
|---|---|---|---|
| POST | `/registry` | — | cria lista; retorna `id` + `edit_token` |
| GET | `/registry/:id` | — | dados públicos (itens + status, sem e-mails) |
| POST | `/registry/:id/items` | `edit_token` | adiciona item (com snapshot) |
| DELETE | `/registry/:id/items/:itemId` | `edit_token` | remove item |
| POST | `/registry/:id/items/:itemId/claim` | — | convidado marca (e-mail + consentimento) → e-mail de confirmação |
| POST | `/registry/:id/items/:itemId/unclaim` | `claim_token` | desmarca (só quem marcou) |

- Ações do dono: `edit_token` no header/query.
- Marcar é aberto, mas com **confirmação por e-mail** (double opt-in leve) —
  evita marcação maliciosa em massa. O `claim_token` do e-mail permite
  desmarcar.

---

## 5. Frontend (novas rotas SPA)

| Rota | O quê | SEO |
|---|---|---|
| `/listas/nova` | criar lista | noindex |
| `/lista/:id` | página pública compartilhável | **noindex** (conteúdo privado/dinâmico) |
| `/lista/:id/editar?token=…` | gestão do dono | noindex |

- **Não** entram no prerender/sitemap (conteúdo por-usuário, dinâmico).
- Reaproveita `ProductCard`, a busca do catálogo e o padrão de consentimento
  da newsletter.

---

## 6. O problema do item obsoleto (crítico)

Uma lista vive por meses; preço/estoque/URL do feed mudam e produtos somem.

- **Snapshot** dos dados do item ao adicionar (nome/imagem/preço/deeplink) —
  a lista nunca fica "vazia" mesmo se o produto sair do feed.
- Na visualização, **revalidar** por `merchant_slug/slug` contra o `index`
  atual: se o item ainda existe, mostra preço atual + "atualizado"; se sumiu,
  mostra o snapshot com aviso "confirmar disponibilidade na loja".
- Deixar claro que o preço pode variar (o link vai pro preço atual da loja).

---

## 7. LGPD / privacidade

- E-mails (dono + convidados): **consentimento explícito**, finalidade
  declarada (gerenciar a lista / evitar duplicados), base legal, retenção
  (excluir X dias após o evento) e direito de exclusão.
- **Nunca expor** os e-mails dos convidados publicamente — pros outros, um
  item aparece só como "já comprado" (anônimo).
- Reaproveita o fluxo de consentimento já usado na newsletter.

---

## 8. Anti-abuso

- Rate limit no Worker (criar lista, marcar).
- Confirmação por e-mail pra marcar (evita marcação em massa).
- Desmarcar só via `claim_token` do e-mail (o público não desmarca a compra
  de outro à toa).

---

## 9. Monetização

- "Vou comprar este" leva ao **deeplink de afiliado** da loja → compra do
  convidado gera comissão. É o uso normal do link (sem o problema de
  compliance da extensão de navegador).

---

## 10. Pré-requisito de catálogo

Registro (casamento) puxa muito **casa/eletrodoméstico**. Já ativamos na
Awin: Brastemp, Consul, Electrolux, Compra Certa (Whirlpool), Arno,
Continental, Panasonic, Leveros, Gigantec, Tok & Stok, Carraro — além das já
ativas Fastshop, LG, Shark-Ninja, Stanley.

- **Mobly** (~104k produtos) segue inativa — dobraria o catálogo; ativar só
  depois de medir o impacto no build (é território "Estágio 3").
- **Samsung** e **Camicado** (loja clássica de lista no BR) **não estão
  anexadas** à conta Awin — exigiriam entrar nos programas delas.

---

## 11. Esforço / faseamento

1. **Fase 0 (feito):** ativar lojas de casa → catálogo pronto pra lista.
2. **Fase 1 (MVP):** D1 + endpoints do Worker + 3 telas + claim-by-email +
   snapshot de item. É o maior lift do projeto, mas bem delimitado.
3. **Fase 2:** quantidades, contas/múltiplas listas, notificações,
   agradecimento, capa/temas.
