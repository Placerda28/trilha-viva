# Programa de afiliados: mapa do código e plano

Pedido original: `PROMPT-AFILIADOS-TRILHA-VIVA.md` (Downloads do Paulo, 04/11/2026). Branch `afiliados`, pasta `C:\dev\tv-afiliados`, base `origin/main` `71df934`.

## Decisões do Paulo (04/11/2026)
- Os dados ficam no **D1**, como o resto do site, e não no Supabase. Como as peças do prompt foram traduzidas:
  - RLS virou conferência no servidor (`clienteAtual()` e `soAdmin`).
  - RPC virou funções em `lib/afiliados/` com `db.batch` e INSERT condicional.
  - `pg_cron` virou uma etapa nova no robô (`*/10`).
  - O bucket privado virou armazenamento privado. A forma está em "Decisões pendentes".
- O `ruflo` não foi instalado. O trabalho é feito pelos agentes `tv-site-*`, e o Codex revisa.
- O trabalho vai num branch novo a partir da `main`, sem misturar com a gestão nova.

## Mapa do que existe (pontos de encaixe)

### Preço
- `site.price` (89,9) em `lib/site.js:12`.
- Vira centavos com `Math.round(site.price*100)` em 4 lugares (cupom, checkout, gestão de cupons, `cuponsPreco.js`).

### Cupons
- `lib/gestao/cupons-regras.js`:
  - normalização: `trim().toUpperCase()`;
  - formato: `^[A-Z0-9_-]{4,40}$`;
  - cálculo: `calcularPrecoCupom`, que tem piso de 100 centavos.
- `lib/gestao/cupons.js`:
  - `consultarCupomValido`, `reservarCupom` (35 min), `estenderReservaCupom` (+96 h quando o pagamento fica pendente) e `cancelarReservaCupom`;
  - tabelas `cupons` e `cupom_reservas` (`migrations/0002`).
- Já existe só **1 cupom por compra**: a coluna é `compras.cupom`.
- **Atualizado em 04/11 (sem desconto):** o afiliado NÃO usa cupom. Tem um código (`afiliados.codigo`) que só registra a venda; o comprador paga R$ 89,90 cheio, e pode usar cupom de campanha e código na mesma compra.

### Checkout
`app/api/checkout/route.js:105-184` faz, em ordem:
1. valida o cupom;
2. reserva a vaga;
3. grava o carrinho;
4. cria a preferência com o preço calculado no servidor.

O `metadata` do Mercado Pago já leva `cupom` e `referencia` (UUID = `external_reference`).

### Webhook (`app/api/mercadopago/webhook/route.js`)
- Confere a assinatura HMAC e trata só `type=payment`. Consulta o pagamento de novo e passa por `resumirPagamento`.
- Status:
  - `approved` vira `paid`;
  - `pending` estende a reserva;
  - **todo o resto vira `failed`**: refunded, charged_back, cancelled e in_mediation, sem distinção.
- **Hoje ninguém trata reembolso.** `compras.status` nunca muda e fica `pago` para sempre, então quem pediu reembolso continua com acesso ao acervo.
- Idempotência: `INSERT OR IGNORE` em `stripe_session_id = mp_<id>`. `registrarCompra` (`lib/gestao/cupons.js:191`) devolve `true` só na 1ª inserção.
- A compra também pode nascer em `app/api/conta/criar` (a `/sucesso`) e no webhook da Stripe. Por isso a comissão base precisa nascer **dentro do caminho comum** (`registrarCompra`), e não só no webhook.
- Taxa do Mercado Pago (`fee_details` e `net_received_amount`): está no objeto bruto de `buscarPagamento()` (`lib/mercadopago.js:148`), mas hoje não é lida.

### Tabela `compras`
- Colunas: `id`, `cliente_id`, `stripe_session_id`, `stripe_payment_intent`, `valor_centavos`, `moeda`, `status`, `criado_em`, `forma_pagamento`, `cupom`, `utm_*`, `meta_*`, `teste*` e `acesso_enviado_em`.
- Visão `compras_reais` (só `teste = 0`).

### E-mail
- `lib/email.js`: `enviar()` e `moldura()` (template único), com Resend e `EMAIL_FROM`.
- O robô importa `lib/` por caminho relativo, sem `@/`.

### Robô
- `workers/recuperacao-carrinho/index.js`, `executarRodada`: etapas independentes, cada uma em try/catch, rodando a cada 10 min.
- O fechamento e o aviso "faltam X vendas" entram como uma etapa nova.

### Login do cliente
- `clienteAtual()` e `temCompra()` em `lib/sessao.js`.
- Modelo de página protegida: `app/acervo/page.js`.
- **Ainda não existe `/minha-conta`.**

### Gestão nova
- Menu: `MENU` em `components/gestao/BarraLateral.jsx`.
- Telas com período: `COM_PERIODO` em `Casca.jsx`.
- Permissão: `soAdmin` / `soMaster` / `naoEncontrado` (404).
- Modelos de rota: GET com período em `leads/route.js`, POST com `mesmaOrigem` mais `gravarRegistro` em `cupons/route.js`.
- Números vermelhos do menu: `lib/gestao/avisos.js`.
- Lint: `max-lines` 350; `components/` não importa `@/lib/d1`.

### B2
- `lib/b2.js` só lê (`linkDeDownload` assinado). **Não há upload**, e a documentação proíbe mexer nesse arquivo.

### Menu e rodapé públicos
- Links do menu: `nav` em `lib/site.js` (montado em `components/Header.jsx`).
- Rodapé: `columns` em `components/Footer.jsx`.

### Testes
- `npm test` usa `node --test`.
- D1 em memória: `tests/gestao/_d1local.mjs`, com `node:sqlite` e todas as migrações. O `run()` dele não devolve `last_row_id`.
- Rotas são testadas com módulos falsos (`registerHooks`).

### Restrições
- 10 ms de CPU por visita, consultas sempre com `LIMIT`, datas UTC no D1 e o dia do negócio em Brasília.
- A migração vai ANTES do deploy e quem aplica no remoto é o Paulo.
- Não mexer em `app/api/baixar`, `lib/b2.js` e `lib/cota.js`.

## Decisão do Paulo (04/11/2026): sem desconto, código só registra
- Não há desconto do afiliado nem cupom. O link `?ref=CODIGO` leva o código aplicado (cookie de 30 dias) e o checkout mantém o preço cheio.
- Código: maiúsculo, 4 a 15 letras e números, único. Na Fase 4, `compras.codigo_afiliado` e `compras.afiliado_id` guardam a atribuição.
- Eventos de checkout: `codigo_recusado_proprio` e `codigo_recusado_inativo`.
- A Fase 2 foi revisada (Fase 2b) depois do Codex achar 6 bugs; todos corrigidos com teste (ver `tests/afiliados/`).
- Fase 2c (2ª revisão do Codex): o INSERT do fechamento só grava se as vendas do mês (válidas e total) continuam iguais dentro do lote; senão recalcula e tenta de novo (3 vezes) e, esgotado, devolve o afiliado em `pendentes` para o botão manual repetir. `estornarVenda` devolve `acao`/`criado` exatos pelos resultados do lote (`RETURNING`). Testes novos em `tests/afiliados/fechamento.test.mjs`.

## Decisões do Paulo (04/11/2026, 2ª rodada)
1. **Pedido de reembolso tira o acesso ao acervo.** Na Fase 4:
   - `refunded`, `charged_back` e `in_mediation` (o pedido aberto pelo comprador) mudam `compras.status` e tiram o acesso.
   - Se a mediação terminar a favor da loja (`approved` de novo), o acesso volta.
   - A venda sai da meta do afiliado, e a comissão base é cancelada (antes do fechamento) ou vira ajuste negativo (depois).
2. **Comprovante: eu escolho.** Escolhido o **B2 com uma chave nova só de gravação no prefixo `afiliados-comprovantes/`**, no mesmo modelo da chave do Palco (só `palco/`).
   - O código fica num módulo novo, `lib/b2-envio.js`. O `lib/b2.js` não muda.
   - O Paulo cria a chave no Backblaze na Fase 7, com o passo a passo.
   - O fluxo desejado pelo Paulo:
     1. Gestão > Afiliados > Solicitações;
     2. clicar em **Pagar**;
     3. aparece o Pix com o botão de copiar e o campo para anexar;
     4. ele paga e anexa;
     5. **Marcar como pago**;
     6. o e-mail ao afiliado sai **com o comprovante em anexo** (o anexo do Resend aceita arquivos de até 5 MB);
     7. o aviso aparece no painel do afiliado, com o link de download.

## Decisões pendentes antigas (já respondidas acima, 1 e 2)
1. **Reembolso tira o acesso ao acervo?** O afiliado exige tratar `refunded` e `charged_back`, que hoje viram `failed` e são ignorados. Há duas opções:
   - mudar `compras.status` para `reembolsado`, o que **tira o acesso**;
   - criar uma coluna separada só para a comissão, mantendo o acesso.

   Decidir antes da Fase 4.
2. **Comprovante do Pix:** o B2 atual não tem upload, e `lib/b2.js` não pode ser mexido. Há duas opções:
   - **(a)** um bucket R2 privado, que o Paulo cria no painel, com binding novo;
   - **(b)** um módulo novo `lib/b2-envio.js` com uma chave B2 própria, restrita ao prefixo `afiliados/`.

   Decidir antes da Fase 7.
3. **Chargeback:** o Mercado Pago avisa por outro tópico (`chargebacks`), que hoje é ignorado. O pagamento também vem com status `charged_back` no tópico `payment`. Usar só esse status basta?

## Fases (cada uma provada antes da próxima)
- [x] **1. Mapa do código e plano** (este arquivo).
- [x] **2. Banco (feita em 04/11/2026, só local).** Prova: `npm test` 343 -> 358 passando (15 novos em `tests/afiliados/`), `npx eslint lib/afiliados tests/afiliados` limpo. Limites 0/1/19/20/49/50/51 deram 0/1.500/28.500/40.000/98.000/150.000/153.000 centavos; fechamento 2x = 1 fechamento e 1 bônus; 20 vendas - 1 reembolso = 19 = Bronze = 28.500; saque barrado (sem Pix, aberto, antes de 15 dias, sem saldo, abaixo do mínimo); duas chamadas simultâneas = 1 saque. Migração NÃO aplicada no remoto. Plano original da fase:
  - funções `statusDoMes`, `fecharMes` e `pedirSaque`;
  - testes no D1 local:
    - os limites 0, 1, 19, 20, 49, 50 e 51 vendas devem dar 0, 15, 285, 400, 980, 1.500 e 1.530;
    - fechar o mês 2 vezes não duplica;
    - 20 vendas com 1 reembolso dão 19, que é Bronze;
    - o saque é barrado quando há outro em aberto, quando faltam menos de 15 dias desde o último pedido e quando falta o Pix;
    - um afiliado não lê os dados de outro.
- [ ] **3. Cadastro, código, link `?ref=` (cookie de 30 dias) e cliques.** Backend feito em 04/11/2026 (rotas `/api/afiliados/{conta,codigo,cadastro,clique}`, CPF, e-mails; `npm test` 381 passando).
  - [x] **Frontend (04/11/2026, só local):**
    - `components/RefCaptura.jsx` montado em `app/layout.js` (cookie `tv_ref`, 30 dias, clique por `sendBeacon`); regras puras em `lib/afiliados-ref.js`.
    - `/minha-conta/afiliado` com 3 estados (visitante, cadastro, já afiliado); peças em `components/afiliados/`, regras de tela em `lib/afiliados-campos.js`.
    - `?volta=` em `/entrar` e `/criar-senha` (`components/ContaForm.jsx`), lista fechada de caminhos.
    - Protótipo temporário para print: `app/prototipo-afiliado/[estado]` (404 em produção; apagar na aprovação). Testes: `tests/afiliados/campos-ui.test.mjs`.
- [ ] **4. Checkout e webhook:**
  - [x] **Frontend (04/11/2026, só local):** campo opcional "Código de quem te indicou" no `/assinar`, atrás do link "Tem código de quem te indicou?", logo abaixo do cupom (`components/CheckoutIndicacao.jsx`, usado em `CheckoutForm.jsx`).
    - Vem preenchido e aberto pelo cookie `tv_ref` (ou pelo `?ref=`); a pessoa apaga ou troca, e o que está no campo vale.
    - Vai no `POST /api/checkout` como `codigo_afiliado` (maiúsculas, só A-Z e 0-9, até 15). Campo apagado de propósito também apaga o cookie.
    - `aviso_afiliado` da resposta aparece sob o botão e o pagamento abre sozinho depois de 3,5 s ("Ir agora" abre na hora).
    - Regras puras em `lib/afiliados-ref.js` (`codigoDoCookie`, `cookieDoRefApagado`), testadas em `tests/afiliados/campos-ui.test.mjs`.
  - [x] **Backend** feito em 04/11/2026 (só local): código no checkout (corpo ou cookie `tv_ref`), validação no servidor, `metadata.afiliado`, comissão base em `registrarCompra` (webhook e `conta/criar`), taxa do MP, avisos de nível, reembolso/mediação/chargeback tirando o acesso e estornando a comissão. `npm test` 386 -> 407. Falta só a prova no navegador com o backend e o frontend juntos.
  - comissão base de R$ 15 dentro de `registrarCompra`;
  - bloqueio do próprio cupom;
  - taxa do Mercado Pago lida do pagamento;
  - prova de que o webhook repetido não duplica.
- [ ] **5. Área do afiliado** `/minha-conta/afiliado` (seção 6.3 do prompt), com estado vazio e versão de celular.
- [ ] **6. Fechamento mensal:** etapa no robô, botão manual e e-mails de resumo e de subida de nível.
- [ ] **7. Saques e Gestão:** fila, comprovante, pago/recusado e e-mails.
- [ ] **8. Dashboard, Metas, Financeiro e Alertas da Gestão:** dados de teste conferidos numa planilha; os dados de teste são apagados depois.
- [ ] **9. Estorno e chargeback** antes e depois do fechamento.
- [ ] **10. Landing `/afiliados`** com simulador, termo e itens no menu e no rodapé.
- [ ] **11. Segurança:** semgrep antes e depois, revisão das conferências de acesso e prova de que nenhum cálculo de dinheiro acontece no navegador.
- [ ] **12. Teste final** no celular e no computador, e explicação para o Paulo.

Fora do escopo agora (seção 8 do prompt): material de divulgação, ranking público e Pix automático.
