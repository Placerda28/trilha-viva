# Em andamento e esperando o Paulo

Só o que ainda está aberto. O detalhe de cada frente fica em `tasks/arquivo/`, e o resumo do que já foi feito, no `HISTORICO.md` do Drive. Atualizado em 19/10/2026.

Os itens marcados "conferir" vieram de frentes antigas e podem já ter sido resolvidos por trabalho posterior. Confirme antes de agir e apague o que já estiver feito.

## Próxima sessão: comece por aqui (deixado em 21/10/2026)

O roteiro de 19/10 foi concluído em 20 e 21/10 (detalhe no `HISTORICO.md` do Drive). No ar: site `df79b202`, robô `7b99c0c1`, Palco `1e310dd8`.

**Testes do Paulo (pediu para fazer outra hora).** Ao voltar, pergunte quais ele já fez e confira o que der no banco:
1. **Gestão do site:** abrir as abas Cupons, Recuperação e WhatsApp e ver se algo ficou estranho. Elas mudaram por dentro em 21/10, com a divisão dos arquivos grandes; o comportamento deveria ser o mesmo.
2. **Equipe:** remover um membro e conferir que ele perde o acesso à gestão.
3. **SAIR do WhatsApp:** tocar em "Não quero receber" num lembrete. Depois eu confiro a tabela `descadastros` e o carrinho.
4. **Palco ao vivo:** partes no lugar certo, pulo natural, guia anunciando o destino e fader de rampa, inclusive durante o crossfade.
5. **Acesso da compra:** na próxima venda real, o acesso deve chegar uma vez só (`compras.acesso_enviado_em` preenchido).

**Frentes grandes, cada uma em sessão própria:**
- **Next 16 no site.** O Next 15 saiu do suporte em 21/10; o build só passa por causa da opção `--dangerouslyUseUnsupportedNextVersion` no painel da Cloudflare. Planejar antes de fazer.
- **Palco:** dividir `app/src/audio/motores.ts`, que exige plano e prova de áudio; consertar o teste instável do potenciômetro (ver `tasks/todo.md` do Palco).

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
- [ ] **URGENTE: build automático quebrado desde 21/10.** O OpenNext recusa Next 15 (2 anos do lançamento, 21/10/2024). Todo push na `main` falha no Workers Builds. Publicado à mão em 21/10 (www `40ce34ce`) com `npx opennextjs-cloudflare build --dangerouslyUseUnsupportedNextVersion && npx opennextjs-cloudflare deploy`. Paulo pôs a opção no comando de build do painel em 21/10. Falta o definitivo: subir para Next 16 (o 15 deixa de receber consertos de segurança).
- [x] Compra 10 (`mp_179645402809`, Kaylan) marcada como teste em 20/10 (Paulo confirmou).
- [ ] Prova da Equipe: removido perde o acesso (Paulo vai testar em 20/10). Membro novo e troca de senha já ocorreram (Kaylan, 24/09).
- [ ] SAIR do WhatsApp nunca foi usado em produção (`descadastros` vazio). Paulo deu OK em 20/10: falta ele tocar em "Não quero receber" num lembrete e eu conferir.
- [x] Verificação da empresa na Meta: feita (Paulo, 20/10).
- [x] CPU conferida em 20/10 (7 dias, API GraphQL): www 48.289 pedidos, 0 erros, p50 8 ms, p99 311 ms, nenhum `exceededCpu`; robô 1.055 rodadas, 0 erros, máx. 30 ms.
- [x] Entrega do acesso idempotente no ar em 21/10 (commits `4f7a363`, `bc0b61f`, `dc5b917`; migração 0016 aplicada antes, backup em `~/tv-backups/d1-compras-antes-0016.sql`). Prova: próxima compra real recebe o acesso uma vez.
- Reembolso: ADIADO por decisão do Paulo (24/09).
- Futuro: o Direct do Instagram e o Messenger não chegam à gestão (são outros canais).
- Detalhes antigos: `arquivo/2026-10-02-whatsapp-pela-api-oficial-da-meta.md`, `arquivo/2026-09-24-menu-de-gestao-plano-e-andamento.md`, `arquivo/2026-10-12-*.md`.

## Se as vendas caírem
- Tornar o WhatsApp opcional no checkout. A decisão de 03/10 foi manter obrigatório por enquanto.
