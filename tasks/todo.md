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
6. [x] **Exclusão do Defender para `C:\dev` feita pelo Paulo em 20/10** (medir o tempo no próximo build). Texto original: exclusão do Defender para `C:\dev`, como administrador, para o build do OpenNext deixar de levar ~50 min.

**Como retomar:** abra o Claude Code em `C:\dev\trilha-viva` e diga "continuar de onde paramos". O `AGENTS.md` leva aos docs; este arquivo diz o que fazer; o `HISTORICO.md` do Drive mostra o que foi feito.

## Segurança: revisão de base de 19/10 (relatório privado em `~/tv-backups/seguranca/2026-10-19-baseline.md`)
- [x] 3 achados médios consertados com teste e publicados (19/10).
- [x] 5 achados baixos tratados em 20/10: B-1 aceito pelo Paulo; B-2 checkout/carrinho usam `cf-connecting-ip` (falta freio de cupom no D1 ou regra de rate limit da Cloudflare); B-3 carrinho pago não revela dados; B-4 aceito (reenvio é idempotente, prazo arriscaria reenvios legítimos); B-5 `/api/baixar` recusa `Sec-Fetch-Site` de outro site. Revisão do Codex: nenhum problema real.
- [x] Stripe desativada (Paulo, 20/10): sem filtro a aplicar.

## Ferramentas (19/10)
- [x] Exclusão do Defender feita (20/10); conferir se o build caiu de ~50 min. Antes: exclusão do Defender para `C:\dev` (administrador). O `~/tv-build` foi removido em 19/10.
- [x] Robô `whatsapp-acesso-meta` publicado em 19/10 (versão 6358fe4b, commit 064ec7a): recusa de token/acesso pela Meta não encerra o WhatsApp do carrinho; 1 e-mail de aviso por dia. A coluna da migração `0015` já existia em produção (aplicada em 08/10 com o número antigo); backup em `~/tv-backups/d1-antes-0015.sql`.
- [x] E-mail de aviso com chave de idempotência do dia (20/10).

## Conferido em 20/10 (resolvido pelo uso real, sai da lista)
- `acesso_liberado` ligado e provado na compra de teste 91.
- Cartão e Pix provados por vendas reais: 19 no cartão e 22 no Pix até 20/10, chegando à Meta (`meta_status=ok`).
- Recuperação por e-mail rodando: 24 lembretes da 1ª etapa e 14 da 2ª.
- WhatsApp em sequência ativo desde 04/10, com os 3 modelos aprovados e as 3 etapas saindo.
- Número real e ligação sem deploy em uso (`whatsapp_estado=ativo`).
- Coluna WhatsApp em Clientes no ar (`components/gestao/ClientesTabela.jsx`).
- Acesso do Rafael reenviado em 03/10 (registro `acesso_reenviado`).
- `CUPOM_TESTE` não existe mais no `www`.

## Ainda aberto
- [ ] Paulo: a compra de R$ 1,00 de 24/09 (`mp_179645402809`, compra 10) está como venda real (`teste=0`). Se foi teste, marcar na gestão para não somar nos números.
- [ ] Prova da Equipe: removido perde o acesso. Membro novo e troca de senha já ocorreram (Kaylan, 24/09).
- [ ] SAIR do WhatsApp nunca foi usado em produção (`descadastros` vazio). Provar só com OK do Paulo.
- [ ] Paulo: verificação da empresa na Meta (recomendado: evita o erro 130497 e aumenta o limite).
- [ ] CPU do `/api/checkout`, do webhook e do cron no painel da Cloudflare (Observability).
- [ ] Ideia da Fase 4: entrega do acesso idempotente (`compras.acesso_enviado_em`, coluna ainda não existe).
- Reembolso: ADIADO por decisão do Paulo (24/09).
- Futuro: o Direct do Instagram e o Messenger não chegam à gestão (são outros canais).
- Detalhes antigos: `arquivo/2026-10-02-whatsapp-pela-api-oficial-da-meta.md`, `arquivo/2026-09-24-menu-de-gestao-plano-e-andamento.md`, `arquivo/2026-10-12-*.md`.

## Se as vendas caírem
- Tornar o WhatsApp opcional no checkout. A decisão de 03/10 foi manter obrigatório por enquanto.
