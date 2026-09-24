-- Cupons ficam sempre em maiúsculas. As CHECKs são uma segunda barreira caso
-- algum código futuro tente gravar dados sem passar pela validação da API.
CREATE TABLE IF NOT EXISTS cupons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL CHECK (tipo IN ('percentual', 'valor')),
  valor INTEGER NOT NULL CHECK (valor > 0),
  valido_ate TEXT NOT NULL,
  limite_usos INTEGER NOT NULL CHECK (limite_usos > 0),
  ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
  criado_por TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  desativado_por TEXT,
  desativado_em TEXT
);

-- A referência é a external_reference aleatória enviada ao Mercado Pago.
-- Uma linha representa uma vaga temporariamente ocupada no limite do cupom.
CREATE TABLE IF NOT EXISTS cupom_reservas (
  referencia TEXT PRIMARY KEY,
  cupom_id INTEGER NOT NULL REFERENCES cupons(id),
  preco_centavos INTEGER NOT NULL CHECK (preco_centavos >= 100),
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  expira_em TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cupom_reservas_ativas
  ON cupom_reservas(cupom_id, expira_em);

ALTER TABLE compras ADD COLUMN cupom TEXT;

CREATE INDEX IF NOT EXISTS idx_compras_cupom ON compras(cupom);
