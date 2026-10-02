ALTER TABLE carrinhos ADD COLUMN whatsapp_falhou_em TEXT;   -- tentativa que falhou (não tenta de novo)
CREATE INDEX IF NOT EXISTS idx_carrinhos_telefone ON carrinhos (telefone);
