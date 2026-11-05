# Afiliados: auditoria de segurança e prova do estorno (Fases 9 e 11)

Feita em 05/11/2026, só local. Branch `afiliados` (HEAD 5746b56 + as mudanças desta fase, sem commit). Base publicada: `origin/main` 71df934.
Nenhum acesso ao D1 remoto, nenhum segredo, nenhum deploy.

Provas: `npm test` 591 -> 619 passando (28 novos), `npx eslint .` com 0 erros.
Testes novos em `tests/afiliados/`: `e2e-estorno`, `seguranca-acesso`, `seguranca-dados`, `dinheiro-no-navegador` (e o apoio `_seg.mjs`).

## Resumo em uma frase
Não achei brecha que deixe um afiliado ver, sacar ou mexer nos dados de outro, nem segredo no código. Achei 1 defeito pequeno (corrigido) e 4 pontos que dependem de decisão sua (abaixo, "Riscos").

## 1. Fase 9: a história do estorno, de ponta a ponta
Arquivo `tests/afiliados/e2e-estorno.test.mjs`. Chama as rotas de verdade (checkout, webhook do Mercado Pago, saque, Gestão) e o robô de verdade, com o banco local. A conta, escrita no comentário do teste, bateu:

| Passo | O que acontece | Resultado conferido |
|---|---|---|
| 1 | 20 checkouts com o código | preço R$ 89,90 cheio, código na preferência, 20 eventos |
| 2 | 20 `approved` | 20 vendas, Prata: 20 x 15 = 300 + bônus 20 x 5 = 100 = **R$ 400** |
| 3 | 1 `refunded` antes do fechamento | venda cancelada (não é estorno) |
| 4 | painel do afiliado | **19 vendas, Bronze, R$ 285**, falta 1 para Prata |
| 5 | acesso | quem pediu reembolso fica sem acesso; os outros 19 seguem com acesso |
| 6 | robô no dia 8 | dia 7 não fecha; dia 8 fecha 1 vez (rodar de novo não duplica): 19 vendas, Bronze, base 285, bônus 0 |
| 7 | 1 `charged_back` depois do fechamento | estorno de **-R$ 15** (valor do nível fechado); o nível do mês continua Bronze; aviso repetido não estorna de novo |
| 8 | saldo | 19 x 15 - 15 = **R$ 270** |
| 9 | saque de R$ 270 | pedido pelo afiliado, comprovante enviado ao B2 (falso), pago pela Gestão, e-mail com anexo, afiliado abre o comprovante por link assinado |
| 10 | `in_mediation` e depois `approved` | acesso volta; **o estorno de -R$ 15 fica** (ver risco 4); saldo do afiliado fica em -R$ 15 |
| 11 | dashboard e financeiro da Gestão | vendas pagas 18; líquido R$ 1.528,20; comissão base R$ 285; estornos -R$ 30; custo R$ 255; lucro R$ 1.273,20; CPA R$ 14,17; pago R$ 270; o dashboard e o financeiro dão o mesmo custo e o mesmo lucro |

## 2. Fase 11, item 1: Semgrep antes e depois
- Ferramenta: Semgrep 1.183.0 (instalado fora do projeto, numa pasta temporária). Regras: `semgrep/semgrep-rules` clonadas, pastas `javascript/` (394 regras, JS/Next/React/Node) e `generic/secrets/`.
- Pastas varridas: `app`, `lib`, `components`, `workers`, `scripts`. O comando foi o mesmo nos dois estados. O estado da base foi lido num `git worktree` temporário de `origin/main`, já removido.
- Resultado: **base 56 achados, HEAD 66.** Segredos: 0 nos dois. Nenhuma regra nova apareceu (as 9 chaves novas são das mesmas regras que já existiam na base).

Achados novos (9) e classificação:

| Regra | Onde | Classe | Motivo |
|---|---|---|---|
| `js-open-redirect-from-function` | `components/CheckoutIndicacao.jsx:50` | falso positivo | o destino é `dados.url`, o link do Mercado Pago que o NOSSO `/api/checkout` devolveu; é o mesmo desenho do `CheckoutForm` (a base já tinha 1 igual) |
| `unsafe-dynamic-method` | `lib/afiliados/gestao-acoes.js:175` | falso positivo | `acoes[acao]` só roda depois de `ACOES_DO_AFILIADO.includes(acao)` (lista fechada) |
| `unsafe-dynamic-method` | `lib/afiliados/gestao-lista.js:185` | falso positivo | `CHAVES[ordem]` só roda depois de `Object.hasOwn(CHAVES, ordem)` |
| `unsafe-dynamic-method` | `workers/recuperacao-carrinho/orcamento.js:21` | falso positivo | é a armadilha (`Proxy`) do contador de consultas; `prop` vem do código, não de pessoa |
| `detect-non-literal-regexp` | `lib/b2-envio.js:28` | aceitável | a parte variável é `Number(saqueId)` (só dígitos ou `NaN`); o resto é constante |
| `missing-template-string-indicator` (2) | `lib/b2-envio.js:28` | falso positivo | as chaves `{8}`, `{4}` são da expressão regular, não de texto interpolado |
| `html-in-template-string` (2) | `lib/emails-afiliado.js:11,16` | falso positivo | toda variável do HTML passa por `escapeHtml` e o link por `safeUrl` (que também escapa) |

**Achado real sem proteção: 0.**

## 3. Fase 11, item 2: tabela de acesso das rotas
Legenda: "sessão" = o afiliado vem do login, nunca de um id da requisição. Todas respondem `Cache-Control: no-store` (testado). Os testes que provam cada linha estão em `tests/afiliados/seguranca-acesso.test.mjs`.

### Rotas do afiliado (`app/api/afiliados/**`)
| Rota | Quem usa | Exige mesma origem no POST | Filtra pela sessão | Dados sensíveis que devolve |
|---|---|---|---|---|
| `POST conta` | anônimo (Turnstile, 5 por hora por IP) | sim | n/a | nenhum (sempre `ok:true`) |
| `GET codigo` | logado | n/a | n/a | só "disponível ou não" |
| `POST cadastro` | logado, sem cadastro | sim | sim | código e link |
| `POST clique` | anônimo (sendBeacon) | **não** (sempre 204, de propósito) | n/a | nenhum |
| `GET vendas` | afiliado dono | n/a | sim | e-mail do comprador **mascarado**, valores |
| `GET ganhos` | afiliado dono | n/a | sim | valores e extrato |
| `GET saques` | afiliado dono | n/a | sim | valores, estado; nunca o caminho do comprovante |
| `POST saque` | afiliado dono, ativo | sim | sim | valor |
| `GET/POST pix` | afiliado dono (POST: senha + CPF do titular = CPF do afiliado; suspenso não troca) | sim | sim | Pix e CPF **mascarados** |
| `POST avisos` | afiliado dono | sim | sim (`afiliado_id` no UPDATE) | nada |
| `POST preferencias` | afiliado dono | sim | sim | nada |
| `GET saques/[id]/comprovante` | dono de um saque PAGO | n/a (GET) | sim (`afiliado_id` no SQL) | 302 para link do B2 de 5 min |

Provado: sem login, todas dão 401; com a conta A, mandar `afiliado_id`, `id` ou `afiliado` de B na URL ou no corpo não muda nada (respostas iguais às de quem não mandou), o comprovante de B dá 404 sem link, os avisos de B não são marcados, o Pix e as preferências de B não mudam, o saque de A não toca nos lançamentos de B, e Pix com CPF de B na conta de A é recusado.

### Rotas da Gestão (`app/api/interno/gestao/afiliados/**`)
Todas passam por `soAdmin`/`soMaster` (sessão real, `adminPeloToken`); anônimo e afiliado comum recebem o 404 do Next em qualquer método. POST de outra origem: 404. Aqui o id da requisição é permitido (a equipe vê qualquer afiliado).

| Rota | Quem | Dados sensíveis |
|---|---|---|
| `GET dashboard`, `financeiro`, `alertas`, `fechamento`, `metas`, `config` | master e membro | nomes e valores; sem CPF/Pix |
| `GET lista`, `ficha` | master e membro | e-mail e telefone do afiliado; CPF e Pix **mascarados** |
| `POST ficha/revelar` | master e membro | CPF ou Pix **inteiro**; grava quem pediu (e só devolve se gravou) |
| `GET saques` | master e membro | Pix inteiro (a equipe precisa para pagar) |
| `GET financeiro/csv` | master e membro | tipo `saques_pagos` traz CPF e Pix inteiros; grava quem exportou |
| `GET fechamento/csv` | master e membro | código, nome, valores |
| `GET/POST saques/[id]/comprovante`, `POST pagar`, `POST recusar` | master e membro | link do comprovante (5 min) |
| `POST alertas/[id]/resolver` | master e membro | nada |
| `POST acao` | `aprovar` e `anotar`: master e membro. `suspender`, `reativar`, `travar_nivel`, `trocar_codigo`, `ajuste`: só master (403 para membro) | nada |
| `POST config`, `POST metas`, `POST fechamento` | só master (404 para membro) | nada |

Provado: membro recebe 403/404 e **nada muda** nas ações de master; membro consegue aprovar e anotar.

## 4. Fase 11, item 3: dinheiro no navegador
Nenhuma conta de dinheiro acontece no navegador. O teste `dinheiro-no-navegador.test.mjs` varre `components/afiliados`, `components/gestao/afiliados` e `lib/afiliados-*.js` e falha se aparecer conta nova com valor. O que existe, e é permitido:

| Onde | O que é | Por que é aceitável |
|---|---|---|
| `components/gestao/afiliados/afiliadosUtil.js:70,77` | reais digitados <-> centavos | só converte o que o admin digitou para ENVIAR; o servidor valida de novo |
| `components/gestao/afiliados/saquesUtil.js:64` | centavos / 100 para copiar o valor do Pix | formatação |
| `lib/afiliados-simulador.js:66,75` | diferença entre dois totais e formatação | roda NO BUILD da landing; o navegador só recebe a tabela pronta (o teste confirma que o `Simulador.jsx` não importa `simular` nem `calcularNivel`) |
| `components/gestao/afiliados/ficha/Ajuste.jsx:49,64` | troca o sinal do ajuste e compara com o saldo | só aviso na tela; o servidor aplica e valida |
| `EscadaNiveis.jsx:44`, `graficos/Colunas.jsx`, `Funil.jsx`, `Origem.jsx` | largura de barra e percentual | desenho do gráfico, não aparece como R$ |

Fora do programa, `components/gestao/Periodo.jsx:27` (já está na `main`) soma Pix + cartão só para a régua de proporção.

## 5. Fase 11, item 4: comprovantes privados
- Link assinado de **300 s** (5 min) na tela e **3.600 s** (1 h) no anexo do e-mail; preso ao arquivo exato (`fileNamePrefix` = caminho inteiro); resposta 302 com `Referrer-Policy: no-referrer`, `Cache-Control: no-store` e `X-Robots-Tag: noindex` (testado).
- O arquivo só vai ao B2 com uma chave de escrita restrita ao prefixo `afiliados-comprovantes/`; tipo conferido pelos primeiros bytes; até 5 MB.
- **Defeito pequeno achado e corrigido:** `caminhoValido` (id + uuid + pdf/jpg/png dentro do prefixo) existia mas ninguém o usava na leitura. Se um dia o banco ficasse com um caminho torto (por exemplo `acervo/...` ou o arquivo de outro saque), os três lugares que geram o link o assinariam. Agora `GET` do afiliado, `GET` da Gestão e `marcarPago` recusam caminho fora do formato. Antes de colar a correção o teste novo falhava; depois passa.
  - Arquivos: `app/api/afiliados/saques/[id]/comprovante/route.js`, `app/api/interno/gestao/afiliados/saques/[id]/comprovante/route.js`, `lib/afiliados/saques-gestao.js`. Um teste antigo (`gestao-lista.test.mjs`) usava um caminho fora do formato e foi ajustado.

## 6. Fase 11, item 5: dados pessoais
- CPF e Pix mascarados fora da Gestão: provado em `vendas`, `ganhos`, `saques`, `pix` e no painel (nenhuma resposta contém o CPF, a chave nem o CPF formatado).
- E-mail do comprador: sempre `co***@exemplo.com` para o afiliado (provado). Os e-mails enviados ao afiliado não levam dado de comprador.
- `registro` (auditoria): depois de cadastro, Pix, saque, revelar e ajuste, nenhuma linha tem CPF nem chave em claro (provado). O que se grava é tipo da chave, valor, código do afiliado e quem fez.
- Cliques: só o HMAC-SHA256 (IP + navegador, com segredo) é gravado; o IP puro não aparece em nenhuma coluna (provado).
- O CPF e a chave Pix **ficam em claro no D1** (`afiliados.cpf`, `afiliados_pix.chave`, `afiliados_saques.pix_snapshot`): é necessário para pagar. Ver risco 7.

## 7. Fase 11, item 6: consultas ao D1 e CPU
Consultas por requisição (teste `seguranca-dados.test.mjs`, banco de teste com 126 vendas). Limite do plano grátis: 50 por invocação. A rota de afiliado soma 1 consulta de sessão e a da Gestão soma 1.

| Requisição | Consultas |
|---|---|
| painel do afiliado (`dadosDoPainel`) | 18 |
| `GET vendas` / `ganhos` / `saques` / `pix` | 3 / 8 / 4 / 3 |
| ficha da Gestão | 34 (pior caso estimado: 38) |
| dashboard | 18 |
| lista | 9 |
| financeiro | 5 |
| alertas | 12 |
| metas | 8 |
| saques | 6 |
| fechamento (relatório) | 5 |
| contador do menu da Gestão | 8 |

Tudo abaixo de 50. A ficha é a mais pesada e tem folga de 12.

Tempo de JS (fora do banco) com **1.000 afiliados, 30.000 compras, 22.500 lançamentos, 7.284 fechamentos e 90.000 cliques** (média de 10 chamadas, depois de aquecer; inclui montar o JSON; Node local, o Worker é mais lento, então use como ordem de grandeza):

| Tela | JS | Tempo do SQLite (local) |
|---|---|---|
| painel do afiliado | 0,8 ms | 0,3 ms |
| ficha | 2,6 ms | 1,1 ms |
| dashboard (mês / ano) | 4,5 ms / 6,5 ms | **99 ms / 183 ms** |
| lista (1.000 afiliados) | 2,3 ms | 15 ms |
| alertas | 0,9 ms | 56 ms |
| contador do menu | 0,4 ms | 26 ms |
| financeiro (mês / ano) | 0,3 ms / 0,5 ms | 3 ms / 41 ms |
| metas | 0,8 ms | 9,6 ms |
| demais | menos de 0,3 ms | menos de 3 ms |

**Nada passa de 10 ms de JS.** O que preocupa é o tempo de SQL e as linhas lidas em escala (risco 2).

## 8. Riscos e achados, por gravidade
Nenhum é alto. Os 4 primeiros precisam de decisão sua.

**Médio**
1. **Membro faz coisas de dinheiro e de dado pessoal.** Hoje o membro pode pagar saque, recusar saque, anexar comprovante, "revelar" CPF/Pix inteiros e baixar o CSV de saques pagos com CPF e Pix (só `suspender`, `ajuste` etc. ficaram só do master). Cenário: um membro marca "pago" com um comprovante qualquer e o saldo do afiliado some sem Pix enviado. Fica o registro de quem fez. Onde: `saques/[id]/pagar/route.js:62`, `recusar/route.js:53`, `saques/[id]/comprovante/route.js:75-76` (todos `comId` = `soAdmin`), `ficha/revelar/route.js:40`, `financeiro/csv/route.js`. Proposta: trocar para `soMaster` em pagar, recusar e comprovante, e deixar revelar/CSV de Pix só para o master. Teste que descreve o comportamento atual: `LACUNA: o membro paga e recusa saque...` (vira falha se a regra mudar; é só trocar a expectativa).
2. **Telas da Gestão leem a tabela inteira (escala).** Lista, alertas, dashboard e o contador do menu fazem varredura completa em lançamentos, cliques e fechamentos (confirmado com `EXPLAIN QUERY PLAN`). Hoje, com poucas vendas, é barato. Com 1.000 afiliados e 30 mil vendas, abrir a lista lê cerca de 140 mil linhas, e o contador do menu (que roda em TODA página da Gestão) varre os lançamentos. O limite do D1 grátis é 5 milhões de linhas lidas por dia. Onde: `lib/afiliados/gestao-lista.js:51`, `gestao-painel.js` (`GRUPOS_SQL`), `gestao-alertas.js`, `lib/gestao/avisos.js`. Proposta para quando o programa crescer: limitar por mês de referência e guardar contadores. Não mexi.
3. **Cliques inflados sem limite.** A trava é "1 clique por visitante em 24 h", e o visitante é IP + navegador. Quem troca o user-agent a cada pedido gera um clique novo por pedido (30 pedidos = 30 linhas, provado). Infla "cliques" e a conversão no dashboard e escreve no D1 sem limite (`lib/afiliados/clique.js:38-52`, `app/api/afiliados/clique/route.js`). Não afeta dinheiro. Proposta: limite por IP (hash) por hora.
4. **Mediação ganha pela loja não devolve a comissão** (já documentado como limitação). Depois do fechamento, `in_mediation` estorna -R$ 15; quando o `approved` volta, o acesso volta mas o estorno fica, e o afiliado fica com saldo -R$ 15 (painel mostra negativo e o saque fica bloqueado até novas vendas cobrirem). Onde: `lib/afiliados/venda.js` (`restaurarCompra`, limitação já no `docs/architecture.md`, Fase 4). Provado no passo 10 do teste. Decisão sua: fazer o `approved` depois de mediação lançar um ajuste positivo automático, ou continuar com ajuste manual.

**Baixo**
5. `mesmaOrigem` deixa passar POST sem o cabeçalho `Origin` (`lib/origem.js:13`). Navegador sempre manda `Origin` em POST de outro site e o cookie é `SameSite=Lax`, então o risco prático é baixo; teste descreve o comportamento.
6. O CPF do afiliado é autodeclarado: só confere os dígitos (`lib/afiliados/cpf.js`). A regra "Pix só do próprio CPF" compara com esse CPF, então não impede fraude sozinha. Existe alerta de CPF e Pix repetidos (`gestao-alertas.js:78`) e a Gestão confere ao pagar.
7. CPF e chave Pix em claro no D1 (necessário para pagar). Se quiser reforçar a LGPD no futuro: criptografar em repouso e mostrar inteiro só na hora de pagar.
8. Texto livre (motivo de suspensão e de ajuste, anotações) vai para o `registro` sem filtro; se a equipe digitar um CPF ali, ele fica gravado.
9. O extrato da Gestão soma também as vendas canceladas em `soma_centavos` (`lib/afiliados/gestao-financeiro.js`, função `extrato`; mostrado em `financeiro/Extrato.jsx:79`). Confirmar se o rótulo deixa claro que é "soma do filtro, com canceladas".
10. `GET codigo` (logado) deixa checar se um código existe. Os códigos já são públicos nos links; risco desprezível.
11. O `id` do comprovante é lido com `Number()`, que aceita `0x1`. Sempre filtrado pelo afiliado da sessão: inofensivo.

## 9. Como repetir
- Testes: `npm test` (619) e `npx eslint .`.
- Semgrep: clonar `https://github.com/semgrep/semgrep-rules`, e rodar `semgrep scan --metrics=off --config <regras>/javascript --config <regras>/generic/secrets app lib components workers scripts` na pasta do projeto e num `git worktree` de `origin/main`.
- Medida de CPU: o script ficou na pasta temporária da sessão (não entra no projeto).
