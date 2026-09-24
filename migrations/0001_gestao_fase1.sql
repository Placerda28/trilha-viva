-- A forma fica em cache para o menu de gestão não consultar a operadora em
-- toda visita. Compras antigas continuam válidas com NULL e são preenchidas
-- aos poucos pelas rotas de gestão.
ALTER TABLE compras ADD COLUMN forma_pagamento TEXT;

-- Sustenta os filtros de vendas pagas por intervalo sem varrer compras de
-- outros estados.
CREATE INDEX IF NOT EXISTS idx_compras_status_data ON compras(status, criado_em);
