ALTER TABLE carrinhos ADD COLUMN whatsapp_msg_id TEXT;   -- id da mensagem na Meta (wamid)
ALTER TABLE carrinhos ADD COLUMN whatsapp_status TEXT;   -- sent | delivered | read | failed
CREATE INDEX IF NOT EXISTS idx_carrinhos_whatsapp_msg ON carrinhos (whatsapp_msg_id);

CREATE TABLE IF NOT EXISTS whatsapp_mensagens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wa_msg_id TEXT UNIQUE,                       -- id da Meta (evita gravar duas vezes o mesmo aviso)
  telefone TEXT NOT NULL,                      -- DDD + número, sem 55
  nome_perfil TEXT,
  direcao TEXT NOT NULL CHECK (direcao IN ('entrada', 'saida')),
  texto TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  enviado_por TEXT                             -- e-mail de quem respondeu pela gestão (saída)
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_telefone ON whatsapp_mensagens (telefone, criado_em);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_criado ON whatsapp_mensagens (criado_em);
