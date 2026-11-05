-- Robô de conversão dos leads da VS grátis (05/11/2026). Só acrescenta. Datas em UTC.
-- WhatsApp: 4 mensagens (+5 min, +3, +5 e +7 dias do consentimento). E-mail: 4 mensagens
-- (na hora, +3, +5, +7 dias) e depois 1 por mês durante 4 meses. Convertido = comprou (leads.comprou).
ALTER TABLE leads ADD COLUMN whatsapp_etapa INTEGER NOT NULL DEFAULT 0;  -- mensagens já enviadas (0 a 4)
ALTER TABLE leads ADD COLUMN whatsapp_inicio_em TEXT;                    -- base das mensagens 2 a 4
ALTER TABLE leads ADD COLUMN proximo_whatsapp_em TEXT;                   -- NULL na etapa 0 = consentimento + 5 min
ALTER TABLE leads ADD COLUMN whatsapp_enviado_em TEXT;                   -- última mensagem enviada
ALTER TABLE leads ADD COLUMN whatsapp_encerrado_em TEXT;                 -- canal parou
ALTER TABLE leads ADD COLUMN whatsapp_motivo TEXT;                       -- falhou | respondeu | descadastro
ALTER TABLE leads ADD COLUMN encerrado_em TEXT;                          -- processo inteiro encerrado
ALTER TABLE leads ADD COLUMN encerrado_motivo TEXT;                      -- concluido | comprou | descadastrou | parado

CREATE TABLE IF NOT EXISTS leads_whatsapp (
  lead_id INTEGER NOT NULL,
  etapa INTEGER NOT NULL CHECK (etapa BETWEEN 1 AND 4),
  modelo TEXT NOT NULL,
  enviado_em TEXT NOT NULL DEFAULT (datetime('now')),
  wa_msg_id TEXT,
  wa_status TEXT,        -- sent | delivered | read | failed
  wa_status_em TEXT,
  wa_erro TEXT,
  PRIMARY KEY (lead_id, etapa)
);
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp_dia ON leads_whatsapp (enviado_em);
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_whatsapp_msg ON leads_whatsapp (wa_msg_id)
  WHERE wa_msg_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_abertos ON leads (id) WHERE encerrado_em IS NULL;

-- Quem já terminou: comprou ou se descadastrou.
UPDATE leads SET encerrado_em = COALESCE(comprou_em, datetime('now')), encerrado_motivo = 'comprou'
 WHERE comprou = 1;
UPDATE leads SET encerrado_em = datetime('now'), encerrado_motivo = 'descadastrou'
 WHERE descadastrado = 1 AND encerrado_em IS NULL;

-- E-mail: novo cronograma, contado do consentimento (etapas 1 a 3).
UPDATE leads SET proximo_email_em = datetime(consentimento_em,
    CASE etapa_email WHEN 1 THEN '+3 days' WHEN 2 THEN '+5 days' ELSE '+7 days' END)
 WHERE encerrado_em IS NULL AND consentimento = 1 AND etapa_email BETWEEN 1 AND 3
   AND proximo_email_em IS NOT NULL;
-- Quem já recebeu os 4 entra na fase mensal: 30 dias depois do último e-mail, nunca antes de amanhã
-- (sem e-mail em massa no dia da publicação).
UPDATE leads SET proximo_email_em = max(
    datetime(COALESCE(ultimo_envio_em, consentimento_em), '+30 days'), datetime('now', '+1 day'))
 WHERE encerrado_em IS NULL AND consentimento = 1 AND etapa_email = 4;
