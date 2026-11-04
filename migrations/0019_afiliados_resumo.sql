-- Fase 6 dos afiliados: controle de entrega dos e-mails de resumo do fechamento e de "faltam X vendas".
-- Só acrescenta colunas e um índice. Datas em UTC, texto 'AAAA-MM-DD HH:MM:SS'.
--
-- Resumo do fechamento (afiliados_fechamentos):
--   resumo_enviado_em: preenchido só quando o Resend aceitou o e-mail (ou respondeu 409 da mesma chave).
--   resumo_tentativas: tentativas feitas; o robô para em 3.
--   resumo_primeira_tentativa_em: a chave de idempotência do Resend vale 24 h; o robô só repete dentro de 20 h.
--   resumo_saldo_centavos: saldo disponível congelado na 1ª tentativa, para o corpo do e-mail não mudar entre
--   tentativas (corpo diferente com a mesma chave dá 409 no Resend).
ALTER TABLE afiliados_fechamentos ADD COLUMN resumo_enviado_em TEXT;
ALTER TABLE afiliados_fechamentos ADD COLUMN resumo_tentativas INTEGER NOT NULL DEFAULT 0;
ALTER TABLE afiliados_fechamentos ADD COLUMN resumo_primeira_tentativa_em TEXT;
ALTER TABLE afiliados_fechamentos ADD COLUMN resumo_saldo_centavos INTEGER;

-- E-mail de um aviso do painel (hoje só "faltam:AAAA-MM"). O aviso continua 1 só; a entrega é controlada aqui.
--   email_dados: JSON congelado na criação do aviso (nunca recalculado).
--   Avisos sem e-mail ficam com email_dados NULL e nunca entram na fila.
ALTER TABLE afiliados_avisos ADD COLUMN email_dados TEXT;
ALTER TABLE afiliados_avisos ADD COLUMN email_enviado_em TEXT;
ALTER TABLE afiliados_avisos ADD COLUMN email_tentativas INTEGER NOT NULL DEFAULT 0;
ALTER TABLE afiliados_avisos ADD COLUMN email_primeira_tentativa_em TEXT;
CREATE INDEX IF NOT EXISTS idx_afiliados_avisos_tipo ON afiliados_avisos(tipo);
