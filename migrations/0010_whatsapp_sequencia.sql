-- Sequência do WhatsApp (plano A, 04/10/2026): 1ª 3 h depois do carrinho,
-- depois 1 por semana até 9 mensagens por pessoa.
-- lembretes_enviados guarda cada mensagem (etapa 1 a 9) com o modelo e o
-- status da Meta. O carrinho que abriu a sequência guarda em que ponto ela
-- está (whatsapp_etapa, proximo_whatsapp_em) e, se parou, quando e por quê.

-- SQLite não altera CHECK: recria a tabela (o D1 roda o arquivo inteiro de uma
-- vez e volta ao estado anterior se algo falhar).
CREATE TABLE lembretes_enviados_novo (
  carrinho_id TEXT NOT NULL,
  canal TEXT NOT NULL DEFAULT 'email' CHECK (canal IN ('email', 'whatsapp')),
  etapa INTEGER NOT NULL CHECK (etapa BETWEEN 1 AND 9),
  enviado_em TEXT NOT NULL DEFAULT (datetime('now')),
  modelo TEXT,                     -- WhatsApp: modelo usado
  wa_msg_id TEXT,                  -- WhatsApp: id da mensagem na Meta (wamid)
  wa_status TEXT,                  -- WhatsApp: sent | delivered | read | failed
  wa_status_em TEXT,               -- WhatsApp: quando o status mudou (ex.: hora da leitura)
  wa_erro TEXT,                    -- WhatsApp: código do erro da Meta
  PRIMARY KEY (carrinho_id, canal, etapa)
);
INSERT INTO lembretes_enviados_novo (carrinho_id, canal, etapa, enviado_em)
  SELECT carrinho_id, canal, etapa, enviado_em FROM lembretes_enviados;
DROP TABLE lembretes_enviados;
ALTER TABLE lembretes_enviados_novo RENAME TO lembretes_enviados;
CREATE INDEX IF NOT EXISTS idx_lembretes_enviado_em ON lembretes_enviados (enviado_em);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lembretes_wa_msg ON lembretes_enviados (wa_msg_id)
  WHERE wa_msg_id IS NOT NULL;

-- A mensagem que já saiu pela regra antiga vira a 1ª da sequência, com o id e
-- o status que estavam no carrinho.
UPDATE lembretes_enviados
   SET modelo = 'carrinho_lembrete',
       wa_msg_id = (SELECT c.whatsapp_msg_id FROM carrinhos c WHERE c.id = lembretes_enviados.carrinho_id),
       wa_status = (SELECT c.whatsapp_status FROM carrinhos c WHERE c.id = lembretes_enviados.carrinho_id),
       wa_erro = (SELECT c.whatsapp_erro FROM carrinhos c WHERE c.id = lembretes_enviados.carrinho_id)
 WHERE canal = 'whatsapp';

ALTER TABLE carrinhos ADD COLUMN whatsapp_encerrado_em TEXT;  -- quando a sequência parou
ALTER TABLE carrinhos ADD COLUMN whatsapp_motivo TEXT;        -- comprou | descadastro | nao_entregue | nao_le | respondeu | fim | gestao

-- Quem já recebeu a 1ª: "1 de 9", a 2ª uma semana depois daquele envio (o robô
-- e a gestão ainda empurram para o horário e para fora do dia de e-mail).
UPDATE carrinhos
   SET whatsapp_etapa = 1,
       proximo_whatsapp_em = datetime(whatsapp_enviado_em, '+7 days')
 WHERE whatsapp_enviado_em IS NOT NULL AND whatsapp_etapa = 0;

-- Status dos modelos na Meta (consultados no máx. 1 vez a cada 30 min).
CREATE TABLE IF NOT EXISTS whatsapp_modelos (
  nome TEXT PRIMARY KEY,
  status TEXT,                     -- APPROVED, PENDING, REJECTED, NAO_ENCONTRADO...
  botao_url INTEGER NOT NULL DEFAULT 0,  -- posição do botão "Finalizar compra" no modelo
  conferido_em TEXT
);
