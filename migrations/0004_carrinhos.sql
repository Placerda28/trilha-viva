CREATE TABLE IF NOT EXISTS carrinhos (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL CHECK (email = lower(trim(email))),
  nome TEXT,
  telefone TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'aberto'
    CHECK (status IN ('aberto', 'pago', 'lembrado', 'ignorado')),
  email_enviado_em TEXT,
  whatsapp_enviado_em TEXT,
  pago_em TEXT,
  origem TEXT
);

CREATE INDEX IF NOT EXISTS idx_carrinhos_email
  ON carrinhos (email);

CREATE INDEX IF NOT EXISTS idx_carrinhos_status_criado_em
  ON carrinhos (status, criado_em);

CREATE TABLE IF NOT EXISTS descadastros (
  email TEXT PRIMARY KEY CHECK (email = lower(trim(email))),
  canal TEXT NOT NULL DEFAULT 'email',
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
