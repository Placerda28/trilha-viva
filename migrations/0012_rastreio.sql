-- Rastreamento das vendas (12/10/2026): origem da visita e envio à Meta.
-- Só acrescenta colunas vazias; nenhum dado existente muda.

-- Carrinho: identificadores da Meta de quem abriu o pagamento e a origem (UTM).
ALTER TABLE carrinhos ADD COLUMN fbp TEXT;
ALTER TABLE carrinhos ADD COLUMN fbc TEXT;
ALTER TABLE carrinhos ADD COLUMN ip TEXT;
ALTER TABLE carrinhos ADD COLUMN ua TEXT;
ALTER TABLE carrinhos ADD COLUMN utm_source TEXT;
ALTER TABLE carrinhos ADD COLUMN utm_medium TEXT;
ALTER TABLE carrinhos ADD COLUMN utm_campaign TEXT;
ALTER TABLE carrinhos ADD COLUMN utm_content TEXT;

-- Compra: a origem que trouxe a venda e o resultado do envio à Meta.
ALTER TABLE compras ADD COLUMN utm_source TEXT;
ALTER TABLE compras ADD COLUMN utm_medium TEXT;
ALTER TABLE compras ADD COLUMN utm_campaign TEXT;
ALTER TABLE compras ADD COLUMN utm_content TEXT;
ALTER TABLE compras ADD COLUMN meta_enviado_em TEXT;   -- primeiro envio aceito pela Meta (UTC)
ALTER TABLE compras ADD COLUMN meta_status TEXT;       -- ok | http_400 | falhou | nao_configurado
