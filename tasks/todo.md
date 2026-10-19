# Em andamento e esperando o Paulo

Só o que ainda está aberto. O detalhe de cada frente fica em `tasks/arquivo/`, e o resumo do que já foi feito, no `HISTORICO.md` do Drive. Atualizado em 19/10/2026.

Os itens marcados "conferir" vieram de frentes antigas e podem já ter sido resolvidos por trabalho posterior. Confirme antes de agir e apague o que já estiver feito.

## Segurança: revisão de base de 19/10 (relatório privado em `~/tv-backups/seguranca/2026-10-19-baseline.md`)
- [x] 3 achados médios consertados com teste e publicados (19/10).
- [ ] 5 achados baixos (detalhe no relatório).
- [ ] Paulo: a conta da Stripe (reserva) recebe pagamentos de outros produtos? Se sim, falta o mesmo filtro do Mercado Pago no caminho da Stripe.

## Ferramentas (19/10)
- [ ] O build do OpenNext funciona em `C:\dev`, mas leva ~50 min (antivírus?). Paulo: exclusão do Defender para `C:\dev` e OK para remover `~/tv-build` (detalhe em `docs/setup.md`).
- [ ] Robô, branch `whatsapp-acesso-meta` (2 commits, pronta desde 19/10; 214 testes passando): a recusa de token/acesso pela Meta não encerra mais o WhatsApp do carrinho; 1 e-mail de aviso por dia. Foi rebaseada sobre a `main` e a migração renumerada para `0015` (a `0012` já existia). A revisão do Codex achou 2 problemas, já corrigidos com teste. **Para publicar, nesta ordem e com OK do Paulo:** (1) `npx wrangler d1 execute trilha-viva --remote --file migrations/0015_whatsapp_aviso_acesso.sql`; (2) merge na `main`; (3) `cd workers/recuperacao-carrinho && npx wrangler deploy`. Sem a 0015, o aviso por e-mail falha, mas os envios continuam. Deixado para depois (menor): o e-mail de aviso pode sair 2 vezes no dia se a conexão com o Resend cair depois do envio (falta uma chave de idempotência).

## WhatsApp `acesso_liberado` (na `main` desde 19/10)
- [ ] Quando a Meta aprovar o modelo: `WA_ACESSO=ativo` no www e conferir o teste no celular do Paulo.
- O robô agora pode ser publicado a partir da `main` (a branch `acesso-liberado-robo` entrou junto com `organizacao`).
Detalhe: `arquivo/2026-10-12-whatsapp-acesso-liberado-e-cpu-do-checkout.md`.

## Provas em produção que dependem do Paulo (conferir)
- [ ] Compra real de R$ 1,00 no cartão (outra conta) e Pix no celular; conferir os números da gestão, o log do robô e a CPU do `/api/checkout` e do webhook. Detalhe: `arquivo/2026-10-12-pos-pagamento-volta-automatica-e-compras-de-teste.md` e `arquivo/2026-10-12-rastreamento-das-vendas.md`.
- [ ] Prova do Mercado Pago no formulário com fundo animado. Detalhe: `arquivo/2026-10-12-fundo-animado-no-topo-da-pagina-inicial.md`.
- [ ] WhatsApp em sequência: conferir na tela real e a CPU do cron. Os modelos `carrinho_preco`/`carrinho_acervo` estavam em análise na Meta. Detalhe: `arquivo/2026-10-04-whatsapp-em-sequencia-plano-a.md`.
- [ ] Recuperação por e-mail: teste real do lembrete com um e-mail sem compra. Detalhe: `arquivo/2026-09-29-recuperacao-de-carrinho-por-e-mail.md`.

## Segurança
- [ ] Paulo: confirmar que o 1º token da Meta (colado no chat em 02/10) foi **revogado**. Se não foi, revogar no painel da Meta. Detalhe: `arquivo/2026-10-02-whatsapp-pela-api-oficial-da-meta.md`.

## WhatsApp pela API da Meta (conferir)
Em 02/10 ficaram 14 itens abertos: modelo `carrinho_lembrete`, teste do SAIR, cartão na Meta, ligar de verdade, verificação da empresa, número real e reenvio do acesso do Rafael. Vários podem ter sido resolvidos pelas frentes seguintes (sequência, ligar automático, número real).
- Detalhe: `arquivo/2026-10-02-whatsapp-pela-api-oficial-da-meta.md`.
- Checklist "Para ligar": `tasks/whatsapp.md`.
- Guia do Paulo: `tasks/whatsapp-passo-a-passo-paulo.md`.

## Menu de gestão (conferir)
- [ ] Paulo: apagar a variável `CUPOM_TESTE` no painel (o código já não lê).
- [ ] Paulo: confirmar a compra de R$ 1,00 de 24/09 (mp_179645402809).
- [ ] Prova em produção da Equipe: membro novo, troca de senha, removido perde o acesso.
- [ ] Ideias da Fase 4 ainda não feitas: entrega do acesso idempotente (`compras.acesso_enviado_em`) e partes da visão geral e das ações.
- Reembolso: ADIADO por decisão do Paulo (24/09).
Detalhe: `arquivo/2026-09-24-menu-de-gestao-plano-e-andamento.md`.

## Se as vendas caírem
- Tornar o WhatsApp opcional no checkout. A decisão de 03/10 foi manter obrigatório por enquanto.
