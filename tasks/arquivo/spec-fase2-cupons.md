# Fase 2 — Cupons: contrato entre backend (Codex) e frontend (Claude)

Regra de segurança: já vazou um cupom de 100% no passado. Todo cupom tem
VALIDADE e LIMITE DE USOS obrigatórios, e o preço final nunca fica abaixo de
R$ 1,00. Quem decide o preço é sempre o servidor.

## Banco (migrations/0002_cupons.sql — aplicado em produção só com OK do Paulo)
- `cupons`: id, codigo TEXT NOT NULL UNIQUE (guardado em MAIÚSCULAS), tipo
  ('percentual' | 'valor'), valor INTEGER > 0 (percentual: 1–100; valor: centavos),
  valido_ate TEXT NOT NULL (UTC, 'AAAA-MM-DD HH:MM:SS' = fim do dia de Brasília),
  limite_usos INTEGER NOT NULL > 0, ativo INTEGER NOT NULL DEFAULT 1,
  criado_por TEXT NOT NULL (e-mail), criado_em, desativado_por, desativado_em.
- `cupom_reservas`: referencia TEXT PRIMARY KEY (a external_reference do MP),
  cupom_id, preco_centavos, criado_em, expira_em. Existe para o limite valer
  mesmo com várias pessoas abrindo o pagamento ao mesmo tempo.
- `compras.cupom TEXT` (código do cupom usado) + índice.

## Regras
- Código: trim + MAIÚSCULAS; aceita só A–Z, 0–9, "-" e "_", de 4 a 40 caracteres.
- Válido = existe, ativo = 1, agora ≤ valido_ate, e
  (compras com esse cupom) + (reservas não vencidas e ainda sem compra) < limite_usos.
- Preço final (função pura, centavos inteiros): percentual → preço × (100 − valor) / 100
  arredondado; valor → preço − valor; depois max(100, ...). 100% dá R$ 1,00.
- "Uso" = uma compra gravada com aquele cupom. A compra só é gravada no aviso
  do Mercado Pago aprovado (ou em /api/conta/criar, que confere o pagamento no MP),
  e o stripe_session_id é UNIQUE: o mesmo aviso chegando duas vezes conta um uso só.
- O código do cupom vai no `metadata` da preferência do MP (quem grava é o nosso
  servidor, o comprador não altera). O webhook lê o cupom do metadata do pagamento.
- Checkout com cupom: preferência e Pix vencem em 30 minutos (expiration_date_to e
  date_of_expiration); a reserva vence em 35 minutos.
- Stripe (reserva, PAGAMENTO=stripe): cupom não é aceito ("Cupom indisponível no momento.").
- `lib/cupom-teste.js` e a variável CUPOM_TESTE deixam de ser usados.

## API pública (sem login) — contrato atual mantido, o CheckoutForm não muda
- POST /api/cupom  { cupom } → 200 { ok:true, cupom:'CODIGO', preco:<reais, número>, de:<reais> }
  | 400 { ok:false, erro:'Cupom inválido, vencido ou esgotado.' } | 429 (freio por IP).
  Mesma mensagem para inexistente, vencido, esgotado ou desativado (não ajudar quem chuta).
- POST /api/checkout  { nome, email, eventoId, cupom } — revalida o cupom; se inválido,
  400 { error:'Cupom inválido, vencido ou esgotado.' }; se válido, cria a reserva e a
  preferência com unit_price = preço final.

## API da gestão (atrás do middleware, como a Fase 1)
Escrita: exige mesmaOrigem(req) (senão 404, igual ao resto) e corpo JSON.
- GET  /api/gestao/cupons → { ok, itens:[{ id, codigo, tipo, valor, valido_ate (ISO UTC),
  limite_usos, usos, reservas_ativas, faturamento_centavos, ativo, vencido, esgotado,
  criado_por, criado_em, desativado_por, desativado_em }] }  (ordem: ativos primeiro,
  depois mais novos; no máximo 200)
- POST /api/gestao/cupons  { codigo, tipo, valor, valido_ate:'AAAA-MM-DD' (dia de Brasília,
  inclusivo), limite_usos } → 201 { ok, cupom:{...mesmo formato} }
  | 400 { ok:false, erro, campo } (campo = qual entrada está errada)
  | 409 { ok:false, erro:'Já existe um cupom com esse código.', campo:'codigo' }
  Validações: código no formato; percentual 1–100; valor em centavos ≥ 1 e < preço;
  validade de hoje até no máximo 1 ano; limite 1–10000.
- POST /api/gestao/cupons/desativar  { id } → 200 { ok, cupom:{...} } | 404 se não existir.
  Desativar é definitivo (não há reativar) e grava desativado_por/desativado_em.
- Clientes e Período passam a devolver compra.cupom (hoje sempre null) e o CSV a coluna Cupom.
