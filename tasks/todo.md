# Em andamento e esperando o Paulo

Só o que ainda está aberto. O detalhe de cada frente fica em `tasks/arquivo/`, e o resumo do que já foi feito, no `HISTORICO.md` do Drive. Atualizado em 19/10/2026.

Os itens marcados "conferir" vieram de frentes antigas e podem já ter sido resolvidos por trabalho posterior. Confirme antes de agir e apague o que já estiver feito.

## Ferramentas (19/10)
- [ ] O `npx opennextjs-cloudflare build` trava em `C:\dev` ("Bundling cache assets"). Investigar antes de remover `~/tv-build` (detalhe em `docs/setup.md`).
- [ ] `whatsapp-acesso-meta` (1 commit, no GitHub desde 19/10): decidir se entra na `main`.

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
