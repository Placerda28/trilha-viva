-- Anexos e "Chamar de novo" nas conversas do WhatsApp da gestão (08/10/2026).
-- O arquivo em si fica na Meta (vale 30 dias); aqui só o id e o que mostrar.
ALTER TABLE whatsapp_mensagens ADD COLUMN midia_tipo TEXT;   -- image | document | audio | video | sticker
ALTER TABLE whatsapp_mensagens ADD COLUMN midia_id TEXT;     -- id da mídia na Meta
ALTER TABLE whatsapp_mensagens ADD COLUMN midia_nome TEXT;   -- nome do arquivo (documento)
ALTER TABLE whatsapp_mensagens ADD COLUMN midia_mime TEXT;   -- image/jpeg, application/pdf...
ALTER TABLE whatsapp_mensagens ADD COLUMN modelo TEXT;       -- saída por modelo pago (ex.: retomar_conversa)
