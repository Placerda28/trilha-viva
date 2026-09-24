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
- [ ] Prova em PRODUÇÃO depois do merge: Paulo vê o menu; curl sem cookie → 404; totais = SELECT no D1 remoto
- [x] `npm run build` limpo (e `opennextjs-cloudflare build` limpo)
- [ ] CPU das rotas novas medida em produção (wrangler tail / Observability) — só dá depois de publicar
- [ ] PARADA: merge em main com OK do Paulo

## Fase 2 — Cupons
- [ ] (C) Tabela `cupons` + `compras.cupom` (PARADA: SQL ao Paulo)
- [ ] (C) Validação no servidor em `/api/checkout` e `/api/cupom`: validade, limite, ativo, sem diferenciar maiúscula, preço final ≥ R$ 1,00
- [ ] (C) Uso contado só no webhook, pagamento aprovado, uma vez só (idempotente)
- [ ] (C) Rotas de cupons (criar, listar com usos e faturamento, desativar)
- [ ] (F) Tela Cupons; "Tenho um cupom" já existe, ajustar ao novo formato
- [ ] Aposentar `lib/cupom-teste.js` / `CUPOM_TESTE`
- [ ] Prova: inválido/vencido/esgotado recusado; nunca abaixo de R$ 1,00; aviso duplicado conta 1 uso; compra real no Pix (Paulo, outra conta); desativado → recusado

## Fase 3 — Equipe + registro de ações
- [ ] (C) Tabelas `equipe` e `registro` (PARADA: SQL ao Paulo)
- [ ] (C) Criar membro via Supabase Admin (`SUPABASE_SECRET_KEY`), troca de senha no 1º acesso, remover corta na hora, "liberar acervo" desligado por padrão
- [ ] (C) Registro: cupom criado/desativado, cliente bloqueado, membro adicionado/removido
- [ ] (F) Tela Equipe (só master) e tela Registro
- [ ] Prova: membro entra, troca senha, vê gestão sem Equipe, é recusado nas rotas de Equipe; removido perde acesso na próxima requisição

## Fase 4 — Visão geral, Downloads, ações no cliente, reembolso
- [ ] (C) Visão geral (hoje/7d/30d/mês + gráfico), músicas mais baixadas, clientes que batem a cota
- [ ] (C) Ações: reenviar e-mail de acesso, bloquear/liberar, zerar a cota do dia
- [ ] (C) Webhook: refunded/charged_back → bloqueia e marca "reembolsada"
- [ ] (F) Telas correspondentes
- [ ] Prova: reembolso feito pelo Paulo no painel do MP bloqueia o acesso

---

# Trilha Viva — ajustes de 05/09/2026

Registro do que foi pedido, o que foi feito, o que foi provado e o que ficou
esperando. Nada aqui é marcado como pronto sem evidência.

Foram duas rodadas no mesmo dia, com a mesma estrutura de cinco etapas. Na
primeira, a etapa 1 travou; na segunda, saiu por outro caminho.

---

# Etapa 1 — shadcn: button, dialog e card — FEITO

## O `shadcn init` não roda aqui, e não deveria rodar mesmo

Duas razões independentes, e as duas continuam valendo:

**O ambiente não alcança o registro.**

```
$ npx shadcn@latest init -d -y
Request to https://ui.shadcn.com/init?... failed, reason: Request was cancelled.

$ curl https://ui.shadcn.com/init
curl: (56) CONNECT tunnel failed, response 403
```

O proxy libera o npm (`registry.npmjs.org` → 200) e bloqueia `ui.shadcn.com`. O
CLI baixa dali tanto o payload do `init` quanto o código de cada componente. A VM
ligada à pasta do OneDrive também não tem rede.

**E, mesmo com rede, o `init` conflitaria com o Tailwind atual** — o caso em que
você mandou parar e avisar:

| O que o `shadcn init` faz | Conflito |
| --- | --- |
| Escreve `@layer base` em `globals.css` com `--background`, `--foreground`, `--primary`, `--muted`, `--accent`… | Cria um **segundo sistema de cor** ao lado de `ink` / `paper` / `mist` / `signal` |
| Injeta `theme.extend.colors` mapeando para `hsl(var(--...))` | Colide com o token `accent` |
| Adiciona `* { @apply border-border }` e estilos de `body` | Sobrescreve o `body` que define o off-white |
| Liga `darkMode: 'class'` | Muda o comportamento global de tema |

## O caminho que funcionou: o fonte canônico, direto do GitHub

`github.com` é alcançável e `shadcn-ui/ui` é público. Puxei os três arquivos do
repositório — **a mesma origem que o registry serve**.

```
apps/www/registry/new-york/ui/{button,dialog,card}.tsx
  @ refs/tags/shadcn-ui@0.9.4
```

**Por que essa tag e não o `main`:** o `main` hoje só tem `apps/v4`, escrito para
Tailwind 4 — usa `@container/card-header`, `shadow-xs` e `has-data-[slot=...]`,
que não existem no 3.4. A tag 0.9.4 fixa `tailwindcss 3.4.6` no próprio
`package.json`, praticamente o nosso 3.4.17.

### O que mudou, e por quê

| Mudança | Motivo |
| --- | --- |
| `.tsx` → `.jsx` | O projeto é JavaScript, sem TypeScript |
| `@radix-ui/react-dialog` / `react-slot` → pacote unificado `radix-ui` | Você pediu `radix-ui`. Mesmos primitivos, um pacote só |
| `lucide-react` → SVG inline | O site já usa SVG inline no mesmo traço 1.8 (`Header.jsx`, `ui.jsx`). Não vale uma dependência por um X |
| `@/lib/utils` → `@/lib/cn` | Você pediu `lib/cn.js`; `lib/utils.js` não existe aqui |
| **Sem a variante `destructive`** | Sua decisão. A paleta não tem tom de alerta e o site não tem ação destrutiva. Nenhum token foi inventado |
| Card **sem sombra**, `rounded-lg` no lugar de `rounded-xl` + `shadow` | Ver abaixo, na etapa 2 |
| Botão com as medidas do site | `.btn-signal` é `px-7 py-4 text-[15px] leading-none` = 48px. Daí `h-12` no `default`, e raio de 4px como todo botão daqui |
| Variante extra `onink` | Para botão dentro de painel escuro, que o site já tem (`.btn-onink`). Sem ela, o `outline` sumiria contra o `bg-ink` |

### Mapa de tokens — nenhum token novo

| shadcn | Trilha Viva |
| --- | --- |
| `bg-primary` / `text-primary-foreground` | `bg-signal-deep` / `text-white` |
| `bg-secondary` / `text-secondary-foreground` | `bg-mist` / `text-ink` |
| `bg-accent` / `text-accent-foreground` | `bg-mist` / `text-ink` |
| `border-input` | `border-ink/25` (botão), `border-line` (superfícies) |
| `bg-background` / `bg-card` | `bg-paper` / `bg-white` |
| `text-card-foreground` | `text-ink` |
| `text-muted-foreground` | `text-ink-muted` |
| `ring-ring` / `ring-offset-background` | `ring-ink` / `ring-offset-paper` |
| overlay `bg-black/80` | `bg-ink/60` |

Nenhum `--background`, `--primary` ou `--accent`. Nenhum segundo sistema de cor.

### Arquivos e dependências

```
lib/cn.js                 novo
components/ui/button.jsx  novo
components/ui/card.jsx    novo
components/ui/dialog.jsx  novo
package.json              +5 pacotes
tailwind.config.js        +1 linha
```

`radix-ui@1.6.7` (peer aceita React 19), `class-variance-authority@0.7.1`,
`clsx@2.1.1`, `tailwind-merge@^2.6.1` e `tailwindcss-animate@1.0.7` (devDep,
junto do tailwindcss).

**`tailwind-merge` na linha 2, não na 3:** a 3.x é escrita para Tailwind 4 e pode
fundir classes errado no 3.4.

### A única alteração no tailwind.config.js

```diff
-  plugins: [],
+  plugins: [require('tailwindcss-animate')],
```

Você liberou essa linha. Nada de `darkMode`, nada de cor, nada no `body` —
confirmado por `git diff`, que mostra só ela mais o comentário.

### Onde os componentes são usados: em lugar nenhum, de propósito

O site não tem diálogo nem card hoje, e o botão já é a classe `.btn-signal`.
Trocar as classes por `<Button>` nas 16 páginas seria refactor grande, sem ganho
visual, mexendo inclusive no formulário de checkout — que é o caminho do
dinheiro. Eles ficam como biblioteca pronta e provada; a adoção é decisão
separada. Candidatos naturais para quando a hora chegar: o `dialog` para a prévia
de uma música no acervo, e o `card` para os blocos de ferramentas em `/como-usar`.

---

# Etapa 2 — Construção de UI — FEITO

**`frontend-design`** foi a diretriz nas duas rodadas, e mudou decisões concretas:

- Na rodada 1, é a razão de o visual anterior (creme + serifada + terracota +
  rótulo em caixa alta acima de cada seção) ter sido trocado — aquilo é
  literalmente o padrão que uma IA produz por default.
- Na rodada 2, a skill lista "conteúdo picado em cards arredondados idênticos,
  todos com a mesma sombra cinza" como um dos tells de página gerada por IA — e
  isso é literalmente o default do card do shadcn (`rounded-xl border shadow`).
  Daí o card ter saído **sem sombra**, com o raio do `.panel` (10px). Este
  sistema não tem sombra em lugar nenhum: quem separa superfície é a borda `line`
  e a troca de fundo.

**`magic21` (21st.dev):** busca usada como referência de componentes de áudio
(WaveformPlayer, Waveform) e de composição. A **geração** segue travada pelo
limite diário do plano gratuito (`generation_limit_reached`). Para liberar:
21st.dev/pricing.

---

# Etapa 3 — Animação — FEITA À MÃO

**A skill `emil-design-eng` não existe nesta conta**, nas duas rodadas. Procurei
de novo depois de você dizer que tinha instalado — ver a seção "Os dois
destravamentos" no fim. Não inventei substituto: decidi à mão e registrei os
valores, que é o que a skill entregaria.

Só anima o que entra, sai ou marca tempo:

| Onde | O quê | Valores |
| --- | --- | --- |
| Overlay do dialog | Só opacidade | `fade-in-0` / `fade-out-0`, `duration-150` |
| Caixa do dialog | Opacidade + escala | `zoom-in-95` → 100%, `duration-150` |
| Ponto do canal "clique" no painel de sessão | Piscada em degraus, imitando metrônomo | `1.9s`, `steps(1, end)`, opacidade `0.18 → 1 → 0.18` |
| Botões e links | Só troca de cor | `150ms`, `transition-colors` |
| Tudo | Respeita `prefers-reduced-motion: reduce` | animação e transição caem para `0.001ms` |

Nada de entrada em fade-and-slide por seção, que é o default genérico. A regra de
`prefers-reduced-motion` é global, então vale para os componentes novos de graça.

---

# Etapa 4 — Polimento — FEITO À MÃO

**A skill `web-design-guidelines` também não existe nesta conta.** Mesma
situação. Auditoria à mão, com números medidos e não estimados.

## Correções aplicadas na rodada 1 (site inteiro)

| Achado | Correção |
| --- | --- |
| Foco de teclado invisível nas linhas do setlist, nos links de texto e no rodapé | Regra global `:focus-visible` com contorno de 2px e `outline-offset`, e variante clara dentro dos painéis escuros |
| Anel de foco dos botões desenhado sobre branco puro, num fundo off-white | `focus-visible:ring-offset-paper` |
| Filtros de categoria do acervo não anunciavam qual está ativo | `aria-pressed` nos botões |
| Ocre/ardósia como **texto** sobre fundo claro ficava em ~4:1 | Etiquetas viraram a classe `.chip` (fundo `signal-deep` + texto branco, ~6:1); botões usam `signal-deep` |
| Taupe `#7F7265` da paleta anterior no corpo de texto ficava no limite | Token `ink-muted` passou a ser um degrau mais escuro da mesma família |

Já estavam certos antes: `lang="pt-BR"`, link "pular para o conteúdo", `alt` em
todas as imagens, `aria-hidden` no que é decorativo, `aria-label` na busca, FAQ em
`<details>/<summary>`, um `h1` por página, alvo de toque das linhas do setlist em
~52px.

## Correção aplicada na rodada 2 (componentes novos)

O botão de fechar do dialog media **26×26px** no padrão do shadcn — passa
raspando no mínimo da WCAG 2.2 (24px) e é apertado para o dedo. Aumentei a área
clicável para **40×40** sem mexer no tamanho do ícone (18px). Medido no render
real, antes e depois.

## Contraste, medido variante por variante

| Elemento | Rácio | AA (4.5) |
| --- | ---: | --- |
| button `default` (branco sobre `signal-deep`) | 6.49 | OK |
| button `default` hover (branco sobre `ink`) | 11.11 | OK |
| button `outline` / `ghost` / `link` (`ink` sobre `paper`) | 10.53 | OK |
| button `secondary` (`ink` sobre `mist`) | 8.06 | OK |
| button `secondary` hover (`ink` sobre `mist-deep`) | 6.99 | OK |
| button `onink` (branco sobre `ink`) | 11.11 | OK |
| card / dialog — título | 11.11 | OK |
| card / dialog — descrição (`ink-muted` sobre branco) | 5.53 | OK |
| dialog — botão de fechar | 5.53 | OK |

**Pior caso: 5.53.** Nenhuma variante abaixo de AA.

## Alvos de toque, medidos no navegador

| Alvo | Tamanho | |
| --- | --- | --- |
| button `sm` | 40px | acima do mínimo |
| button `default` | 48px | confortável |
| button `lg` | 56px | confortável |
| button `icon` | 48×48px | confortável |
| dialog fechar | 40×40px | corrigido de 26px |

## Teclado, testado de verdade no dialog

```
OK  gatilho recebe foco
OK  dialog abre com Enter
OK  foco entra no dialog
OK  aria-labelledby e aria-describedby apontam para titulo e descricao
OK  foco continua preso apos 5 Tab
OK  Esc fecha
OK  foco volta ao gatilho
```

---

# Etapa 5 — Semgrep — FEITO

## Instalação e regras

```
$ semgrep --version
1.176.1
```

`semgrep.dev` está bloqueado pelo proxy (403), então `--config=auto` e os pacotes
`p/javascript` não baixam. Solução: clonei o repositório oficial de regras
(`github.com/semgrep/semgrep-rules`, que é alcançável) e rodei com as regras
locais. **O comando é idêntico nas três execuções** — é o que torna a comparação
honesta:

```
semgrep scan --metrics=off \
  --config=<semgrep-rules>/javascript \
  --config=<semgrep-rules>/typescript \
  --exclude=node_modules --exclude=.next \
  app components lib scripts
```

## Antes e depois

| Regra | Rodada 1 antes | Rodada 1 depois | Rodada 2 depois |
| --- | ---: | ---: | ---: |
| `html-in-template-string` | 1 | 1 | 1 |
| `jsx-not-internationalized` | 143 | 143 | 144 |
| `missing-template-string-indicator` | 4 | 4 | 4 |
| `react-dangerouslysetinnerhtml` | 3 | 3 | 3 |
| `react-props-spreading` | 0 | 0 | 13 |
| **Total** | **151** | **151** | **165** |

**O número não cai, e isso é o resultado certo.** As regras que sobram são
sintáticas, não de fluxo de dados: marcam o *formato* do código, não a origem do
dado. O que mudou foi a exposição real:

- **Achados com risco real sem mitigação: antes 4, depois 0.**
- Comportamento alterado: **nenhum**.

Zerar o contador só seria possível suprimindo alerta — a gambiarra que você pediu
para evitar.

## Cada achado, explicado

### 1. `react-dangerouslysetinnerhtml` — MÉDIA — 3 ocorrências — CORRIGIDO

`app/artistas/[slug]/page.js:45`, `app/blog/[slug]/page.js:61`,
`app/musicas/[slug]/page.js:86`

Causa: o bloco JSON-LD é injetado com `dangerouslySetInnerHTML` e carrega
`song.title`, `artist.name` e `post.title`. `JSON.stringify` **não escapa `<`**,
então um título contendo `</script>` fecharia a tag e o resto do texto viraria
HTML executável na página. Hoje o catálogo é nosso, mas ele vai ser regenerado a
partir das pastas do Drive — ou seja, de nomes de arquivo que não controlamos.

Correção: `lib/safe.js` → `ldJson()`, que serializa e converte os caracteres
perigosos em escapes. O parser de JSON lê esses escapes como os caracteres
originais, então **o dado que chega ao Google e ao navegador é idêntico** — só
não pode mais escapar da tag.

**Regra de escopo, para manter o impacto mínimo:** todo JSON-LD que carrega dado
de catálogo ou de post usa `ldJson`. São cinco arquivos — os três marcados pelo
Semgrep mais `app/musicas/page.js` e `app/blog/page.js`. Os outros cinco
(`layout`, `page`, `faq`, `como-usar`, `artistas`) montam o LD só com constantes
nossas e seguem no `JSON.stringify`. Quando o catálogo real vier do Drive,
qualquer LD novo que toque nele entra nessa regra.

Prova com entrada hostil:

```
entrada:  { name: 'A Bênção </script><img src=x onerror=alert(1)>' }
saída contém "</script>"?  false
JSON.parse(saída).name === entrada.name?  true
```

### 2. `html-in-template-string` — BAIXA — 1 ocorrência — CORRIGIDO

`app/api/webhook/route.js:9`

Causa: `emailHtml()` monta o e-mail de liberação interpolando `nome` e `url`
direto no HTML. O `nome` vem do checkout da Stripe, ou seja, é digitado pelo
comprador: `<img src=x onerror=...>` no campo de nome entraria cru no e-mail.

Correção: `escapeHtml(nome)` e `safeUrl(url)`. O `safeUrl` só aceita `http:` e
`https:` — se `DRIVE_URL` for preenchida errado um dia, um `javascript:` vira
string vazia em vez de link clicável.

```
escapeHtml('<b>Paulo</b>')            -> '&lt;b&gt;Paulo&lt;/b&gt;'
safeUrl('https://drive.google.com/x') -> 'https://drive.google.com/x'
safeUrl('javascript:alert(1)')        -> ''
```

### 3. `react-props-spreading` — INFO — 13 ocorrências — NÃO CORRIGIDO, de propósito

`components/ui/button.jsx:55`, `card.jsx:20,26,34,44,50,54`,
`dialog.jsx:32,50,68,75,85,95`

Causa: o `{...props}` no fim de cada componente. A regra avisa que espalhar props
pode passar atributo inválido para o DOM, ou deixar alguém injetar atributo
inesperado.

**Não corrigi, e o motivo é a sua própria regra.** Esse `{...props}` *é* a API do
componente — é o que faz `<Button type="submit">` e `<Card id="x">` funcionarem.
Tirar não é corrigir: é quebrar. Seria alterar comportamento, exatamente o que
você mandou não fazer. E o risco que a regra descreve depende de quem chama ser
não confiável; aqui todo chamador é código nosso.

### 4. `missing-template-string-indicator` — INFO — 4 ocorrências — FALSO POSITIVO

`app/layout.js:90` (×2), `app/api/checkout/route.js:82` (×2)

São `{search_term_string}` no `urlTemplate` do schema.org e
`{CHECKOUT_SESSION_ID}` no `success_url` da Stripe. Os dois **têm que ser
literais** — quem substitui é o Google e é a Stripe. Colocar `$` na frente
quebraria as duas integrações.

### 5. `jsx-not-internationalized` — INFO — 144 ocorrências — RUÍDO

A regra quer que todo texto passe por uma biblioteca de i18n; o site é monolíngue
em pt-BR e não tem plano de tradução. "Corrigir" significaria instalar i18n e
reescrever todas as páginas — mudança enorme, sem ganho. A 144ª é a palavra
"Fechar" no rótulo de leitor de tela do dialog.

## Resumo honesto

- Achados com risco real: **2 tipos, 4 ocorrências**. Todos mitigados.
- Achados com risco real sem mitigação: **0**.
- Ruído que permanece: 161 (144 de i18n + 13 de props-spreading + 4 falsos
  positivos).

Se quiser o contador limpo, o caminho correto é anotar com
`// nosemgrep: <regra>` e a justificativa ao lado — é o fluxo previsto pela
ferramenta para achado revisado. Me fala que eu faço.

## Uma coisa que apareceu de lado

O `npm audit` acusa duas vulnerabilidades — 1 moderada e 1 alta — **as duas no
`postcss` 8.4.49**, que já estava lá antes e não tem relação com os pacotes
novos. Não mexi porque subir o postcss é mudança de build, fora do escopo. Se
quiser, trato numa próxima com o build validado antes e depois.

---

# Os dois destravamentos que não chegaram

Você reportou o MCP do shadcn conectado e as duas skills instaladas em
`~/.claude/skills`. **Verifiquei os dois antes de começar a rodada 2 e nenhum
chegou até esta sessão.** Não é teimosia — é escopo diferente, e o registro fica
aqui porque isso vai se repetir.

| O que era esperado | O que eu encontrei |
| --- | --- |
| MCP do shadcn conectado | Não existe nesta sessão. Duas buscas no catálogo de ferramentas, um refresh dos 12 servidores conectados, e o que o seu desktop anuncia: `localMcpServers` = `magic21`, `github`. Só isso. O registro de conectores também não tem shadcn |
| Skills em `~/.claude/skills` | Esta sessão roda na nuvem e lê as skills **sincronizadas da sua conta** — são 11. `frontend-design` está lá; `emil-design-eng` e `web-design-guidelines` não. O `~/.claude/skills` da sua máquina é do Claude Code local e não atravessa para cá. Detalhe que reforça: a listagem da sua home nem mostra uma pasta `.claude` (mostra `.claude-mem`, `.codex`, `.gemini`) |

Para as skills valerem aqui, elas precisam estar nas skills da **conta**, não na
pasta local da máquina.

---

# Como o código chega ao GitHub

O `git push` deste ambiente é **recusado pelo proxy** («not in this session's
authorized repository set»). Os commits vão pelo **conector do GitHub**, e a
conferência é sempre a mesma: comparar o `git hash-object` local com o blob sha
que o GitHub devolve.

Duas armadilhas desse caminho, já vividas:

**1. Binário não passa.** Cada foto vive em `assets/` partida em pedaços base64 e
é remontada em `public/img` por `scripts/decode-assets.mjs`, que roda no
`prebuild`. Um envio em bloco já corrompeu um caractere em cada arquivo e as duas
fotos chegaram quebradas ao site. Por isso o `manifest.json` guarda o `sha256` de
cada imagem e o script **derruba o build** se algum pedaço não bater.

**2. Sequências de escape são normalizadas — e isso derrubou o build.** O
`lib/safe.js` **não compilava no repositório** desde o commit que o criou:

```
SyntaxError: Invalid regular expression: missing /
```

Os separadores U+2028 e U+2029 estavam dentro de literais de regex escritos como
sequência de escape, e o caminho de envio converte a sequência no caractere cru.
Os dois são terminadores de linha em JavaScript, e um literal de regex não pode
atravessar linha. **Consequência: todo build da Cloudflare desde aquele commit
falhou, e o site no ar seguia servindo a versão anterior.** O build local passava
porque a cópia local estava certa — o estrago só existia no repositório.

Correção: em vez de reenviar o mesmo código com escape (tentei duas vezes, e nas
duas o caractere chegou cru), troquei a forma de escrever os dois caracteres.
Agora são constantes montadas com `String.fromCharCode(0x2028)` e `(0x2029)`, e a
substituição usa `split`/`join` no lugar da regex. Não há caractere invisível no
arquivo e não há nada para o caminho de envio corromper.

**Lição, agora passo fixo:** conferir o blob sha de **todo** arquivo enviado, não
só dos que acabei de mexer. Foi exatamente essa conferência que achou o problema.

## Uma coisa que eu tentei e não consegui entregar

O filtro de acentos do `CatalogBrowser` guarda dois caracteres combinantes
**crus** dentro de um literal de regex — o intervalo U+0300–U+036F. São
invisíveis em qualquer editor, e some um deles numa cópia desatenta e a busca do
acervo para de achar "Bênção".

Tentei trocá-los por escapes três vezes; o caminho de envio desfez as três.
Desisti em vez de contornar com truque de código, e **deixei o arquivo
funcionando exatamente como estava** — verificado com
`norm('A Bênção Ação') === 'a bencao acao'`.

Fica anotado para fazer na sua máquina, onde o envio não passa por esse caminho:
trocar os dois caracteres crus por `/[̀-ͯ]/g` em
`components/CatalogBrowser.jsx`. Uma linha, mesmo intervalo, mesmo comportamento.

---

# Situação final

| # | Etapa | Estado |
| --- | --- | --- |
| 1 | button / dialog / card | **Feito.** Fonte canônico do `shadcn-ui/ui`, sem rodar o `init`, sem segundo sistema de cor |
| 2 | UI com frontend-design + magic21 | **Feito.** A skill mudou o desenho do card (geração do magic21 segue travada pelo plano grátis) |
| 3 | Animação | **Feito à mão.** `emil-design-eng` não existe nesta conta; valores registrados acima |
| 4 | Polimento | **Feito à mão.** `web-design-guidelines` não existe nesta conta; contraste, alvo de toque e teclado medidos, 6 correções aplicadas |
| 5 | Semgrep | **Feito.** Antes/depois nas duas rodadas, cada achado explicado |

Provas: `next build` passando com as **245 páginas** (a página de demonstração
usada para os screenshots foi apagada antes do commit), screenshot dos
componentes e do dialog aberto, os sete testes de teclado, os rácios de contraste
e os alvos medidos no navegador, e as 10 páginas com JSON-LD respondendo 200 com
todos os blocos parseando.
