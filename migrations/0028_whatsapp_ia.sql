-- Rascunhos de resposta da IA para o WhatsApp (11/2026). Mesma ideia do Instagram (0027).
-- Só acrescenta tabelas. Nenhum envio sai sem o clique de um admin na Gestão.

CREATE TABLE IF NOT EXISTS whatsapp_rascunhos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telefone TEXT NOT NULL,                -- DDD + número, sem 55 (igual a whatsapp_mensagens)
  ate_mensagem_id INTEGER NOT NULL,      -- última mensagem de entrada que o rascunho considerou
  texto TEXT,
  situacao TEXT,
  precisa_humano INTEGER NOT NULL DEFAULT 0,
  motivo TEXT,
  status TEXT NOT NULL DEFAULT 'gerando'
    CHECK (status IN ('gerando','pendente','enviado','editado','descartado','substituido','expirado','falhou','respondido_no_app')),
  texto_enviado TEXT,
  provedor TEXT,
  modelo TEXT,
  tokens_entrada INTEGER,
  tokens_saida INTEGER,
  erro TEXT,
  tentativas INTEGER NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  decidido_em TEXT,
  decidido_por TEXT
);
-- No máximo um rascunho aberto por conversa.
CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_rascunho_aberto
  ON whatsapp_rascunhos (telefone) WHERE status IN ('gerando', 'pendente');
CREATE INDEX IF NOT EXISTS idx_wa_rascunho_status ON whatsapp_rascunhos (status, criado_em);
CREATE INDEX IF NOT EXISTS idx_wa_rascunho_conversa ON whatsapp_rascunhos (telefone, ate_mensagem_id);

-- Liga/desliga a IA do WhatsApp pela Gestão. Nasce DESLIGADA.
CREATE TABLE IF NOT EXISTS whatsapp_ia_estado (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  ia_ligada INTEGER NOT NULL DEFAULT 0,
  atualizado_em TEXT,
  atualizado_por TEXT
);
INSERT OR IGNORE INTO whatsapp_ia_estado (id, ia_ligada) VALUES (1, 0);
