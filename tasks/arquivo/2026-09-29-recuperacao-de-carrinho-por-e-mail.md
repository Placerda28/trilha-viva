# Recuperação de carrinho por e-mail (início: 29/09/2026)

Branch: `recuperacao`. Contrato: tasks/recuperacao.md.
Legenda: [ ] a fazer · [x] feito e provado · (C) Codex/backend · (F) Claude/frontend

## Passo 0
- [x] main atualizada, branch `recuperacao` criada
- [x] Leitura: checkout, CheckoutForm, mercadopago, webhook MP, clientes, email, origem, site, wrangler, gestão, privacidade, MetaPixel
- [x] Esquema do D1 lido (só leitura): nenhuma tabela de carrinho; datas em TEXT UTC
- [x] Remetente real: EMAIL_FROM = "Trilha Viva <acesso@trilhaviva.org>" (não contato@)
- [x] Resend grátis: 100/dia (dia UTC) e 3.000/mês; Cc/Bcc CONTAM como e-mail a mais → teto 40 lembretes/dia e 1.100/mês
- [x] batida-supabase: publicado na Cloudflare (scheduled + fetch), código fora do repositório
- [x] Paulo aprovou (29/09): acesso@ com reply_to contato@; link com ?r= (e-mail fora da URL por causa do Pixel); tetos 40/1.100; datas em texto

## Tarefas
- [x] (C) migrations/0004_carrinhos.sql (commit 89bd534), aplicada e conferida só no D1 LOCAL
- [x] PARADA 1: SQL aplicado no D1 de produção pelo Paulo (29/09)
- [x] (C) checkout (nome obrigatório, grava carrinho), GET /api/carrinho, webhook marca pago (89bd534). Revisado pelo Claude; ajuste: nome longo é cortado em 80, não recusado (b242ca6). 63 testes
- [x] (F) formulário (nome + e-mail nos dois cards, aviso, ?r=, utm) e /privacidade (23715bd). Build limpo, /assinar segue estático
- [x] (C) robô recuperacao-carrinho, e-mail, /api/descadastrar (a2db9f2). Codex rodou depois do /codex:setup; revisado pelo Claude. 76 testes, build e dry-run do robô limpos. → PARADA 2 feita (29/09): LEMBRETE_SEGREDO no site e no robô, RESEND_API_KEY no robô
  - Atenção para as provas: TESTE_PARA (conta do Paulo) já tem compra paga, então no modo teste o carrinho dele vira 'ignorado' pela regra (a). Decidir: outro e-mail de teste sem compra, ou exceção só no modo teste
- [x] (C) GET /api/gestao/carrinhos (a2db9f2) · [ ] (F) aba Carrinhos
- [ ] Provas 1 a 7 do pedido
- [x] PARADA 3 e 4 (29/09): merge em main, site e robô publicados, robô em MODO=ativo
  - O deploy local quebrou o login (faltava .env.local com NEXT_PUBLIC_SUPABASE_*). Corrigido e republicado (versão 83b47fbb)
- [ ] Paulo: teste real do lembrete com um e-mail sem compra

---
