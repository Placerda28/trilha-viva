# Em andamento e esperando o Paulo

Só o que ainda está aberto. O detalhe de cada frente fica em `tasks/arquivo/`, e o resumo do que já foi feito, no `HISTORICO.md` do Drive. Atualizado em 18/10/2026.

Os itens marcados "conferir" vieram de frentes antigas e podem já ter sido resolvidos por trabalho posterior. Confirme antes de agir e apague o que já estiver feito.

## Organização e toolkit (branch `organizacao`, 18/10)
- [ ] Revisar a branch e decidir o merge com o Paulo. Ela saiu de `acesso-liberado-robo`, então essa entra antes ou junto. Detalhe: `docs/superpowers/specs/2026-10-18-organizacao-e-toolkit-design.md`.
- [ ] Push de `organizacao` e do commit que só existe neste PC em `whatsapp-acesso-meta` (OK do Paulo).
- [ ] Atualizar `.env.example` e `.dev.vars.example` (ainda falam de Stripe e Drive).
- [ ] Remover `~/tv-build` quando o Paulo autorizar.

## WhatsApp `acesso_liberado` (branch `acesso-liberado-robo`)
- [ ] Quando a Meta aprovar o modelo: `WA_ACESSO=ativo` no www e conferir o teste no celular do Paulo.
- [ ] Merge da branch em `main` (OK do Paulo). Até lá, NÃO publicar o robô a partir da `main`.
Detalhe: `arquivo/2026-10-12-whatsapp-acesso-liberado-e-cpu-do-checkout.md`.

## Provas em produção que dependem do Paulo (conferir)
- [ ] Compra real de R$ 1,00 no cartão (outra conta) e Pix no celular; conferir os números da gestão, o log do robô e a CPU do `/api/checkout` e do webhook. Detalhe: `arquivo/2026-10-12-pos-pagamento-volta-automatica-e-compras-de-teste.md` e `arquivo/2026-10-12-rastreamento-das-vendas.md`.
- [ ] Prova do Mercado Pago no formulário com fundo animado. Detalhe: `arquivo/2026-10-12-fundo-animado-no-topo-da-pagina-inicial.md`.
- [ ] WhatsApp em sequência: conferir na tela real e a CPU do cron. Os modelos `carrinho_preco`/`carrinho_acervo` estavam em análise na Meta. Detalhe: `arquivo/2026-10-04-whatsapp-em-sequencia-plano-a.md`.
- [ ] Recuperação por e-mail: teste real do lembrete com um e-mail sem compra. Detalhe: `arquivo/2026-09-29-recuperacao-de-carrinho-por-e-mail.md`.

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
