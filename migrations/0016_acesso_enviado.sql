-- Entrega do acesso idempotente (20/10/2026). O aviso do Mercado Pago só manda
-- o e-mail/WhatsApp de acesso se esta coluna estiver vazia, e a esvazia de novo
-- se nada saiu, para o próximo aviso tentar outra vez.
ALTER TABLE compras ADD COLUMN acesso_enviado_em TEXT;
-- As compras de antes já foram entregues pelo caminho antigo: nada de reenviar.
UPDATE compras SET acesso_enviado_em = criado_em WHERE acesso_enviado_em IS NULL;
