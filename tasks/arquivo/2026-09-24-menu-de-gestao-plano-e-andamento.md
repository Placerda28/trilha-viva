# Menu de gestão — plano e andamento (início: 24/09/2026)

Branch: `gestao`. Nada vai para `main` sem o OK do Paulo, fase por fase.
Legenda: [ ] a fazer · [x] feito e provado · (C) Codex/backend · (F) Claude/frontend

## Passo 0 — preparação
- [x] Pasta local fora do Drive/OneDrive, remoto `Placerda28/trilha-viva`
- [x] Branch `gestao` criada
- [x] Leitura do código (checkout, webhooks, sessão, acervo, download, cupom de teste)
- [x] Esquema real do D1 lido (só leitura)
- [x] `CLAUDE.md` e `AGENTS.md` na raiz (regra do idioma)

### O que a leitura mostrou (e muda o plano original)
1. A sessão NÃO é da Supabase. É o cookie `tv_sessao`, conferido no D1 (`lib/sessao.js` → `clienteAtual()`). A Supabase só confere a senha. Então `papel()` parte de `clienteAtual()`: é validado no servidor e é o mesmo usado no acervo.
2. A chave de servidor da Supabase já existe com o nome `SUPABASE_SECRET_KEY` (não `SUPABASE_SERVICE_ROLE_KEY`). A Equipe reaproveita essa.
3. A conta do Paulo (paulohenrique_ls@hotmail.com) já existe: cliente id 3, com senha e com compra. Não precisa criar nada para a Fase 1.
4. O D1 não guarda Pix/cartão nem cupom. Precisa de uma coluna nova (cache da forma de pagamento).
5. Os webhooks (MP e Stripe) NÃO tratam reembolso/chargeback. Fica para a Fase 4.
6. Já existe um cupom de teste por variável (`CUPOM_TESTE`, `lib/cupom-teste.js`) e o campo "Tenho um cupom" no `CheckoutForm`. A Fase 2 troca esse mecanismo pela tabela `cupons`.
7. Não há ferramenta de testes no projeto. Os testes usam o `node --test` que já vem no Node, em funções puras (sem banco), sem instalar nada.
8. Hoje o D1 tem 6 clientes, 6 compras pagas (R$ 361,10 no total) e 39 downloads.

## Fase 1 — acesso + Clientes + Clientes por período

Decisão de arquitetura (24/09): /gestao e /api/gestao NÃO têm rota no sistema de arquivos. O middleware.js confere o papel e só para admin reescreve para /interno/gestao e /api/interno/gestao (que conferem de novo). Assim, para qualquer outro visitante, é literalmente um endereço inexistente. Motivo: notFound() dentro da rota gerava um 404 diferente do normal (corpo vazio / documento de erro).
Risco conhecido e pequeno: o Next grava os endereços do middleware (/gestao, /api/gestao) num script do sistema antigo de páginas (main-*.js) que nenhuma página carrega; só é baixável sabendo o nome do arquivo. A segurança não depende disso.
Para a Fase 3: a consulta à tabela equipe entra em lib/gestao/sessao.js (adminPeloToken), para valer no middleware e nas rotas ao mesmo tempo.
Segredos/variáveis: `ADMIN_MASTER=paulohenrique_ls@hotmail.com` no painel + "Promote version".
Migração `migrations/0001_gestao_fase1.sql`: APLICADA no D1 de produção em 24/09 pelo Paulo (depois de ver o SQL). Conferido: coluna e índice existem; 6 clientes, 6 compras, R$ 361,10 intactos.
- [x] (C) `lib/gestao/permissao.js` — `papel()` → 'master' | 'membro' | null; `naoEncontrado()` (404)
- [x] (C) Migração: `compras.forma_pagamento` + índice por data
- [x] (C) Forma de pagamento: gravar na compra nova (MP `payment_type_id`, Stripe = cartão) e preencher as antigas aos poucos, com cache
- [x] (C) `GET /api/gestao/clientes` (busca + paginação) e `GET /api/gestao/clientes/csv`
- [x] (C) `GET /api/gestao/periodo` (totais + série dia/semana/mês) e `GET /api/gestao/periodo/csv`
- [x] (C) Testes `node --test` das funções puras (datas de Brasília, agrupamento, CSV, decisão de papel)
- [x] (F) `app/interno/gestao/layout.js` — confere o papel de novo (`notFound()`), noindex
- [x] (F) Tela Clientes (busca, paginação, CSV) — celular primeiro
- [x] (F) Tela Clientes por período (atalhos, totais, gráfico, CSV)
- [x] (F) Link "Gestão" no acervo, só renderizado para admin; Header esconde os botões de compra via `data-cta-compra` (sem citar /gestao)
- [x] Revisão do diff do Codex (feita linha a linha)
- [x] `/codex:adversarial-review --base main` (24/09, 14h08): APROVADO, sem achado material. Antes dele, o teste de ataque manual achou o 200 com cabeçalho RSC nos endereços internos (corrigido no commit ca8e0b5).
- [x] Prova LOCAL (wrangler dev + D1 local com dados inventados), 24/09:
  - 92 comparações (sem cookie, cliente comum, bloqueado, sessão falsa × GET/POST/PUT/DELETE × 4 rotas + /api/gestao + 3 telas): 0 diferenças em relação a um endereço inexistente (status, cabeçalhos e corpo; só o ETag muda, como muda entre dois endereços inexistentes quaisquer).
  - master: telas 200, JSON 200, CSVs 200 text/csv; cliente comum não recebe nenhuma menção a "gestao" no /acervo, master recebe o link.
  - acesso direto ao endereço interno (/interno/gestao, /api/interno/gestao) sem permissão: 404, nenhum dado.
  - totais do período = SELECT direto (6 compras, 5 clientes, R$ 437,50; Pix 1, cartão 2, sem info 2); compra das 23h59 de Brasília no dia certo; busca por "100%" escapada; fórmula neutralizada na planilha.
  - fotos das telas em 1280 px e 390 px conferidas.
- [x] Prova em PRODUÇÃO (24/09, versão f9c188d9 publicada às 14h44 BRT): sem login, 12 comparações com endereço inexistente, 0 diferenças; home, /assinar, /musicas, /entrar normais; robots e sitemap sem /gestao. Paulo entrou, viu o menu e as duas telas ("está ótimo").
- [x] Ajuste pedido pelo Paulo: compra de teste manual de paulohls28@gmail.com (id 2, cs_teste_manual_1, cupom 100%) passou de R$ 89,90 para R$ 0,00. Faturamento total: R$ 271,20.
- [x] `npm run build` limpo (e `opennextjs-cloudflare build` limpo)
- [x] CPU em produção (GraphQL workersInvocationsAdaptive, o site todo, por hora): 0 erros antes e depois; mediana 9,6 ms na hora em que o Paulo usou a gestão (10,2 ms e 5,5 ms nas horas anteriores). Não deu para separar por rota: o wrangler tail não alcança tail.developers.workers.dev daqui (DNS) e o login do wrangler não tem permissão na API de Observability. Para ver por rota: painel → Workers → www → Observability, filtrar por caminho.
  - Observação fora do escopo: o p99 do site já passava de 150 ms antes da gestão (inícios a frio).
- [x] Merge em main com OK do Paulo (commit 83c863c, 24/09)

## Fase 2 — Cupons
Contrato: tasks/fase2-cupons.md. Commits dcdacab (backend, Codex) e 08fe0d0 (telas).
- [x] (C) migrations/0002_cupons.sql: tabelas cupons e cupom_reservas + compras.cupom
- [x] 0002 APLICADA no D1 de produção em 24/09 pelo Paulo (depois de ver o SQL). Conferido: 2 tabelas, 2 índices, coluna compras.cupom; 6 clientes, 6 compras, R$ 271,20 intactos.
- [x] (C) Validação no servidor em /api/checkout e /api/cupom: validade, limite, ativo, sem diferenciar maiúscula, preço final ≥ R$ 1,00
- [x] (C) Limite à prova de corrida: reserva atômica (35 min) + preferência e Pix vencendo em 30 min
- [x] (C) Uso contado só quando a compra é gravada (webhook aprovado ou /api/conta/criar), uma vez só
- [x] (C) Rotas da gestão: listar, criar (mesma origem), desativar
- [x] (F) Tela Cupons (prévia do preço, estados, usos e "pagando agora", copiar link, desativar com confirmação); CheckoutForm sem mudança (contrato mantido)
- [x] lib/cupom-teste.js aposentado. Depois da publicação: apagar a variável CUPOM_TESTE do painel.
- [x] Prova LOCAL (24/09): 39 testes; criação 201, repetido 409, 6 inválidos 400 com o campo certo, outro site e cliente comum 404 sem gravar; /api/cupom: 30% → R$ 62,93, R$ 10 → R$ 79,90, 100% → R$ 1,00, minúsculas/espaços ok; inexistente, esgotado, vaga ocupada por quem está pagando, desativado e vencido recusados com a mesma mensagem; reservas vencidas liberam; checkout que falha devolve a vaga; esgotado recusado no checkout; 56 comparações de não admin nas rotas de cupom com 0 diferenças; fotos 1280/390 conferidas.
- [x] /codex:adversarial-review focada em dinheiro: 3 achados (vaga vencendo com cartão em análise; falha na limpeza da vaga barrando o e-mail de acesso; link passando da validade do cupom), corrigidos em f26fe32 com 3 testes novos (42). Limitação aceita: desativar não cancela links já abertos no MP (máx. 30 min).
- [x] Segunda revisão do Codex: achou que o prazo de 30 min podia recusar o Pix (MP exige Pix ≥ 30 min a partir de quando é gerado), que 3 h não bastam para cartão em análise (até 2 dias úteis), que aviso atrasado reativava vaga vencida e que o link podia passar segundos da validade. Tudo corrigido (43 testes).
  - Achado anterior à gestão, NÃO corrigido aqui: se o e-mail de acesso falhar depois de a compra ser gravada, o aviso repetido do MP não tenta de novo. Quem pagou ainda entra pela tela de sucesso ou por "Esqueci minha senha". Vai para a Fase 4 (registrar se o e-mail saiu e reenviar).
- [x] Publicado em 24/09 (merge 4a4d35a, versão acfb3d7b). Sem login: rotas de cupom idênticas a endereço inexistente (0 diferenças).
- [x] Prova em produção (24/09, 16h48 BRT): Paulo criou TESTE1REAL (R$ 88,90 de desconto, limite 1) e pagou R$ 1,00 no Pix com outra conta (trilhaviva.suporte@gmail.com). No D1: compra mp_179706542831, pix, cupom TESTE1REAL, usos 1/1, reserva limpa, senha criada. Depois disso, /api/cupom e /api/checkout recusam o cupom (esgotado).
- [ ] Desativar → checkout recusa: provado no local; em produção é opcional (TESTE1REAL já está esgotado).
- [ ] Paulo: apagar a variável CUPOM_TESTE no painel (o código já não lê).
- [ ] Paulo: confirmar a compra de R$ 1,00 de kaylan.nasc2@gmail.com (24/09 10h35 BRT, mp_179645402809, antes da publicação dos cupons, sem cupom registrado): só o cupom de teste antigo permitia esse valor.

## Fase 3 — Equipe + registro de ações
Paulo autorizou fazer direto (24/09). Contrato: tasks/fase3-equipe.md. Commits 737f3f3 (backend, Codex) e 0219298 (telas).
- [x] (C) migrations/0003_equipe.sql: tabelas equipe e registro. APLICADA no D1 de produção em 24/09 (7 clientes, 7 compras, R$ 272,20, 1 cupom intactos).
- [x] (C) Papel com membro na mesma consulta única; master só por ADMIN_MASTER; removido/bloqueado perde acesso na próxima requisição
- [x] (C) Adicionar membro via Supabase Admin (SUPABASE_SECRET_KEY); conta existente mantém a senha; troca obrigatória no 1º acesso; remover; liberar/tirar acervo (desligado por padrão)
- [x] (C) Registro: cupom criado/desativado, membro adicionado/removido, acervo liberado/retirado, senha trocada
- [x] (C) temCompra aceita membro ativo com libera_acervo
- [x] (F) Tela Equipe (só master), Registro (todos), "Crie a sua senha" para quem está com a provisória, aviso de gestão no acervo para membro sem compra
- [x] Prova LOCAL (24/09): 59 testes; e-mail do master, e-mail inválido e senha curta recusados; repetido 409; membro vê Clientes/Cupons/Registro e recebe 404 na Equipe (rota e tela, sem aba no menu) e ao tentar adicionar; acervo desligado até liberar; com senha provisória só vê "Crie a sua senha" e as rotas de dados dão 404; removido perde tudo na hora; reativado volta com acervo desligado; registro anota cada ação e nenhuma senha; membro criando cupom aparece no registro; 48 comparações de quem é de fora nas rotas novas com 0 diferenças; fotos conferidas.
- [ ] Não testável no local (sem Supabase): criar conta nova de membro e a troca de senha de verdade → prova em produção com o Paulo
- [x] /codex:adversarial-review da Fase 3: sessões abertas com a senha provisória sobreviviam à troca; falha no meio do cadastro podia dispensar a troca; publicar antes da 0003 quebraria o acervo. Os dois primeiros corrigidos (60 testes; gravação única conferida no D1 local), o terceiro já estava resolvido (0003 aplicada antes).
- [ ] Publicar e provar em produção: Paulo adiciona um membro com um e-mail dele, entra com a provisória, troca, vê a gestão sem Equipe; removido perde o acesso

## Fase 4 — Visão geral, Downloads, ações no cliente (reembolso ADIADO)
- [ ] (C) Visão geral (hoje/7d/30d/mês + gráfico), músicas mais baixadas, clientes que batem a cota
- [ ] (C) Ações: reenviar e-mail de acesso, bloquear/liberar, zerar a cota do dia
- [ ] (C) Entrega do acesso idempotente: gravar quando o e-mail de criar senha saiu (ex.: compras.acesso_enviado_em) e, se um aviso repetido do MP achar compra paga sem e-mail enviado, tentar de novo (achado da revisão da Fase 2)
- [ ] ADIADO por decisão do Paulo (24/09/2026): "não vamos mexer com reembolso por agora". Webhook refunded/charged_back → bloquear e marcar "reembolsada" fica fora até ele pedir. Hoje o aviso do MP só trata pagamento aprovado; reembolso feito no painel do MP NÃO bloqueia o acesso (bloqueio manual pela gestão, quando existir).
- [ ] (F) Telas correspondentes
- [ ] (adiado junto com o reembolso)

---
