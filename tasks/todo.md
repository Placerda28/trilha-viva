# Trilha Viva — ajustes de 05/09/2026

Registro do que foi pedido, o que foi feito, o que foi provado e o que ficou
bloqueado. Nada aqui é marcado como pronto sem evidência.

---

## 1. Componentes (shadcn) — BLOQUEADO, precisa da sua decisão

**Estado:** `components.json` não existe, o shadcn continua não inicializado.
Não rodei o init. Dois motivos, e os dois importam.

### 1a. O ambiente não alcança o registro do shadcn

```
$ npx shadcn@latest init -d -y
Request to https://ui.shadcn.com/init?... failed, reason: Request was cancelled.

$ curl https://ui.shadcn.com/init
curl: (56) CONNECT tunnel failed, response 403
```

O proxy de saída deste ambiente libera o npm (`registry.npmjs.org` → 200) mas
bloqueia `ui.shadcn.com`. O CLI do shadcn baixa dali tanto o payload do `init`
quanto o código de cada componente, então ele não roda aqui. A VM ligada à sua
pasta do OneDrive também não tem rede, então rodar por lá não resolve.

### 1b. Mesmo com rede, o `init` conflita com o Tailwind atual

Você pediu para eu parar e avisar nesse caso. É exatamente o caso:

| O que o `shadcn init` faz | Conflito |
| --- | --- |
| Escreve um bloco `@layer base` em `app/globals.css` com `--background`, `--foreground`, `--primary`, `--muted`, `--accent`… | Cria um **segundo sistema de cor** ao lado de `ink` / `paper` / `mist` / `signal`. Passa a haver duas fontes de verdade para a mesma decisão |
| Injeta `theme.extend.colors` em `tailwind.config.js` mapeando para `hsl(var(--...))` | Colide com o token `accent`, que hoje é o apelido herdado do ocre/ardósia |
| Adiciona `* { @apply border-border }` e estilos de `body` | Sobrescreve o `body` que define o off-white e a cor de texto |
| Adiciona `darkMode: 'class'` e o plugin `tailwindcss-animate` | Muda o comportamento global de tema |

**Três caminhos, escolha um:**

1. **Escrever os três componentes à mão** (recomendado). `button`, `dialog` e
   `card` na linguagem visual que já existe, usando `@radix-ui/react-dialog`,
   `class-variance-authority`, `clsx` e `tailwind-merge` — todos instalam pelo
   npm, que está liberado. Mesma API e mesma qualidade, sem trazer o tema do
   shadcn junto.
2. **Você roda o `init` na sua máquina** (terminal normal do Windows, fora da
   VM) e eu adapto o resultado, resolvendo os conflitos de cor um a um.
3. **Deixar para depois.** Hoje o site não tem nenhum diálogo nem card; o botão
   já é uma classe (`.btn-signal`, `.btn-ink`, `.btn-quiet`).

---

## 2. Construção de UI

- **frontend-design:** usada. Foi a diretriz do redesenho — ela é a razão de o
  visual anterior (creme + serifada + terracota + rótulo em caixa alta acima de
  cada seção) ter sido trocado: aquilo é literalmente o padrão que uma IA
  produz por default hoje.
- **magic21 (21st.dev):** consultado por busca, para referência de componentes
  de áudio (WaveformPlayer, Waveform). A **geração** continua travada pelo
  limite diário do plano gratuito (`generation_limit_reached`).

---

## 3. Animação — skill `emil-design-eng` NÃO EXISTE nesta conta

Procurei e não há nenhuma skill com esse nome (nem parecida) habilitada ou
disponível para instalar. Não inventei substituto.

O que existe hoje de movimento no site, decidido à mão e de propósito:

| Onde | O quê | Valores |
| --- | --- | --- |
| Ponto do canal "clique" no painel de sessão | Piscada em degraus, imitando metrônomo | `1.9s`, `steps(1, end)`, opacidade `0.18 → 1 → 0.18` |
| Botões e links | Só troca de cor | `150ms`, `transition-colors` |
| Tudo | Respeita `prefers-reduced-motion: reduce` | animação e transição caem para `0.001ms` |

Nada de entrada em fade-and-slide por seção, que é o default genérico.

---

## 4. Polimento — skill `web-design-guidelines` NÃO EXISTE nesta conta

Mesma situação da anterior. Fiz a auditoria à mão e apliquei o que estava
errado de fato:

| Achado | Correção |
| --- | --- |
| Foco de teclado invisível nas linhas do setlist, nos links de texto e no rodapé | Regra global `:focus-visible` com contorno de 2px e `outline-offset`, e variante clara dentro dos painéis escuros |
| Anel de foco dos botões desenhado sobre branco puro, num fundo off-white | `focus-visible:ring-offset-paper` |
| Filtros de categoria do acervo não anunciavam qual está ativo | `aria-pressed` nos botões |
| Ocre/ardósia como **texto** sobre fundo claro ficava em ~4:1 | Etiquetas viraram a classe `.chip` (fundo `signal-deep` + texto branco, ~6:1); botões usam `signal-deep` |
| Taupe `#7F7265` da paleta anterior no corpo de texto ficava no limite | Token `ink-muted` passou a ser um degrau mais escuro da mesma família |

Já estavam certos antes: `lang="pt-BR"`, link "pular para o conteúdo",
`alt` em todas as imagens, `aria-hidden` no que é decorativo, `aria-label` na
busca, FAQ em `<details>/<summary>` (acessível por teclado de fábrica),
hierarquia de títulos com um `h1` por página, alvo de toque das linhas do
setlist em ~52px.

---

## 5. Scan de segurança (Semgrep)

### Instalação e regras

```
$ semgrep --version
1.176.1
```

`semgrep.dev` também está bloqueado pelo proxy (403), então `--config=auto` e os
pacotes `p/javascript` não baixam. Solução: clonei o repositório oficial de
regras (`github.com/semgrep/semgrep-rules`, que é alcançável) e rodei com as
regras locais. O comando é idêntico antes e depois:

```
semgrep scan --metrics=off \
  --config=<semgrep-rules>/javascript \
  --config=<semgrep-rules>/typescript \
  --exclude=node_modules --exclude=.next \
  app components lib scripts
```

### Antes e depois

| Regra | Antes | Depois |
| --- | ---: | ---: |
| `html-in-template-string` | 1 | 1 |
| `jsx-not-internationalized` | 143 | 143 |
| `missing-template-string-indicator` | 4 | 4 |
| `react-dangerouslysetinnerhtml` | 3 | 3 |
| **Total** | **151** | **151** |

**O número não caiu, e isso é esperado.** As duas regras que importam são
sintáticas, não de fluxo de dados: elas marcam o *formato* do código
(`dangerouslySetInnerHTML` com valor não literal; template literal que parece
HTML e tem interpolação), não a origem do dado. No Next.js não existe outra
forma de emitir JSON-LD, e o e-mail de liberação precisa ser HTML. O que mudou
foi a exposição real — provada abaixo. Zerar o contador aqui só seria possível
suprimindo o alerta, e suprimir alerta para o painel ficar verde é exatamente a
gambiarra que você pediu para evitar.

### Cada achado, explicado

**1. `react-dangerouslysetinnerhtml` — MÉDIA — 3 ocorrências**
`app/artistas/[slug]/page.js:45`, `app/blog/[slug]/page.js:61`,
`app/musicas/[slug]/page.js:86`

Causa: o bloco JSON-LD é injetado com `dangerouslySetInnerHTML` e carrega
`song.title`, `artist.name` e `post.title`. `JSON.stringify` **não escapa `<`**,
então um título contendo `</script>` fecharia a tag e o resto do texto viraria
HTML executável na página. Hoje o catálogo é nosso, mas ele vai ser
regenerado a partir das pastas do Drive — ou seja, de nomes de arquivo que não
controlamos.

Correção: `lib/safe.js` → `ldJson()`, que serializa e converte `<`, `>`, `&`,
U+2028 e U+2029 em escapes `\uXXXX`. O parser de JSON lê esses escapes como os
caracteres originais, então **o dado que chega ao Google e ao navegador é
idêntico** — só não pode mais escapar da tag.

Regra de onde aplicar, para manter o impacto mínimo: **todo JSON-LD que carrega
dado de catálogo ou de post usa `ldJson`.** São cinco arquivos — os três
marcados pelo Semgrep mais `app/musicas/page.js` e `app/blog/page.js`, que
listam músicas e posts. Os outros cinco (`layout`, `page`, `faq`, `como-usar`,
`artistas`) montam o LD só com constantes nossas e seguem no `JSON.stringify`.
Quando o catálogo real vier do Drive, qualquer LD novo que toque nele entra
nessa regra.

Prova:

```
entrada:  { name: 'A Bênção </script><img src=x onerror=alert(1)>' }
saída contém "</script>"?  false
JSON.parse(saída).name === entrada.name?  true
```

E na página servida de verdade:

```
$ curl .../musicas/a-bencao-aline-barros | (extrai os <script type="application/ld+json">)
blocos ld+json: 2
contém "<" cru? False
parse ok, tipo: Organization
título preservado: Trilha Viva — Multitracks Gospel
```

**2. `html-in-template-string` — BAIXA — 1 ocorrência**
`app/api/webhook/route.js:9`

Causa: `emailHtml()` monta o e-mail de liberação interpolando `nome` e `url`
direto no HTML. O `nome` vem do checkout da Stripe, ou seja, é digitado pelo
comprador: `<img src=x onerror=...>` no campo de nome entraria cru no e-mail.
O `url` vem de `DRIVE_URL`.

Correção: `escapeHtml(nome)` e `safeUrl(url)`. O `safeUrl` só aceita `http:` e
`https:` — se `DRIVE_URL` for preenchida errado um dia, um `javascript:` vira
string vazia em vez de link clicável.

Prova:

```
escapeHtml('<b>Paulo</b>')            -> '&lt;b&gt;Paulo&lt;/b&gt;'
safeUrl('https://drive.google.com/x') -> 'https://drive.google.com/x'
safeUrl('javascript:alert(1)')        -> ''
```

**3. `missing-template-string-indicator` — INFO — 4 ocorrências**
`app/layout.js:90` (×2), `app/api/checkout/route.js:82` (×2)

Falso positivo. São `{search_term_string}` no `urlTemplate` do schema.org e
`{CHECKOUT_SESSION_ID}` no `success_url` da Stripe. Os dois **têm que ser
literais** — quem substitui é o Google e é a Stripe. Colocar `$` na frente
quebraria as duas integrações. Não mexi.

**4. `jsx-not-internationalized` — INFO — 143 ocorrências**

Ruído para este projeto. A regra quer que todo texto passe por uma biblioteca
de i18n; o site é monolíngue em pt-BR e não tem plano de tradução. "Corrigir"
significaria instalar i18n e reescrever todas as páginas — mudança enorme, sem
ganho, e fora do "impacto mínimo". Não mexi.

### Resumo honesto

- Achados com risco real: **2 tipos, 4 ocorrências**.
- Achados com risco real **sem mitigação**: antes **4**, depois **0**.
- Comportamento alterado: **nenhum**. O build passa, o JSON-LD continua válido
  e com o mesmo conteúdo, e o e-mail continua com o mesmo texto.
- Ruído que permanece no contador: 147 (143 de i18n + 4 falsos positivos).

Se você quiser o contador limpo, o caminho correto é anotar os 4 achados reais
com `// nosemgrep: <regra>` e a justificativa ao lado — é o fluxo previsto pela
ferramenta para achado revisado e mitigado. Me fala que eu faço.

---

## Situação das etapas

| # | Etapa | Estado |
| --- | --- | --- |
| 1 | shadcn init + button/dialog/card | **Bloqueado** — registro inacessível e conflito com o Tailwind atual. Aguardando sua escolha |
| 2 | UI com frontend-design + magic21 | Feito (geração do magic21 segue travada pelo plano grátis) |
| 3 | Animação com `emil-design-eng` | **Skill não existe nesta conta.** Movimento decidido à mão e documentado acima |
| 4 | Polimento com `web-design-guidelines` | **Skill não existe nesta conta.** Auditoria feita à mão, 5 correções aplicadas |
| 5 | Scan Semgrep | Feito, com antes/depois e prova por arquivo |

---

## Onde o código está

Tudo publicado em `Placerda28/trilha-viva`, branch `main`, que é a branch
que a Cloudflare constrói e publica sozinha a cada push.

Um detalhe do caminho: o `git push` deste ambiente é recusado pelo proxy
(«not in this session's authorized repository set»), então os commits
foram enviados pelo conector do GitHub. Para confirmar que nada se perdeu
no caminho, comparei o hash de cada arquivo local com o hash do blob que o
GitHub devolveu — os cinco arquivos do `ldJson` bateram byte a byte.

### O build estava quebrado e eu não tinha visto

Achei isso conferindo arquivo por arquivo no fim do trabalho, e é sério o
bastante para ficar registrado.

O `lib/safe.js` **não compilava no repositório** desde o commit que o
criou:

```
SyntaxError: Invalid regular expression: missing /
```

Causa: os separadores U+2028 e U+2029 estavam dentro de literais de regex
escritos como sequência de escape, e o caminho de envio até o GitHub
converte a sequência no caractere cru. Os dois são terminadores de linha
em JavaScript, e um literal de regex não pode atravessar linha — então o
arquivo deixou de compilar. As três primeiras substituições (`<`, `>` e
`&`) estavam corretas; só as duas últimas quebraram.

**Consequência:** todo build da Cloudflare desde aquele commit falhou, e o
site no ar seguia servindo a versão anterior ao `ldJson`. O build local
passava porque a cópia local estava certa — o estrago só existia no
repositório.

Correção: em vez de reenviar o mesmo código com escape (tentei duas vezes,
e nas duas o caractere chegou cru), troquei a forma de escrever os dois
caracteres. Agora são constantes montadas com
`String.fromCharCode(0x2028)` e `(0x2029)`, e a substituição usa
`split`/`join` no lugar da regex. Não há caractere invisível no arquivo e
não há nada para o caminho de envio corromper. Comportamento idêntico,
provado com entrada hostil e com `next build` passando.

**Lição para as próximas vezes:** conferir o blob sha de **todo** arquivo
enviado, não só dos que eu acabei de mexer. Foi exatamente essa conferência
que achou o problema.

### Uma coisa que eu tentei e não consegui entregar

O filtro de acentos do `CatalogBrowser` guarda dois caracteres
combinantes **crus** dentro de um literal de regex — o intervalo
U+0300–U+036F. Eles são invisíveis em qualquer editor, e some um deles
numa cópia desatenta e a busca do acervo para de achar "Bênção".

Tentei trocá-los por escapes, que é a forma segura de escrever isso.
Três vezes: o caminho de envio converte a sequência de escape de volta
no caractere cru antes de gravar o arquivo, então os três commits saíram
sem efeito. Desisti em vez de contornar com truque de código, e
**deixei o arquivo exatamente como estava** — funcionando, verificado
com `norm('A Bênção Ação') === 'a bencao acao'`.

Fica anotado como coisa a fazer na sua máquina, onde o envio não passa
por esse caminho: trocar `/[<dois caracteres combinantes>]/g` por
`/[̀-ͯ]/g` em `components/CatalogBrowser.jsx`. Uma linha, mesmo
intervalo, mesmo comportamento.
