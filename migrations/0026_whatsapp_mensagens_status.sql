-- Status das mensagens que a gestão envia (sent | delivered | read | failed),
-- vindo do webhook da Meta. "read" só chega se o cliente deixa a confirmação
-- de leitura ligada; sem ela, a mensagem para em "delivered".
ALTER TABLE whatsapp_mensagens ADD COLUMN wa_status TEXT;
ALTER TABLE whatsapp_mensagens ADD COLUMN wa_status_em TEXT;
