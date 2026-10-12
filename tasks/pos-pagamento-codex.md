Responda e comente sempre em português do Brasil.

# Especificação para o Codex: compras e carrinhos de teste (Tarefa B, backend)

Branch `pos-pagamento` (já criada, você está nela). Leia `CLAUDE.md` e `AGENTS.md`.
Você NÃO consegue commitar (a pasta .git fica só leitura para você): só edite e teste. O Claude revisa e commita.
O Claude está mexendo AO MESMO TEMPO em: `components/AccessPanel.jsx`, `components/ContaForm.jsx`, `app/sucesso/`, `app/entrar/`, `app/primeiro-acesso/`, `app/api/acesso/route.js`, `app/api/conta/*`, `lib/email.js`, `lib/clientes.js`, `components/gestao/*`, `app/interno/*`. NÃO toque nesses arquivos.

## Objetivo
O Paulo faz compras de teste. Elas não podem contar nos números da gestão, não podem receber lembrete (e-mail/WhatsApp) e não podem mandar Purchase para a Meta. Marcar, nunca apagar.

## 1. Migração `migrations/0013_testes.sql` (NÃO aplicar em produção; só no D1 local para testar)
- `ALTER TABLE compras ADD COLUMN teste INTEGER NOT NULL DEFAULT 0;` + `teste_por TEXT`, `teste_em TEXT`.
- Mesmo para `carrinhos`: `teste`, `teste_por`, `teste_em`.
- `CREATE TABLE contatos_teste (valor TEXT PRIMARY KEY, tipo TEXT NOT NULL CHECK (tipo IN ('email','telefone')), criado_em TEXT NOT NULL DEFAULT (datetime('now')), criado_por TEXT)`.
  Semente: `paulohenrique_ls@hotmail.com` (email), `trilhaviva.suporte@gmail.com` (email), `27996253839` (telefone; no banco o telefone fica SEM o 55, ver `limparTelefone` em lib/carrinhos.js; confira e normalize do mesmo jeito).
- Visões para o filtro morar num lugar só: `CREATE VIEW compras_reais AS SELECT * FROM compras WHERE teste = 0;` e `CREATE VIEW carrinhos_reais AS SELECT * FROM carrinhos WHERE teste = 0;`
- Índices só onde fizer sentido. Nada de marcar as compras antigas: o Paulo decide quais marcar.

## 2. Filtro único nos números (`lib/gestao/`)
- Toda consulta de NÚMEROS e LISTAS da gestão lê `compras_reais` / `carrinhos_reais` em vez de `compras` / `carrinhos`: `lib/gestao/periodo.js` (itens, resumo, por dia, origens, CSV), `lib/gestao/clientes.js` (lista, total e CSV), `lib/gestao/recuperacao.js` (CTE, totais, CSV), `lib/gestao/cupons.js` (faturamento por cupom; a CONTAGEM de usos/vagas continua com `compras`, porque a vaga foi usada de verdade; explique no comentário).
- Parâmetro `mostrarTestes` (boolean, padrão false) nas funções de LISTA (clientes, período itens, recuperação lista): com true, lê a tabela inteira e a linha traz `teste: true/false`. Os TOTAIS, resumos, CSV e campanhas nunca contam teste, nem com o filtro ligado.
- Escolha da tabela por uma função só (ex.: `fonteCompras(mostrarTestes)` em `lib/gestao/testes.js`), nunca texto montado com dado do usuário.
- `clienteDaLinha` / `recuperacaoDaLinha` devolvem `teste` (boolean). Na lista de clientes, um cliente é "teste" se a compra escolhida for teste.
- NÃO filtre em `lib/sessao.js` (`temCompra`): compra de teste continua dando acesso ao acervo.

## 3. Marcação automática (`lib/teste.js`, fora da gestão, usado pelo checkout e pelo webhook)
- `export async function ehContatoTeste(db, { email, telefone })` devolve boolean (uma consulta, LIMIT 1).
- `export async function ehTeste(db, { email, telefone, referencia })` devolve true se o contato está na lista OU se o carrinho `referencia` tem `teste = 1`. O Claude vai importar `ehTeste` em `app/api/acesso/route.js`: mantenha esse nome e assinatura, e nunca deixe estourar erro (erro = false + log).
- `gravarCarrinho` (lib/carrinhos.js): grava `teste = 1` quando o e-mail ou telefone está em `contatos_teste` (de preferência no próprio INSERT com subconsulta, para não gastar outra ida ao banco).
- `registrarCompraNoBanco` (lib/gestao/cupons.js): aceita `teste` e grava a coluna. `registrarCompra` em lib/clientes.js só repassa o objeto (não precisa mudar).
- Webhook do Mercado Pago (`app/api/mercadopago/webhook/route.js`): antes do Purchase, calcula `teste = await ehTeste(db, { email, telefone, referencia })`. Se teste: NÃO chama `enviarEventoMeta` (grava `meta_status = 'teste'` pelo `gravarRastreioCompra`, log curto `meta capi Purchase pulado (teste) <ref>`), e passa `teste` para o registro da compra. Falha nessa consulta nunca derruba o webhook (cai como não-teste e loga). Deixe a função `liberarAcesso` fácil de estender: o Claude vai acrescentar depois um WhatsApp de "acesso liberado" nela.
- Webhook da Stripe (`app/api/webhook/route.js`): só se for simples; não é prioridade.
- Checkout (`app/api/checkout/route.js`): InitiateCheckout também não vai à Meta quando o contato é de teste.

## 4. Rotas de gestão (só admin, mesmo padrão das vizinhas: `soAdmin`, `mesmaOrigem`, 404 para quem não é admin, `cabecalhosPrivados`, `gravarRegistro`)
Siga o padrão de `app/api/interno/gestao/clientes/email/route.js`.
- `POST /api/interno/gestao/clientes/teste` `{ id: clienteId, teste: true|false }`: marca/desmarca TODAS as compras do cliente e TODOS os carrinhos do mesmo e-mail (teste_por = e-mail do admin, teste_em = agora). Ao marcar, também encerra os lembretes: carrinhos `aberto`/`lembrado` do e-mail viram `status = 'ignorado'`, `finalizado_em` e `finalizado_motivo = 'teste'` se ainda nulos, `whatsapp_encerrado_em` e `whatsapp_motivo = 'teste'`, `proximo_whatsapp_em = NULL`, `proximo_email_em = NULL`. Desmarcar só tira o teste (não reabre lembrete). Registro: `compra_teste_marcada` / `compra_teste_desmarcada`, alvo = e-mail.
- `POST /api/interno/gestao/recuperacao/teste` `{ email, teste }`: o mesmo, a partir da Recuperação (carrinhos do e-mail + compras do cliente com esse e-mail, se houver). Registro: `carrinho_teste_marcado` / `carrinho_teste_desmarcado`.
- `POST /api/interno/gestao/recuperacao/parar` `{ email }`: carrinho REAL que não deve receber mais nada. Carrinhos abertos/lembrados do e-mail viram `status = 'ignorado'`, `finalizado_motivo = 'gestao'`, WhatsApp encerrado com `whatsapp_motivo = 'gestao'`. NÃO marca teste. Registro `lembretes_parados`.
- `POST /api/interno/gestao/clientes/bloqueio` `{ id, bloqueado: true|false }`: muda `clientes.bloqueado`. Não deixe bloquear o `ADMIN_MASTER` nem membro da equipe (veja como `corrigir-email.js` protege). O download já recusa bloqueado (`app/api/baixar`, `lib/sessao.js`): confira e diga se o corte é imediato. Registro `cliente_bloqueado` / `cliente_liberado` (já existem no front).
- `GET/POST /api/interno/gestao/testes` (lista de contatos de teste): GET lista; POST `{ acao: 'adicionar'|'remover', valor }` detecta e-mail ou telefone, normaliza (e-mail minúsculo; telefone com `limparTelefone`) e valida. Registro `contato_teste_adicionado` / `contato_teste_removido`. Adicionar NÃO marca o passado (diga isso na resposta: `{ ok, aviso }`).
- Rotas de lista existentes (`clientes`, `periodo`, `recuperacao`) aceitam `?testes=1` e repassam `mostrarTestes`.

## 5. Robô `workers/recuperacao-carrinho/` (index.js e whatsapp.js)
- Todas as buscas de candidatos (e-mail inicial, seguimentos, WhatsApp primeiras e seguintes) ignoram `teste = 1`.
- Na varredura `encerrarPorCompraOuSaida` (ou uma irmã): encerra o WhatsApp de carrinho `teste = 1` com motivo `teste`.
- `impedimentos*`: contato em `contatos_teste` também impede (defesa dupla).
- Log curto quando pular por teste.

## 6. Testes automáticos (node --test, no padrão de `tests/`)
Em `tests/gestao/testes.test.mjs` e `tests/recuperacao/` (use o mesmo D1 falso que os testes atuais usam; veja `consultas.test.mjs` e `robo.test.mjs`):
- marcar/desmarcar teste muda os totais do período e a lista de clientes; com `mostrarTestes` a compra volta com `teste: true`;
- e-mail da lista nasce marcado (carrinho) e a compra é registrada com teste;
- carrinho de teste não é candidato a e-mail nem a WhatsApp no robô;
- webhook: compra de teste não chama `enviarEventoMeta` (se for difícil testar a rota, isole a decisão numa função e teste a função);
- "parar lembretes" põe ignorado + WhatsApp encerrado e NÃO marca teste;
- bloqueio recusa o master.

## Entrega
- `npm test` passando (hoje são 174). Não rode o build (a pasta C:dev quebra o build; o Claude roda numa cópia).
- Responda com: arquivos mudados, o SQL completo da 0013, decisões tomadas e dúvidas. Não aplique nada no D1 remoto.
