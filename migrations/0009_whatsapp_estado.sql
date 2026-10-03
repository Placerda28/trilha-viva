-- Estado do WhatsApp guardado no banco: ligar e pausar sem deploy.
-- aguardando_modelo → (Meta aprova, teste vai para o Paulo) → teste_enviado
--   → LIGAR → ativo | NÃO LIGAR → pausado. Pausar/Retomar também pela gestão.
CREATE TABLE IF NOT EXISTS whatsapp_estado (
  id INTEGER PRIMARY KEY CHECK (id = 1),       -- uma linha só
  estado TEXT NOT NULL DEFAULT 'aguardando_modelo'
    CHECK (estado IN ('aguardando_modelo', 'teste_enviado', 'ativo', 'pausado')),
  modelo_conferido_em TEXT,                    -- última consulta do modelo na Meta (no máx. 1 a cada 30 min)
  modelo_status TEXT,                          -- último status visto: PENDING, APPROVED, REJECTED...
  recusa_avisada TEXT,                         -- motivo da recusa já avisado por e-mail (não repete)
  teste_tentado_em TEXT,                       -- última tentativa do teste para o Paulo (no máx. 1 a cada 6 h)
  teste_msg_id TEXT,                           -- id da mensagem de teste (para ver se a Meta entregou)
  link_nonce TEXT,                             -- código de uso único dos links LIGAR / NÃO LIGAR
  link_expira_em TEXT,                         -- validade dos links (72 h)
  ligado_em TEXT,                              -- início dos 3 dias com teto de 10 por dia
  resumo_enviado_em TEXT,                      -- dia (Brasília, AAAA-MM-DD) do último resumo diário
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_por TEXT                          -- robô, link do e-mail ou e-mail de quem mudou na gestão
);
INSERT OR IGNORE INTO whatsapp_estado (id) VALUES (1);

-- Código do erro da Meta quando um lembrete é recusado (para o resumo diário).
ALTER TABLE carrinhos ADD COLUMN whatsapp_erro TEXT;
