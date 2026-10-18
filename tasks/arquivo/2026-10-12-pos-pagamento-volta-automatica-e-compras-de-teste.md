# Pós-pagamento: volta automática e compras de teste, 12/10/2026

Branch `pos-pagamento` (saiu de main 9a510c6). Pedido do Paulo/Cowork em 12/10. Backend da Tarefa B feito pelo Codex (`tasks/pos-pagamento-codex.md`), revisado pelo Claude.

## A1. Diagnóstico (só leitura)
- [x] A preferência JÁ mandava `back_urls` (success e pending → `/sucesso`, failure → `/assinar?cancelado=1`), com endereço https absoluto, e `auto_return: "approved"`.
- [x] Documentação oficial do Checkout Pro: a volta automática acontece só com pagamento APROVADO, em até 40 segundos (não dá para mudar). A documentação não fala do Pix: a volta sozinha da tela do QR NÃO é garantida.
- [x] A `/sucesso` já conferia o pagamento, mas só por 80 s (20 × 4 s). Depois ficava parada em "Aguardando".
- [x] O webhook já gravava a compra e mandava o e-mail de criar senha (link de 7 dias, uso único).

## A2–A4. Feito
- [x] `/sucesso`: confere a cada 3 s por até 3 min (lib/pos-pagamento.js). Pago → criar senha com o e-mail travado; já tem senha → /entrar com o e-mail preenchido (pela memória da aba, nunca no endereço); esgotado → "Assim que o pagamento cair… e-mail p***@gmail.com (e WhatsApp, se ligado)" + "Já paguei, conferir de novo"; recusado → mensagem + "Tentar de novo".
- [x] "Primeiro acesso" (/primeiro-acesso, link na tela Entrar): link de criar senha de 72 h; mesma resposta com compra, sem compra e acima do limite; 3 pedidos/hora por e-mail e por IP (tabela `pedidos_acesso`, migração 0014).
- [x] WhatsApp `acesso_liberado` (lib/whatsapp-acesso.js) ligado no webhook do MP, DESLIGADO até a Meta aprovar e `WA_ACESSO=ativo`. Texto para aprovar: `tasks/whatsapp-acesso-liberado.md`.
- [x] E-mail de acesso: assunto atual "Crie sua senha e entre no acervo Trilha Viva" (já diz o que fazer). Rodapé agora manda para "Primeiro acesso" quando o link vence.

## B. Feito
- [x] Migração 0013: `teste`/`teste_por`/`teste_em` em compras e carrinhos, `contatos_teste` (2 e-mails + celular do Paulo), visões `compras_reais`/`carrinhos_reais` (o filtro mora num lugar só).
- [x] Gestão: "Marcar como teste"/"Desmarcar teste" em Clientes e Recuperação, "Parar lembretes" (status ignorado + WhatsApp encerrado, sem marcar teste), "Bloquear/Liberar acesso", filtro "Mostrar testes" com selo TESTE (Clientes, Período, Recuperação), "Contatos de teste" na tela Equipe. Tudo no registro de ações.
- [x] Teste não manda Purchase nem InitiateCheckout à Meta (servidor) e a /sucesso não dispara o Pixel. Coluna Meta mostra "não enviado (teste)".
- [x] Robô `recuperacao-carrinho`: ignora teste e contatos de teste em e-mail e WhatsApp.
- [x] Bloquear corta novos downloads na hora; links de download já emitidos valem até vencer.

## Provas
- [x] 206 testes passando (novos: preferência, /sucesso, primeiro acesso, link vencido/reusado, WhatsApp de acesso, marcar/desmarcar, contato de teste, robô, Meta, parar lembretes, bloqueio).
- [x] Build limpo em ~/tv-build (commit 6c40486, Environments: .env.local).
- [x] Telas locais (Playwright, 390 e 1280): pendente → pago → senha com e-mail travado (3 consultas); esgotado após 61 consultas e "Já paguei" consulta de novo; já tem conta → /entrar?ja=1 com e-mail preenchido; primeiro acesso sem rolagem lateral. Prints no scratchpad da sessão.
- [x] PONTO 1: Paulo aprovou o modelo com texto próprio (12/10). Código igualado (lib/whatsapp-acesso.js). Cadastro na Meta é à mão no WhatsApp Manager (WA_TOKEN é segredo, só na Cloudflare). Depois: WA_ACESSO=ativo + Promote version.
- [x] PONTO 2: backup ~/tv-backups/d1-antes-0013.sql (361 KB, 38 compras, 68 carrinhos, 36 clientes) e 0013 + 0014 aplicadas no D1 de produção em 12/10 ~19:45 UTC (SQL executado em ~/tv-backups/0013-0014-executado.sql).
- [x] PONTO 3: marcadas como teste as compras 60 (mp_183793582286) e 61 (mp_183795116626), R$ 1,00 Pix, trilhaviva.suporte@gmail.com, e os 3 carrinhos delas (dc81df5d, 5b5ff3f2, daf3be17). O e-mail já está em contatos_teste. A compra 12 (24/09, R$ 1,00, mesmo e-mail) NÃO foi marcada: Paulo decide. SQL em ~/tv-backups/marcar-testes-12-10.sql.
- [x] PONTO 4: merge em main (9b3f042, fast-forward) e deploy: site www versão 683a89c6, robô recuperacao-carrinho versão c7aef658 (vars do painel iguais ao wrangler.jsonc).
- [x] No ar: /, /assinar, /sucesso, /primeiro-acesso, /entrar 200; /gestao 404 sem sessão (esperado); login 400 "Informe o e-mail e a senha."; checkout abre o Mercado Pago e o carrinho do e-mail de teste nasce com teste = 1 e log "meta capi InitiateCheckout pulado (teste)".
- [x] Totais: compras pagas reais 36 (eram 38); hoje (Brasília) 1 venda R$ 89,90 em vez de 3 / R$ 91,90.
- [x] Robô: ciclos 19:50 e 20:00 UTC encerraram o WhatsApp dos 7 carrinhos de teste (log "whatsapp pulado (teste) 3 carrinhos" às 20:00); nenhum e-mail para eles.
- [x] CPU (wrangler tail, quente): /api/checkout 10–42 ms, webhook sem assinatura 7 ms, /api/acesso 10–25 ms, /sucesso 20–22 ms; partidas a frio 200–340 ms. O webhook ASSINADO só aparece na compra real.
- [ ] Depois do deploy: compra real R$ 1,00 no cartão (outra conta, vídeo), Pix no celular, números da gestão, log do robô, CPU do /api/checkout e do webhook.
