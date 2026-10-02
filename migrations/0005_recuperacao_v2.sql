CREATE TABLE IF NOT EXISTS lembretes_enviados (
  carrinho_id TEXT NOT NULL,
  canal TEXT NOT NULL DEFAULT 'email' CHECK (canal IN ('email', 'whatsapp')),
  etapa INTEGER NOT NULL CHECK (etapa BETWEEN 1 AND 4),
  enviado_em TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (carrinho_id, canal, etapa)
);
CREATE INDEX IF NOT EXISTS idx_lembretes_enviado_em ON lembretes_enviados (enviado_em);

ALTER TABLE carrinhos ADD COLUMN etapa_email INTEGER NOT NULL DEFAULT 0;   -- quantos e-mails da sequência já saíram (0 a 4)
ALTER TABLE carrinhos ADD COLUMN proximo_email_em TEXT;                    -- quando o próximo passo vence (e-mail N+1 ou o encerramento)
ALTER TABLE carrinhos ADD COLUMN finalizado_em TEXT;                       -- protocolo encerrado
ALTER TABLE carrinhos ADD COLUMN finalizado_motivo TEXT;                   -- 'sequencia' | 'descadastro' | 'comprou'

CREATE INDEX IF NOT EXISTS idx_carrinhos_sequencia ON carrinhos (status, proximo_email_em);

-- Quem já recebeu o e-mail 1 (7 pessoas em 02/10) entra na sequência nova:
INSERT OR IGNORE INTO lembretes_enviados (carrinho_id, canal, etapa, enviado_em)
  SELECT id, 'email', 1, email_enviado_em FROM carrinhos WHERE email_enviado_em IS NOT NULL;
UPDATE carrinhos
   SET etapa_email = 1, proximo_email_em = datetime(email_enviado_em, '+7 days')
 WHERE email_enviado_em IS NOT NULL AND status = 'lembrado';
UPDATE carrinhos SET etapa_email = 1 WHERE email_enviado_em IS NOT NULL AND status <> 'lembrado';
