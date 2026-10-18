# WhatsApp em sequência — plano A (04/10/2026)

Branch `whatsapp-sequencia` (saiu de main 5307bea). Pedido do Paulo/Cowork em 04/10.
Regra: 1ª 3 h depois do carrinho; depois 1 por semana (contada da 1ª) até 9 no total; só 9h–20h de Brasília;
da 2ª em diante nunca no dia de um e-mail (vai para as 9h do dia seguinte). Para: compra (telefone ou e-mail),
pedido de saída, 2 últimas não entregues, 3 últimas entregues e não lidas, qualquer resposta (pausa; a gestão retoma).
Uma sequência por telefone/e-mail; nova só 60 dias depois de encerrada. Carrinho com mais de 48 h não entra.
Modelos: 1ª carrinho_lembrete; depois preço → acervo → lembrete, só APPROVED (consulta à Meta no máx. a cada 30 min).

## Estado em produção conferido (04/10, só leitura)
- [x] whatsapp_estado = ativo; modelo APPROVED (conferido 17:50 UTC). Teste para o Paulo enviado 17:50:16 UTC (14:50 Brasília), a Meta aceitou (tem id) e não houve aviso de falha.
- [x] Ligado pela gestão por paulohenrique_ls@hotmail.com em 04/10 17:51:37 UTC (14:51 Brasília), 1 min depois do teste. Os links LIGAR/NÃO LIGAR foram apagados nessa hora (já não valem).
- [x] Envios reais: Jonathas (entregue) e Guilherme Freire (lido), os dois em 04/10 ~18:00 UTC (15:00 Brasília). Freio de 10/dia até 07/10 17:51 UTC.

## Feito e provado (local)
- [x] migrations/0010_whatsapp_sequencia.sql (NÃO aplicada em produção): lembretes_enviados aceita etapa 1–9 e guarda modelo, wa_msg_id, wa_status, wa_status_em, wa_erro; carrinhos.whatsapp_encerrado_em/whatsapp_motivo; tabela whatsapp_modelos; quem já recebeu a 1ª vira "1 de 9" com a 2ª uma semana depois.
- [x] lib/whatsapp-sequencia.js: regras puras (horário, dia de e-mail, semanas, paradas, rodízio), usadas pelo robô e pela gestão.
- [x] Robô: fila única 1ªs + semanais por ordem de vez (quem passou do teto sai primeiro amanhã); teto conta todas; varredura de compra/descadastro a cada rodada; resposta/SAIR param na hora pelo webhook; status por mensagem com a hora (ex.: lido 15:02); erro da conta (cartão, token) adia para amanhã sem contar contra a pessoa, erro do número (131026 etc.) conta como não entregue; link com utm_content=semanaN.
- [x] Resumo diário: enviadas/entregues/lidas por mensagem (1ª, 2ª...), voltaram ao checkout pelo botão (por semanaN), compraram hoje depois de um WhatsApp, sequências que pararam hoje por motivo, recusas.
- [x] Checkout guarda o utm_content na origem do carrinho (utm=whatsapp/lembrete/carrinho/semanaN).
- [x] Gestão → Recuperação: coluna WhatsApp com 9 casas no padrão dos e-mails (escura = lida, meio-tom = entregue, contorno = enviada/próxima, vermelha = não entregue com o código ao tocar), "1º enviado ... · lido 15:02" e "2º previsto ..." ou "Encerrado: motivo".
- [x] Gestão → Recuperação → WhatsApp: lista de sequências ("Mensagem X de 9", próxima, motivo), botão Parar sequência (com confirmação) e Retomar (só quem respondeu); rota POST /api/gestao/whatsapp/sequencia só admin, registrada. Consultas únicas, sem uma por linha.
- [x] Privacidade: até nove lembretes, um por semana.
- [x] Provas: 147 testes (19 novos: horário, 9 semanas e fim, os 5 motivos, dia de e-mail, rodízio pulando não aprovado, > 48 h, teto empurrando para amanhã, mesmo telefone = 1 sequência e 60 dias, erro da conta x do número, migração, parar/retomar); teste de mutação (quebrar a regra do e-mail e a do "não lê" derruba 4 testes); Meta simulada (modelos aprovados/não, delivered/read/failed pelo webhook assinado); next build e build do OpenNext limpos; dry-run do robô limpo.
- [x] Telas no site montado localmente (banco local com pessoas fictícias), 1280 e 390: sem erro no console, sem rolagem lateral; cópia fictícia do Guilherme mostra "1º enviado 04/10/2026 15:00 · lido 15:02" e "2º previsto 12/10/2026 09:00".

## Decisão tomada no caminho (confirmar com o Paulo)
- A regra "nunca no dia de um e-mail" vale da 2ª em diante. A 1ª (3 h depois) cai quase sempre no dia do 1º e-mail (1 h depois); aplicar a regra a ela empurraria todas as 1ªs para o dia seguinte. Se o Paulo quiser que valha também para a 1ª, é uma linha.

## Custo
- R$ 0,32 por mensagem de marketing. Pior caso: 9 × R$ 0,32 ≈ R$ 2,90 por carrinho. As paradas (compra, sair, não entregue, não lê, respondeu) derrubam bastante.

## Publicado (04/10, OK do Paulo)
- [x] 0010 aplicada em produção (Paulo liberou a regra): antes e depois 33 carrinhos, 14 lembretes, 19 compras, R$ 1.261,10, 19 clientes; Jonathas e Guilherme viraram "1 de 9" com id e status; nenhum envio órfão.
- [x] main 3a8521b (147 testes). Robô ba8fbf2c. Site www c084f281 (com .env.local; o build travou 3 vezes com código 127 por restos do next dev/workerd do teste local; encerrados, passou).
- [x] No ar: home/privacidade/assinar 200 (privacidade com "até nove"); gestão e /api/gestao/whatsapp/sequencia 404 sem login; login vazio 400; webhook sem assinatura 401.
- Publicado às 22:15 de Brasília: o robô novo só envia a partir das 9h de 05/10. whatsapp_modelos se preenche na 1ª rodada com fila.

## Falta
- [ ] Depois do deploy: conferir na tela real (computador e celular) o Guilherme com "1º enviado 04/10 15:00 · lido" e "2º previsto 12/10"; CPU do cron no painel (Observability) nas primeiras rodadas.
- [ ] carrinho_preco e carrinho_acervo em análise na Meta: até aprovarem, a 2ª em diante sai com o carrinho_lembrete (o robô troca sozinho quando aprovar).

---
