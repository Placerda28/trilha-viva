-- Lista de espera do Palco (vitrine /palco, estado "Em breve"). Uma linha por
-- e-mail e sistema; quem se inscreve de novo não duplica. Datas em UTC.
CREATE TABLE IF NOT EXISTS palco_lista_espera (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  sistema TEXT NOT NULL CHECK (sistema IN ('windows', 'mac', 'celular')),
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (email, sistema)
);
CREATE INDEX IF NOT EXISTS idx_palco_espera_criado ON palco_lista_espera(criado_em, id);
