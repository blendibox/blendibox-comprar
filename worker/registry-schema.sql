-- Schema do D1 "blendibox-registry" (lista de presentes).
-- Aplicar com:
--   wrangler d1 execute blendibox-registry --file=registry-schema.sql --remote
--
-- Modelo de estados de um item:
--   disponível     -> nenhum interesse e sem compra confirmada
--   com interesse  -> algum convidado clicou pra ir à loja (sinal fraco)
--   comprado       -> a Awin confirmou a transação no webhook (sinal forte)
-- A compra SÓ é marcada quando a Awin confirma — clique é só "interesse".

-- Lista criada pelo dono. edit_token é o "link mágico" de gestão (sem senha).
CREATE TABLE IF NOT EXISTS registries (
  id           TEXT PRIMARY KEY,       -- uuid público (vai na URL de compartilhar)
  edit_token   TEXT NOT NULL,          -- uuid secreto do dono
  title        TEXT NOT NULL,
  event_type   TEXT NOT NULL,          -- casamento | aniversario | cha | outro
  event_date   TEXT,                   -- YYYY-MM-DD
  owner_email  TEXT NOT NULL,
  created_at   TEXT NOT NULL
);

-- Perfil "convidado que se cadastra pra acessar a lista". O acesso à lista
-- pública exige e-mail (captura o lead + permite atribuir interesse por
-- convidado). access_token identifica o convidado nos cliques.
CREATE TABLE IF NOT EXISTS registry_guests (
  id            TEXT PRIMARY KEY,
  registry_id   TEXT NOT NULL,
  email         TEXT NOT NULL,
  access_token  TEXT NOT NULL,
  registered_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_guest_reg_email ON registry_guests(registry_id, email);
CREATE INDEX IF NOT EXISTS idx_guest_token ON registry_guests(access_token);

-- Itens da lista. Snapshot dos dados no momento de adicionar (sobrevive ao
-- produto sair do feed). purchased_* preenchido só pelo webhook da Awin.
CREATE TABLE IF NOT EXISTS registry_items (
  id                 TEXT PRIMARY KEY,
  registry_id        TEXT NOT NULL,
  merchant_slug      TEXT NOT NULL,
  slug               TEXT NOT NULL,
  snap_name          TEXT NOT NULL,
  snap_image         TEXT,
  snap_price         REAL,
  snap_deeplink      TEXT NOT NULL,
  purchased_at       TEXT,             -- NULL = ainda não confirmado como comprado
  purchased_clickref TEXT,
  added_at           TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_items_registry ON registry_items(registry_id);

-- Interesse: convidado clicou pra ir à loja. clickref é um token curto que
-- vai no deeplink da Awin (&clickref=...) e volta no webhook da transação —
-- é como casamos a compra ao item exato. Pode haver vários interesses por
-- item (só a compra confirmada "trava" o item).
CREATE TABLE IF NOT EXISTS registry_interest (
  id          TEXT PRIMARY KEY,
  item_id     TEXT NOT NULL,
  guest_id    TEXT,
  clickref    TEXT NOT NULL,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_interest_item ON registry_interest(item_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_interest_clickref ON registry_interest(clickref);

-- Transações confirmadas pela Awin (webhook Transaction Notifications).
-- Idempotente por transaction_id — a Awin pode reenviar a mesma notificação.
CREATE TABLE IF NOT EXISTS awin_transactions (
  transaction_id TEXT PRIMARY KEY,
  clickref       TEXT,
  advertiser_id  TEXT,
  amount         REAL,
  currency       TEXT,
  status         TEXT,               -- pending | approved | declined (commissionStatus da Awin)
  received_at    TEXT NOT NULL,
  raw            TEXT                 -- payload cru, pra auditoria/debug
);
CREATE INDEX IF NOT EXISTS idx_txn_clickref ON awin_transactions(clickref);
