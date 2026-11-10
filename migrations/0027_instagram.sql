-- Instagram Direct + rascunhos de resposta escritos pela IA (Fase 1, 11/2026).
-- Só acrescenta tabelas. Nenhum envio sai sem o clique de um admin na Gestão.

CREATE TABLE IF NOT EXISTS instagram_mensagens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ig_msg_id TEXT UNIQUE,                 -- "mid" da Meta: aviso repetido não duplica
  igsid TEXT NOT NULL,                   -- id da pessoa no Instagram (a conversa)
  usuario TEXT,                          -- @ do perfil (buscado uma vez)
  nome_perfil TEXT,
  direcao TEXT NOT NULL CHECK (direcao IN ('entrada', 'saida')),
  texto TEXT NOT NULL DEFAULT '',
  midia_tipo TEXT,                       -- image | video | audio | share | story_reply | story_mention | reel ...
  midia_url TEXT,                        -- URL da Meta (expira; só para abrir na hora)
  enviado_por TEXT,                      -- e-mail do admin; 'app' = respondido pelo celular (eco)
  rascunho_id INTEGER,                   -- saída que veio de um rascunho
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ig_msg_conversa ON instagram_mensagens (igsid, criado_em);
CREATE INDEX IF NOT EXISTS idx_ig_msg_criado ON instagram_mensagens (criado_em);

CREATE TABLE IF NOT EXISTS instagram_rascunhos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  igsid TEXT NOT NULL,
  ate_mensagem_id INTEGER NOT NULL,      -- última mensagem de entrada que o rascunho considerou
  texto TEXT,                            -- sugestão da IA
  situacao TEXT,                         -- código da situação do roteiro, ex.: S02_novidades
  precisa_humano INTEGER NOT NULL DEFAULT 0,
  motivo TEXT,                           -- por que precisa de humano / observação para o Paulo
  status TEXT NOT NULL DEFAULT 'gerando'
    CHECK (status IN ('gerando','pendente','enviado','editado','descartado','substituido','expirado','falhou','respondido_no_app')),
  texto_enviado TEXT,                    -- o que saiu de fato (para comparar com a sugestão)
  provedor TEXT,                         -- workers-ai | anthropic
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_ig_rascunho_aberto
  ON instagram_rascunhos (igsid) WHERE status IN ('gerando', 'pendente');
CREATE INDEX IF NOT EXISTS idx_ig_rascunho_status ON instagram_rascunhos (status, criado_em);
CREATE INDEX IF NOT EXISTS idx_ig_rascunho_conversa ON instagram_rascunhos (igsid, ate_mensagem_id);

-- Liga/desliga a IA pela Gestão (mesma ideia do whatsapp_estado). Nasce DESLIGADA.
CREATE TABLE IF NOT EXISTS instagram_estado (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  ia_ligada INTEGER NOT NULL DEFAULT 0,
  atualizado_em TEXT,
  atualizado_por TEXT
);
INSERT OR IGNORE INTO instagram_estado (id, ia_ligada) VALUES (1, 0);
