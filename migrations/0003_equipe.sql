-- A tabela nunca concede o papel de master. Ela guarda somente os membros;
-- o master continua vindo exclusivamente da variável ADMIN_MASTER.
CREATE TABLE IF NOT EXISTS equipe (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE CHECK (email = lower(trim(email))),
  criado_por TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
  libera_acervo INTEGER NOT NULL DEFAULT 0 CHECK (libera_acervo IN (0, 1)),
  precisa_trocar_senha INTEGER NOT NULL DEFAULT 1 CHECK (precisa_trocar_senha IN (0, 1)),
  removido_por TEXT,
  removido_em TEXT
);

CREATE TABLE IF NOT EXISTS registro (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  quem TEXT NOT NULL,
  acao TEXT NOT NULL,
  alvo TEXT,
  detalhe TEXT
);

CREATE INDEX IF NOT EXISTS idx_registro_criado_em
  ON registro(criado_em DESC);
