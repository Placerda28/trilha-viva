# Modelos de WhatsApp dos leads da VS grátis (textos aprovados pelo Paulo em 05/11/2026)

Onde criar: **https://business.facebook.com/wa/manage/message-templates** → **Criar modelo**. Confira no topo se é a conta do WhatsApp oficial da Trilha Viva, a mesma do `carrinho_lembrete`.

Configuração igual para os 4:
- Categoria **Marketing**, tipo **Padrão / Personalizado**.
- Idioma **Português (BR)**.
- `{{1}}` no corpo = primeiro nome. Exemplo: `Paulo`.
- **Botões** (os mesmos nos 4):
  - **Visitar site**: URL **dinâmica** `https://trilhaviva.org/{{1}}`, com exemplo `musicas?utm_source=whatsapp&utm_campaign=lead_vs`. O robô completa o fim do link em cada mensagem.
  - **Resposta rápida**: `Não quero receber`.

## `lead_vs_1` (5 minutos depois do pedido)
Corpo:
```
Oi, {{1}}! Aqui é a Trilha Viva 🎶 Sua VS grátis já está liberada. Depois de usar, conta pra gente o que achou!

Além dela, temos um acervo com mais de 2.000 VS por um excelente preço e com acesso vitalício. Se quiser adquirir, é só acessar o link abaixo.
```
Texto do botão do site: `Conhecer o acervo`

## `lead_vs_2` (3 dias depois)
Corpo:
```
{{1}}, já testou a VS no ensaio? Na Trilha Viva você tem mais de 2.000 multitracks gospel com clique, guia e cada instrumento separado, num pagamento único de R$ 89,90.
```
Texto do botão do site: `Conhecer o acervo`

## `lead_vs_3` (5 dias depois)
Corpo:
```
{{1}}, imagina ter o repertório do mês inteiro pronto, com clique e guia, sem pagar por música. São 2.000 VS por R$ 89,90, com acesso para sempre.
```
Texto do botão do site: `Ver o pacote`

## `lead_vs_4` (7 dias depois)
Corpo:
```
{{1}}, esta é a nossa última mensagem por aqui. Se quiser montar seu repertório com as 2.000 multitracks da Trilha Viva, o link está abaixo. Deus abençoe o seu ministério!
```
Texto do botão do site: `Quero o pacote`

Depois de criar os 4, clique em **Enviar para análise**. A aprovação costuma sair em minutos, mas pode levar até 1 dia. O robô só manda um modelo depois que ele aparece como **Aprovado**.
