CREATE TABLE lembretes_enviados_novo (
  carrinho_id TEXT NOT NULL,
  canal TEXT NOT NULL DEFAULT 'email' CHECK (canal IN ('email', 'whatsapp')),
  etapa INTEGER NOT NULL CHECK (etapa BETWEEN 1 AND 8),
  enviado_em TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (carrinho_id, canal, etapa)
);
INSERT INTO lembretes_enviados_novo (carrinho_id, canal, etapa, enviado_em)
  SELECT carrinho_id, canal, etapa, enviado_em FROM lembretes_enviados;
DROP TABLE lembretes_enviados;
ALTER TABLE lembretes_enviados_novo RENAME TO lembretes_enviados;
CREATE INDEX IF NOT EXISTS idx_lembretes_enviado_em ON lembretes_enviados (enviado_em);

ALTER TABLE carrinhos ADD COLUMN whatsapp_etapa INTEGER NOT NULL DEFAULT 0;  -- quantas mensagens já saíram (0 a 8)
ALTER TABLE carrinhos ADD COLUMN proximo_whatsapp_em TEXT;                   -- quando sai a próxima
CREATE INDEX IF NOT EXISTS idx_carrinhos_proximo_whatsapp ON carrinhos (proximo_whatsapp_em);
