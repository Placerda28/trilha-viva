ALTER TABLE compras ADD COLUMN teste INTEGER NOT NULL DEFAULT 0;
ALTER TABLE compras ADD COLUMN teste_por TEXT;
ALTER TABLE compras ADD COLUMN teste_em TEXT;

ALTER TABLE carrinhos ADD COLUMN teste INTEGER NOT NULL DEFAULT 0;
ALTER TABLE carrinhos ADD COLUMN teste_por TEXT;
ALTER TABLE carrinhos ADD COLUMN teste_em TEXT;

CREATE TABLE contatos_teste (
  valor TEXT PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('email','telefone')),
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  criado_por TEXT
);

INSERT INTO contatos_teste (valor, tipo) VALUES
  ('paulohenrique_ls@hotmail.com', 'email'),
  ('trilhaviva.suporte@gmail.com', 'email'),
  ('27996253839', 'telefone');

CREATE VIEW compras_reais AS SELECT * FROM compras WHERE teste = 0;
CREATE VIEW carrinhos_reais AS SELECT * FROM carrinhos WHERE teste = 0;
