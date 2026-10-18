# Recuperação v2 — 4 e-mails, celular, aba Recuperação (02/10/2026)

Branch `recuperacao-v2`. Contrato: tasks/recuperacao-v2.md. Commits 145c6e9 (plano),
9d253b0 (telas, Claude), 281689a (backend, Codex + ajustes da revisão).
- [x] (C) migrations/0005_recuperacao_v2.sql (aditiva: tabela lembretes_enviados + 4 colunas em carrinhos; quem já recebeu o 1º e-mail entra na sequência com o 2º em +7 dias)
- [x] (C) Robô: e-mails 1 (1 h), 2 (+7 d), 3 (+15 d), 4 (+30 d), encerramento (+30 d); para se comprou ou descadastrou; teto conta todos; falha adia 1 dia
- [x] (C) Celular no checkout (só dígitos, sem 55); vazio é aceito no servidor de propósito (páginas antigas abertas na hora da publicação), o formulário exige
- [x] (C) GET /api/gestao/recuperacao e /csv (uma linha por pessoa; quem pagou antes do lembrete fica fora de "Todos")
- [x] (F) Aba Recuperação (totais, filtros, busca, planilha, 4 casas de e-mail, WhatsApp "em breve", link wa.me), campo Celular (WhatsApp) com máscara, privacidade com os 4 lembretes
- [x] Revisão linha a linha do diff do Codex: 3 ajustes (celular vazio aceito, comprou-na-hora fora da lista, regex sem barra invertida)
- [x] `npm test` 82/82; `npm run build` limpo
- [x] Prova LOCAL (preview da Cloudflare + D1 local): 0005 roda sobre o banco local; 6 situações certas; filtros, busca por celular, filtro inválido 400; sem login 404 igual a endereço inexistente; CSV ok; checkout: celular inválido 400, válido grava 11987650000, sem campo grava NULL (a abertura do MP falha só no local: token de exemplo no .dev.vars); robô com chave falsa do Resend: falha desfaz a reserva e adia 1 dia; etapa 4 vencida → finalizado 'sequencia'; descadastrado → finalizado 'descadastro'; fotos 1280/390 conferidas, sem erro de página
- [x] 0005 APLICADA no D1 de produção em 02/10 (Paulo liberou a permissão). Conferido: 7 lembretes migrados; 11 clientes, 11 compras, R$ 631,80 pagos intactos.
- [x] Merge em main (cbe4216), push, site publicado (versão 865067e9, build com .env.local). Conferido no ar: home e /assinar 200, login 400 "Informe o e-mail e a senha.", campo Celular no /assinar, checkout recusa celular inválido, /api/gestao/recuperacao sem login 404 igual a inexistente, privacidade nova.
  - Tropeço: o build saía com código 127 sem mensagem porque servidores de teste locais (wrangler/workerd) seguiam abertos travando .open-next. Encerrar os processos de teste antes de publicar.
- [x] Robô publicado (versão 94e58bc4, cron */10, MODO=ativo, segredos LEMBRETE_SEGREDO e RESEND_API_KEY presentes).
- [ ] Primeiros e-mails 2 de verdade: a partir de 06/10 (as 7 pessoas do 1º e-mail de 29/09 a 01/10)

---
