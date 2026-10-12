-- "Primeiro acesso" (/primeiro-acesso): quem comprou e não criou a senha pede
-- o link pelo e-mail. Esta tabela só guarda os pedidos da última hora (e uma
-- faxina apaga os de mais de 1 dia), para o limite de 3 por hora por e-mail e
-- por IP.
CREATE TABLE IF NOT EXISTS pedidos_acesso (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  ip TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pedidos_acesso_email ON pedidos_acesso (email, criado_em);
CREATE INDEX IF NOT EXISTS idx_pedidos_acesso_ip ON pedidos_acesso (ip, criado_em);
