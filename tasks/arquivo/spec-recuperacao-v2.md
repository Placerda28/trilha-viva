# Recuperação v2 — sequência de 4 e-mails, celular no formulário e aba "Recuperação"

Branch: `recuperacao-v2` (saiu de `main` em 02/10/2026). Pedido do Paulo em 02/10.
Nada vai para `main` sem passar pela prova local. O site está no ar: toda mudança
é aditiva e a ordem de publicação está no fim deste arquivo.

## O que o Paulo pediu
1. Aba **Recuperação** no menu de gestão: todas as pessoas que deixaram nome,
   e-mail e celular e não pagaram; se o e-mail de recuperação saiu (quais); se o
   WhatsApp saiu (por enquanto sempre "aguardando — em breve"); quem comprou
   depois da recuperação.
2. Sequência de e-mails (só e-mail; o WhatsApp terá regra própria depois):
   - E-mail 1: 1 hora depois do carrinho (já existe hoje)
   - E-mail 2: 7 dias depois do e-mail 1, se não comprou
   - E-mail 3: 15 dias depois do e-mail 2, se não comprou
   - E-mail 4: 30 dias depois do e-mail 3, se não comprou
   - 30 dias depois do e-mail 4 sem compra: **protocolo de recuperação finalizado**
3. Não quebrar o site, que está no ar.

## Divisão
- **Codex (backend):** `migrations/0005_recuperacao_v2.sql`, `lib/carrinhos.js`,
  `app/api/checkout/route.js` (só o celular), `app/api/carrinho/route.js` (devolver telefone),
  `workers/recuperacao-carrinho/index.js`, `lib/gestao/recuperacao.js` (novo),
  `app/api/interno/gestao/recuperacao/route.js` e `.../recuperacao/csv/route.js` (novos),
  remoção da rota/lib antigas `app/api/interno/gestao/carrinhos/route.js`,
  `lib/gestao/carrinhos.js` e do teste delas (nenhuma tela usa), e os testes em `tests/recuperacao/`.
- **Claude (frontend + revisão):** `components/gestao/Recuperacao.jsx`,
  `app/interno/gestao/recuperacao/page.js`, `components/gestao/GestaoNav.jsx`,
  `components/CheckoutForm.jsx` (campo Celular), `app/privacidade/page.js`,
  revisão linha a linha do diff do Codex, prova local, publicação, backup no Drive.
- Os dois nunca mexem no mesmo arquivo.

## Regras que valem acima de tudo
- A recuperação NUNCA atrapalha uma venda: falha nela vira `console.error` e o fluxo segue.
- Uma pessoa (e-mail) tem no máximo UM protocolo. Carrinho novo de quem já está
  num protocolo (ou já recebeu e-mail) fica `ignorado` e não reinicia a sequência.
- Quem comprou (compra paga com o e-mail) ou se descadastrou não recebe mais nada.
- Teto de envios do Resend continua: TETO_DIA=40 e TETO_MES=1100, agora contando
  TODOS os e-mails da sequência (tabela `lembretes_enviados`).
- 10 ms de CPU por visita no site: consultas com LIMIT, paginação de 50.

## Banco — migrations/0005_recuperacao_v2.sql (só aditivo; aplicado em produção só depois de mostrar o SQL)
```sql
CREATE TABLE IF NOT EXISTS lembretes_enviados (
  carrinho_id TEXT NOT NULL,
  canal TEXT NOT NULL DEFAULT 'email' CHECK (canal IN ('email', 'whatsapp')),
  etapa INTEGER NOT NULL CHECK (etapa BETWEEN 1 AND 4),
  enviado_em TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (carrinho_id, canal, etapa)
);
CREATE INDEX IF NOT EXISTS idx_lembretes_enviado_em ON lembretes_enviados (enviado_em);

ALTER TABLE carrinhos ADD COLUMN etapa_email INTEGER NOT NULL DEFAULT 0;   -- quantos e-mails da sequência já saíram (0 a 4)
ALTER TABLE carrinhos ADD COLUMN proximo_email_em TEXT;                    -- quando o próximo passo vence (e-mail N+1 ou o encerramento)
ALTER TABLE carrinhos ADD COLUMN finalizado_em TEXT;                       -- protocolo encerrado
ALTER TABLE carrinhos ADD COLUMN finalizado_motivo TEXT;                   -- 'sequencia' | 'descadastro' | 'comprou'

CREATE INDEX IF NOT EXISTS idx_carrinhos_sequencia ON carrinhos (status, proximo_email_em);

-- Quem já recebeu o e-mail 1 (7 pessoas em 02/10) entra na sequência nova:
INSERT OR IGNORE INTO lembretes_enviados (carrinho_id, canal, etapa, enviado_em)
  SELECT id, 'email', 1, email_enviado_em FROM carrinhos WHERE email_enviado_em IS NOT NULL;
UPDATE carrinhos
   SET etapa_email = 1, proximo_email_em = datetime(email_enviado_em, '+7 days')
 WHERE email_enviado_em IS NOT NULL AND status = 'lembrado';
UPDATE carrinhos SET etapa_email = 1 WHERE email_enviado_em IS NOT NULL AND status <> 'lembrado';
```
- O CHECK de `status` NÃO muda (mudar exigiria recriar a tabela). Estados:
  `aberto` (esperando o 1º e-mail), `lembrado` (na sequência, ou finalizado se
  `finalizado_em` preenchido), `pago`, `ignorado` (nunca entrou na sequência).
- `email_enviado_em` continua sendo a data do e-mail 1. `whatsapp_enviado_em` segue NULL.
- A migração é compatível com o robô e o site ANTIGOS (só acrescenta).

## Celular no checkout (Codex: rota e lib; Claude: formulário)
- `POST /api/checkout` aceita `telefone` (texto). Servidor guarda só os dígitos;
  tira um `55` do começo se sobrarem 12–13 dígitos; válido = 10 ou 11 dígitos
  (DDD + número, DDD sem começar por 0). Inválido ou vazio: 400 `{ error: 'Informe seu celular com DDD.' }`.
  Vale para MP e Stripe (validação junto com nome/e-mail, antes do ramo).
  Funções puras `limparTelefone`/`telefoneValido` em `lib/carrinhos.js` com teste.
- `gravarCarrinho` grava `telefone` (dígitos) na coluna que já existe.
- O telefone NUNCA vai para a URL, para a Meta ou para o Mercado Pago nesta fase.
- `GET /api/carrinho?r=` passa a devolver também `telefone` (para preencher o form do lembrete).

## Robô (workers/recuperacao-carrinho/index.js) — a cada 10 min
Mantém tudo que já existe (MODO teste/ativo, TESTE_PARA, Bcc, tetos, descadastro,
List-Unsubscribe, idempotência). Muda:
1. Contagem do teto: `COUNT(*) FROM lembretes_enviados WHERE canal='email' AND enviado_em >= início do dia/mês UTC`.
2. Passo "e-mail 1": igual hoje (carrinhos `aberto` entre 48 h e 1 h). Bloqueios:
   compra paga, descadastro, ou o e-mail já tem e-mail enviado (`lembretes_enviados`
   de qualquer carrinho do e-mail, ou `email_enviado_em`) → `ignorado`. Reserva atômica =
   INSERT em `lembretes_enviados` (etapa 1) com os dois tetos e o "ninguém deste e-mail
   recebeu" no próprio INSERT ... SELECT ... WHERE (a PK impede duplicata);
   depois UPDATE carrinhos SET status='lembrado', email_enviado_em=agora,
   etapa_email=1, proximo_email_em=agora+7 dias. Falha no envio → apaga a linha
   reservada, status='ignorado', email_enviado_em=NULL, etapa_email=0 (como hoje; preserva 'pago').
3. Passo "seguimento": até 20 carrinhos `status='lembrado' AND finalizado_em IS NULL
   AND proximo_email_em <= agora`, do mais antigo:
   - compra paga com o e-mail → `finalizado_em=agora, finalizado_motivo='comprou'`.
   - descadastrado → `finalizado_em=agora, finalizado_motivo='descadastro'`.
   - `etapa_email = 4` → `finalizado_em=agora, finalizado_motivo='sequencia'` (protocolo finalizado).
   - senão envia o e-mail `etapa_email+1` (mesma reserva atômica com teto);
     sucesso → `etapa_email=N`, `proximo_email_em` = agora + 15 dias (após o 2),
     + 30 dias (após o 3), + 30 dias (após o 4 = prazo do encerramento).
     O UPDATE confere `etapa_email = N-1 AND status='lembrado'` (não pisa num 'pago').
     Falha → apaga a reserva e adia `proximo_email_em` em 1 dia (tenta de novo amanhã).
   - Em MODO=teste, só age se o e-mail for TESTE_PARA (os outros só vão para o log, sem mexer na linha).
   - Bateu o teto: para; o resto fica para a próxima rodada (nada se perde).
4. Resend `Idempotency-Key` = `<id>:email:<etapa>`.
5. A compra continua sendo marcada pelo webhook (`marcarCarrinhosPagos`, sem mudança).

## Os e-mails (mesmo layout, botão, Bcc, rodapé de descadastro e cabeçalhos do e-mail atual)
Link do botão: `SITE_URL/assinar?r=<id>&utm_source=email&utm_medium=lembrete&utm_campaign=carrinho-<etapa>`
(no e-mail 1 mantém `utm_campaign=carrinho`, como hoje).
Saudação "Oi, {nome}!" (sem nome: "Oi!"; HTML com escapeHtml). Botão "Finalizar minha compra".
Linha final antes do rodapé: "Pix ou cartão, acesso liberado na hora."

**E-mail 1** (igual ao de hoje, não mudar)

**E-mail 2** (7 dias)
- Assunto: Seu acervo de multitracks ainda está esperando
- P1: Faz uma semana que você começou a liberar o seu acesso à Trilha Viva e a compra não foi concluída.
- P2: São mais de 2.000 multitracks gospel com clique, guia e canais separados, prontas para o ensaio e para o culto. Pagamento único de R$ 89,90 e acesso vitalício.
- P3: Se ficou alguma dúvida, é só responder este e-mail.

**E-mail 3** (15 dias depois do 2)
- Assunto: Ensaio mais tranquilo para o seu ministério
- P1: Com as multitracks, a banda inteira ensaia com a mesma referência: clique, guia e cada instrumento no seu canal.
- P2: Você deixou o seu acesso à Trilha Viva pela metade. São mais de 2.000 músicas por R$ 89,90, uma vez só, sem mensalidade.
- P3: O botão abaixo leva direto para concluir.

**E-mail 4** (30 dias depois do 3)
- Assunto: Último lembrete sobre o seu acesso à Trilha Viva
- P1: Este é o último e-mail que enviamos sobre a sua compra que ficou pela metade.
- P2: Se ainda fizer sentido para o seu ministério, o acervo completo com mais de 2.000 multitracks gospel continua disponível por R$ 89,90, pagamento único e acesso vitalício.
- P3: Depois deste, não mandamos mais lembretes.

## Rota da gestão: GET /api/gestao/recuperacao (arquivo: app/api/interno/gestao/recuperacao/route.js)
`soAdmin`, `cabecalhosPrivados`, 404 nos outros métodos (padrão das rotas atuais).
Parâmetros: `filtro` = `todos` (padrão) | `andamento` | `recuperados` | `finalizados` | `sem_envio`
(outro valor → 400 com mensagem); `busca` (nome, e-mail ou celular; LIKE escapado como em clientes);
`pagina` (50 por página, pede 51).
**Uma linha por pessoa (e-mail)**: o carrinho do protocolo (o de maior `etapa_email`; empate → o mais recente).
Use `ROW_NUMBER() OVER (PARTITION BY email ORDER BY etapa_email DESC, criado_em DESC, id DESC)`.
Ordem da lista: carrinho do protocolo mais recente primeiro.

Situação de cada pessoa (campo `situacao`), nesta ordem de prioridade:
- `recuperado`: algum carrinho do e-mail com `pago_em` e há e-mail da sequência enviado antes de `pago_em`
- `comprou_sem_lembrete`: algum carrinho pago, sem e-mail antes da compra
- `finalizado`: `finalizado_em` preenchido (com `finalizado_motivo`)
- `andamento`: `status='lembrado'` e sem `finalizado_em`
- `aguardando`: `status='aberto'` (esperando o 1º e-mail)
- `sem_envio`: `ignorado` sem nenhum e-mail
Filtros: `andamento` = andamento+aguardando; `recuperados` = recuperado; `finalizados` = finalizado;
`sem_envio` = sem_envio. `comprou_sem_lembrete` só aparece em `todos`.
`totais` sempre do conjunto inteiro (ignora filtro e busca).

Resposta:
```json
{ "ok": true,
  "totais": { "pessoas": 0, "andamento": 0, "recuperados": 0, "finalizados": 0, "sem_envio": 0,
              "comprou_sem_lembrete": 0, "emails_enviados": 0, "taxa": 0, "valor_recuperado_centavos": 0 },
  "itens": [{
    "nome": "", "email": "", "telefone": "11987654321", "criado_em": "ISO",
    "situacao": "andamento", "finalizado_motivo": null, "finalizado_em": null,
    "emails": [{ "etapa": 1, "enviado_em": "ISO" }],
    "proximo_email_em": "ISO|null", "proxima_etapa": 2,
    "whatsapp": { "situacao": "aguardando", "enviado_em": null },
    "pago_em": "ISO|null", "recuperado_pela_etapa": 2
  }],
  "pagina": 1, "temMais": false }
```
- `taxa` = recuperados / pessoas que receberam ao menos 1 e-mail (0 se nenhuma).
- `emails_enviados` = linhas de `lembretes_enviados` com canal 'email'.
- `valor_recuperado_centavos` = soma de `compras.valor_centavos` pagas (JOIN clientes por e-mail) das pessoas `recuperado`, com compra criada depois do 1º e-mail.
- `recuperado_pela_etapa` = último e-mail enviado antes de `pago_em` (null se não recuperado).
- Datas ISO via `isoUtc` de `lib/gestao/clientes.js`.
- `proxima_etapa` = etapa_email+1 quando está em andamento e etapa < 4; na etapa 4 `proxima_etapa` = null e `proximo_email_em` é a data do encerramento; fora de andamento ambos null.
- `telefone` = dígitos ou null (carrinhos antigos não têm).
- CSV: `GET /api/gestao/recuperacao/csv?filtro=&busca=` com as mesmas colunas
  (nome, e-mail, celular, carrinho em, situação, e-mail 1..4 em, WhatsApp, pago em,
  recuperado pela etapa), usando `lib/gestao/csv.js` (fórmulas neutralizadas). Limite 5000 linhas.
  Datas no CSV em horário de Brasília, como o CSV de clientes.

## Testes (node --test, sem banco real; seguir os existentes em tests/recuperacao/)
- telefone: limpeza, 55, inválidos.
- robô: e-mail 1 como hoje; seguimento 2→3→4→finalizado com os prazos certos;
  comprou/descadastrou no meio finaliza com o motivo; teto conta todos; falha no
  seguimento adia 1 dia e não avança etapa; modo teste não mexe em outros e-mails;
  carrinho novo de quem está no protocolo fica ignorado; textos/assuntos por etapa.
- gestão: situação por prioridade, filtros, recuperado_pela_etapa, linha por pessoa.
- Se der, rodar a SQL nova contra um D1 local (`npx wrangler d1 execute trilha-viva --local --file=...`)
  com as migrações 0000..0005 para provar que ela roda. NUNCA `--remote`.

## Ordem de publicação (o site não pode cair)
1. `npm test` e `npm run build` limpos na branch; prova local (wrangler dev + D1 local).
2. Aplicar `0005` no D1 de produção (aditiva; o site e o robô antigos continuam funcionando com ela).
3. Merge em `main`, push, `npm run deploy` do site (com `.env.local`!) e conferir login (POST vazio em /api/conta/entrar → 400) e /assinar.
4. Publicar o robô (`npx wrangler deploy` em workers/recuperacao-carrinho).
5. Backup da pasta no Drive (sem node_modules, .next, .open-next, .wrangler, .env*).
