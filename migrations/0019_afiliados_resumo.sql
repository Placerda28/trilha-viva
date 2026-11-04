-- Fase 6 dos afiliados: controle do e-mail de resumo do fechamento. Só acrescenta colunas.
-- resumo_enviado_em: UTC, preenchido só quando o Resend aceitou o e-mail (idempotência).
-- resumo_tentativas: tentativas feitas; o robô para em 3.
ALTER TABLE afiliados_fechamentos ADD COLUMN resumo_enviado_em TEXT;
ALTER TABLE afiliados_fechamentos ADD COLUMN resumo_tentativas INTEGER NOT NULL DEFAULT 0;
