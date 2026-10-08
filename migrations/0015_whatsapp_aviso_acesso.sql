-- Aviso de "WhatsApp parado" (token ou acesso recusado pela Meta), no máximo
-- 1 e-mail por dia (08/10/2026). Guarda o dia de Brasília do último aviso.
ALTER TABLE whatsapp_estado ADD COLUMN acesso_avisado_em TEXT;   -- AAAA-MM-DD
