-- De onde veio quem virou afiliado (UTM do anúncio, ex.: utm=meta/paid/afiliados).
-- Só acrescenta. Mesmo formato da coluna origem dos carrinhos; só diagnóstico.
-- Aplicar no D1 remoto ANTES do deploy que grava a coluna.
ALTER TABLE afiliados ADD COLUMN origem TEXT;
