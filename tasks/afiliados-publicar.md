# Afiliados: o que falta para publicar (preparado em 05/11/2026)

O branch `afiliados` (C:\dev\tv-afiliados) tem as fases 1 a 11 prontas e testadas só no PC: 623 testes passando, auditoria em `tasks/afiliados-seguranca.md` e planilha de conferência em `tasks/afiliados-conferencia.csv` (91 números conferidos, nenhum diferente). A `origin/main` não mudou desde a base (71df934), então o merge entra sem conflito.

## Decisões do Paulo (antes de publicar)
1. **Feito (05/11):** pagar e recusar saques, anexar comprovante, revelar CPF e Pix e baixar o CSV de saques pagos agora são só do master. O membro vê a fila de saques com o Pix mascarado.
2. **Mediação ganha depois do fechamento:** FEITO em 05/11 (decisão do dono: sim). O acesso volta e um ajuste positivo automático devolve a comissão, uma vez só.
3. **Cliques:** pôr ou não um limite por IP. Sem limite, dá para inflar a contagem de cliques. Isso não afeta o dinheiro.
4. **Feito (05/11):** o robô tem um orçamento de 46 consultas por rodada, dividido entre todas as etapas. Isso dá uns 14 e-mails por rodada; o que não cabe vai para a rodada seguinte, 10 min depois. Quando o limite é atingido, aparece um aviso no Painel da Gestão. Se o aviso aparecer todo dia, é hora de passar para o plano pago.
5. **Aprovado (05/11):** textos da página `/afiliados`.

## Ordem de publicação (o Paulo libera cada passo)
1. **Ponto de restauração do banco:** `npx wrangler d1 time-travel info trilha-viva` (anotar o bookmark).
2. **Migrações no D1 remoto, nesta ordem:**
   ```
   npx wrangler d1 execute trilha-viva --remote --file=migrations/0019_afiliados_resumo.sql
   npx wrangler d1 execute trilha-viva --remote --file=migrations/0020_afiliados_gestao.sql
   npx wrangler d1 execute trilha-viva --remote --file=migrations/0021_afiliados_alertas.sql
   ```
   Todas só acrescentam tabelas, colunas e índices. A 0020 e a 0021 são obrigatórias antes do site: sem elas, o cadastro e o menu da Gestão falham.
3. **Chave do Backblaze** (o Paulo cria a chave; o passo a passo está em `docs/architecture.md`, "Variáveis novas (Fase 7)"). Depois, o próprio Paulo grava os segredos:
   ```
   ! cd C:/dev/tv-afiliados && npx wrangler secret put B2_COMPROVANTES_KEY_ID
   ! cd C:/dev/tv-afiliados && npx wrangler secret put B2_COMPROVANTES_APP_KEY
   ```
   Sem eles, só o anexo do comprovante responde "Armazenamento de comprovantes não configurado". O resto funciona.
   Confira também se a chave de leitura do acervo (`B2_KEY_ID`) enxerga o prefixo `afiliados-comprovantes/`. Se não enxergar, o e-mail de pagamento sai sem o anexo.
4. **Site:** push do branch e merge na `main`. O build da Cloudflare depende de `--dangerouslyUseUnsupportedNextVersion` no painel. A reserva é o deploy manual: `npx opennextjs-cloudflare build --dangerouslyUseUnsupportedNextVersion && npx opennextjs-cloudflare deploy`.
5. **Robô:** `cd workers/recuperacao-carrinho && npx wrangler deploy`. Antes, confira se as variáveis do painel batem com o `wrangler.jsonc`. Ele leva o fechamento do dia 8, os e-mails de resumo e de "faltam X" e o bloqueio de lembretes para quem foi reembolsado.
6. **Provas depois de publicar:**
   - `POST` vazio em `/api/conta/entrar` dá 400;
   - `/afiliados` abre;
   - `/minha-conta/afiliado` sem login mostra "Criar minha conta de afiliado";
   - a Gestão abre a aba Afiliados com o Dashboard.
7. **Testes do Paulo:**
   1. Criar uma conta de afiliado com outro e-mail, receber o e-mail, criar a senha e se cadastrar.
   2. Abrir `trilhaviva.org/?ref=CODIGO` em outro aparelho, comprar e ver a comissão de R$ 15 liberando em 7 dias.
   3. Olhar o painel do afiliado.
   4. Na Gestão: Saques (pagar com comprovante, quando houver saldo), Dashboard e Ficha.
8. **Limpeza depois da aprovação:** apagar `app/prototipo-gestao-afiliados/` e `app/prototipo-gestao-afiliados-b/`. Em produção eles já respondem 404.

## Ainda não verificado de verdade
- Taxa e líquido do Mercado Pago (`fee_details` / `transaction_details.net_received_amount`) comparados com um pagamento real.
- Envio real ao B2 e e-mail com anexo pelo Resend: os testes usaram versões falsas desses serviços.
- CPU no Worker real: os testes no Node local deram no máximo 7,6 ms.
- Telas com login real: só o protótipo com dados falsos foi visto.
