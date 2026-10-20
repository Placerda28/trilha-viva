# Em andamento e esperando o Paulo

Só o que ainda está aberto. O detalhe de cada frente fica em `tasks/arquivo/`, e o resumo do que já foi feito, no `HISTORICO.md` do Drive. Atualizado em 19/10/2026.

Os itens marcados "conferir" vieram de frentes antigas e podem já ter sido resolvidos por trabalho posterior. Confirme antes de agir e apague o que já estiver feito.

## Próxima sessão: comece por aqui (deixado em 19/10/2026, 19h UTC)

**Estado no fim do dia 19/10:**
- Site no ar: `main` em `7c2ffba` (versão www `be4d8650`), com a organização, os consertos de segurança, o `next` 15.5.28 e o robô.
- Robô no ar: versão `6358fe4b`. Rodou às 19:00 depois do deploy.
- O `wrangler tail` não conecta nesta rede: prove a rodada do robô pelo D1 (`whatsapp_modelos.conferido_em`).
- Palco: a branch `organizacao` está no GitHub com o CI verde, mas fora da `main`. O Paulo vai tratar do Palco numa sessão só dele.
- O toolkit no site está concluído (`docs/setup.md`).

**Na ordem:**
1. [x] **WhatsApp de "acesso liberado" ligado em 20/10** (versão www `427487cc`). O `secret put` simples foi recusado porque a última versão era uma prévia não publicada da branch `organizacao` (Workers Builds sobe uma prévia a cada push fora da `main`). Caminho usado: `printf 'ativo' | npx wrangler versions secret put WA_ACESSO --name www` e depois `npx wrangler versions deploy <id>@100% --name www --yes`. Conferir antes que a prévia é do mesmo commit da produção.
2. [x] **Compra de teste feita em 20/10** (compra 91, Pix, teste=1; WhatsApp `acesso_liberado` saiu em 1 s). Paulo confirmou a liberação. Texto original: **Compra de teste real** (R$ 1,00, com outra conta). É a primeira depois dos consertos de segurança. Conferir:
   - a `/sucesso` libera e leva a criar a senha;
   - a compra aparece na gestão;
   - a compra chega à Meta pelo servidor (o Pixel não carrega mais na `/sucesso`);
   - se o item 1 foi feito, o WhatsApp de acesso chega.
3. [x] **Stripe: desativada, não recebe nada** (Paulo, 20/10). Filtro desnecessário. Texto original: perguntar ao Paulo se a conta recebe pagamentos de outros produtos. Se sim, aplicar ali o mesmo filtro do Mercado Pago.
4. **5 achados baixos** da revisão de segurança (relatório privado em `~/tv-backups/seguranca/2026-10-19-baseline.md`), um por vez, com teste e revisão do diff.
5. [x] **Robô publicado em 20/10** (versão `90992375`, commit `46e603b`): aviso de WhatsApp parado leva `Idempotency-Key` do dia. Texto original: chave de idempotência no e-mail de aviso, para não sair 2 vezes no mesmo dia.
6. **Opcional:** exclusão do Defender para `C:\dev`, como administrador, para o build do OpenNext deixar de levar ~50 min.

**Como retomar:** abra o Claude Code em `C:\dev\trilha-viva` e diga "continuar de onde paramos". O `AGENTS.md` leva aos docs; este arquivo diz o que fazer; o `HISTORICO.md` do Drive mostra o que foi feito.

## Segurança: revisão de base de 19/10 (relatório privado em `~/tv-backups/seguranca/2026-10-19-baseline.md`)
- [x] 3 achados médios consertados com teste e publicados (19/10).
- [x] 5 achados baixos tratados em 20/10: B-1 aceito pelo Paulo; B-2 checkout/carrinho usam `cf-connecting-ip` (falta freio de cupom no D1 ou regra de rate limit da Cloudflare); B-3 carrinho pago não revela dados; B-4 aceito (reenvio é idempotente, prazo arriscaria reenvios legítimos); B-5 `/api/baixar` recusa `Sec-Fetch-Site` de outro site. Revisão do Codex: nenhum problema real.
- [x] Stripe desativada (Paulo, 20/10): sem filtro a aplicar.

## Ferramentas (19/10)
- [ ] O build do OpenNext funciona em `C:\dev`, mas leva ~50 min (antivírus?). Opcional, Paulo: exclusão do Defender para `C:\dev` (administrador). O `~/tv-build` foi removido em 19/10.
- [x] Robô `whatsapp-acesso-meta` publicado em 19/10 (versão 6358fe4b, commit 064ec7a): recusa de token/acesso pela Meta não encerra o WhatsApp do carrinho; 1 e-mail de aviso por dia. A coluna da migração `0015` já existia em produção (aplicada em 08/10 com o número antigo); backup em `~/tv-backups/d1-antes-0015.sql`.
- [x] E-mail de aviso com chave de idempotência do dia (20/10).

## WhatsApp `acesso_liberado` (na `main` desde 19/10)
- [ ] A Meta **aprovou** o modelo `acesso_liberado` (status APPROVED no banco; o teste foi para o celular do Paulo em 13/10). Falta, com OK do Paulo: `printf 'ativo' | npx wrangler secret put WA_ACESSO` no www (publica na hora) e conferir numa compra de teste.
- O robô agora pode ser publicado a partir da `main` (a branch `acesso-liberado-robo` entrou junto com `organizacao`).
Detalhe: `arquivo/2026-10-12-whatsapp-acesso-liberado-e-cpu-do-checkout.md`.

## Provas em produção que dependem do Paulo (conferir)
- [ ] Compra real de R$ 1,00 no cartão (outra conta) e Pix no celular; conferir os números da gestão, o log do robô e a CPU do `/api/checkout` e do webhook. Detalhe: `arquivo/2026-10-12-pos-pagamento-volta-automatica-e-compras-de-teste.md` e `arquivo/2026-10-12-rastreamento-das-vendas.md`.
- [ ] Prova do Mercado Pago no formulário com fundo animado. Detalhe: `arquivo/2026-10-12-fundo-animado-no-topo-da-pagina-inicial.md`.
- [ ] WhatsApp em sequência: conferir na tela real e a CPU do cron. Os modelos `carrinho_preco`/`carrinho_acervo` estavam em análise na Meta. Detalhe: `arquivo/2026-10-04-whatsapp-em-sequencia-plano-a.md`.
- [ ] Recuperação por e-mail: teste real do lembrete com um e-mail sem compra. Detalhe: `arquivo/2026-09-29-recuperacao-de-carrinho-por-e-mail.md`.

## Segurança
- [x] O 1º token da Meta (colado no chat em 02/10) foi revogado, confirmado pelo Paulo em 19/10.

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
