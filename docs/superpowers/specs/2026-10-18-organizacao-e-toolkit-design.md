# Organização do projeto e adoção do Vibe Coding Toolkit — design

Data: 18/10/2026. Branch: `organizacao` (saiu de `acesso-liberado-robo` 6041ee2).
Toolkit: https://github.com/soumatheusgomes/vibe-coding-toolkit, revisão `de66fe3` (17/10/2026), prompt 12.

## 1. Intenção

O Paulo quer abrir o Trilha Viva em qualquer PC, com o Claude Code, o Codex ou o Claude no Cowork, e o agente já saber o que é o projeto e tudo o que foi feito: código do site, gestão, posts de Instagram e anúncios. Hoje isso está espalhado em quatro lugares, com cópias desatualizadas e um `tasks/todo.md` de 887 linhas que mistura plano, diário e medições.

O Paulo não programa. Os documentos precisam ser curtos, em português simples e com um dono claro para cada assunto.

## 2. Objetivos, não objetivos e antiobjetivos

**Objetivos**
- Um lugar oficial para cada coisa: código e documentação técnica no GitHub; gestão, publicidade e histórico geral no Drive.
- Um `HISTORICO.md` único, que tanto o Cowork quanto o Claude Code conseguem ler e escrever.
- Documentos de entrada curtos (AGENTS.md, CLAUDE.md, PRODUCT.md, README.md e `docs/`) que reflitam o site atual.
- O toolkit avaliado item por item, com o que se aplica instalado e verificado.
- Build local funcionando de novo em `C:\dev\trilha-viva`.

**Não objetivos**
- Mudar o produto, a stack, o banco, o deploy ou o visual do site.
- Mover os arquivos de gestão do Drive para o GitHub.
- Atualizar a máquina inteira ou instalar ferramentas globais novas.
- Cuidar do projeto separado `G:\Meu Drive\Multitracks\trilha-viva-instagram-ops`: fica anotado no histórico como pendência própria.

**Antiobjetivos (seria fracasso mesmo funcionando)**
- Criar um segundo lugar "oficial" que compete com outro.
- Documentação longa que ninguém lê, ou que descreve como pronto algo que não existe.
- Qualquer mudança que vá ao ar sem o OK do Paulo (todo commit em `main` publica o site).
- Apagar arquivo do Drive ou do PC sem confirmar o que é.

## 3. Estado encontrado (fatos, 18/10)

| Lugar | O que tem | Situação |
|---|---|---|
| GitHub `Placerda28/trilha-viva` | Código, `tasks/*.md`, AGENTS.md, CLAUDE.md, README.md | Oficial. Todas as branches locais estão lá, menos `whatsapp-acesso-meta` (1 commit só neste PC). |
| `C:\dev\trilha-viva` | Clone de trabalho | Limpo. 210 testes passam. **O build falha**: o `node_modules` tem `noto-sans-v27-latin-regular.ttf.bin` no lugar de `.ttf` (4 arquivos `.bin` estranhos), e o prerender de `/apple-icon` quebra. |
| `~/tv-build` | Worktree usado para publicar (o CLAUDE.md manda) | Motivo original (caminho "C:dev" com caractere especial) não existe mais: o projeto mudou para `C:\dev`. |
| `~/C:dev` | Só `tv-sim-dev.log` | Resto de pasta antiga. |
| Drive `01 - DEV (ARQUIVOS DO SITE)\trilha-viva` | Cópia antiga do site (não é git), com `PRODUCT.md` (15/09) que o GitHub não tem, e pastas de skills de vários agentes (`.claude`, `.agents`, `.codex`…) | Desatualizada (todo.md 46K contra 75K). |
| Drive `01 - DEV (ARQUIVOS DO SITE)\Claude outputs\notas` | Resumos de sessões antigas (`contexto-compactado-*.md`) | Histórico solto. |
| Drive `02 - PUBLICIDADE` | LEIA-ME com regras e status de cada post; uma pasta por post | Bem organizado. |
| README.md do repo | Descreve o site antigo (Stripe + link do Drive) | Desatualizado: hoje é Mercado Pago, B2, gestão, robô de WhatsApp. |
| CLAUDE.md do repo | Regras boas, mas manda evitar "C:dev" e publicar por `~/tv-build` | Parcialmente desatualizado. |

Ferramentas já ativas na máquina: Superpowers, Ponytail, Caveman, RTK (hook `rtk hook claude`), Graphify 0.9.92, Context7 (Claude e Codex), Codex CLI 0.155, claude-mem, impeccable. Não há lint nem checagem de tipos no projeto (JavaScript puro).

## 4. Organização final

### 4.1 GitHub = código e documentação técnica
`C:\dev\trilha-viva` é a única cópia de trabalho. O GitHub é o backup, então não existe "pasta de backup" separada.

### 4.2 Drive = gestão, publicidade e histórico geral
Na raiz de `G:\Meu Drive\01 - OFICINA\02. TRILHA VIVA`:
- `LEIA-ME.md`: o mapa para o Cowork. Diz o que é o Trilha Viva, o que fica em cada pasta, onde está o código (GitHub e `C:\dev\trilha-viva`) e a regra de anotar no histórico.
- `HISTORICO.md`: uma linha por entrega, a mais nova em cima, agrupada por mês. Formato: `- 2026-10-18 · SITE · O que foi feito · onde ver (commit, pasta do post, tarefa)`. As áreas são `SITE`, `PALCO`, `GESTAO`, `INSTAGRAM`, `ANUNCIO`, `ACERVO` e `OUTRO`. O detalhe fica no lugar de origem, e o histórico só aponta.
- O histórico já nasce preenchido com o passado, montado a partir de `git log`, `tasks/*.md`, do LEIA-ME da publicidade e das notas antigas. Cada item reconstruído leva a origem.

### 4.3 Regra de anotação (as duas pontas)
- **Claude Code / Codex**: ao terminar uma entrega (commit que muda comportamento, deploy, migração), acrescenta a linha no `HISTORICO.md` do Drive por `G:\`. Isso entra no AGENTS.md.
- **Cowork** (abre a pasta `02. TRILHA VIVA` do Drive, confirmado pelo Paulo): ao publicar ou agendar post, criar campanha ou mexer na gestão, acrescenta a linha. Isso entra no `LEIA-ME.md` do Drive, que o Cowork lê.
- Sem `G:\` (outro PC sem Drive), o agente anota no fim da resposta e avisa que a linha ficou pendente.

### 4.4 Cópias antigas
- Drive `01 - DEV (ARQUIVOS DO SITE)\trilha-viva`: o `PRODUCT.md` vai para o repo (revisado). A pasta inteira vai para a pasta de arquivo morto que já existe, `01 - DEV (ARQUIVOS DO SITE)\arquivo\trilha-viva-copia-2026-10-02`, movida e não apagada. O OK do Paulo foi dado em 18/10. Usar a `arquivo\` existente em vez de criar `_ARQUIVO` é escolha minha, para não haver dois arquivos mortos.
- `~/C:dev`: o log vai para `~/tv-backups`, e a pasta vazia é removida.
- Publicação: o caminho principal é o build automático da Cloudflare a cada commit em `main`. O deploy manual (`npx opennextjs-cloudflare deploy`, com `.env.local`) fica documentado como reserva. `~/tv-build` continua existindo nesta entrega; aqui só se prova o `opennextjs-cloudflare build` em `C:\dev`, sem deploy. A remoção de `~/tv-build` fica para depois, com OK do Paulo.
- `whatsapp-acesso-meta`: o commit só local é preservado. O push depende do OK do Paulo.

### 4.4b Palco (novo produto em desenvolvimento)
Fatos: o repo fica em `C:\dev\trilha-viva-palco` (GitHub `Placerda28/trilha-viva-palco`), com `README.md` e `todo.md` (28,8K), sem AGENTS.md nem CLAUDE.md. A branch `partes-e-rampa` tem 1 commit que só existe neste PC. No Drive, o Palco fica em `01 - DEV (ARQUIVOS DO SITE)\Palco`.

Decisão do Paulo (18/10): o Palco entra na organização.
- O `HISTORICO.md` ganha a área `PALCO`, e o passado do Palco é reconstruído a partir do `git log` e do `todo.md` dele.
- O `LEIA-ME.md` do Drive e o mapa do `AGENTS.md` do site apontam para o Palco.
- O push de `partes-e-rampa` também depende do OK do Paulo.
- **Adoção completa do toolkit no Palco também entra (decisão do Paulo, 18/10).** O trabalho vai numa branch `organizacao` no repo do Palco, que sai de `partes-e-rampa` porque é a mais nova.

Linha de base do Palco (18/10): `npm run lint`, `typecheck`, `test` (130 testes) e `build` passam. O Playwright (`test:e2e`) roda no CI do GitHub, porque o WebKit só tem Web Audio no Linux.

Stack: Vite 8, React 19, TypeScript 6, Worker Hono em Cloudflare com D1, Supabase (só o login do site), Tailwind 4, ESLint 10 flat com typescript-eslint, Vitest 5, Playwright, ferramentas Python em `tools/`, CI em `.github/workflows/testes.yml`. Arquivos acima de 350 linhas: `app/src/audio/motores.ts` (914), `app/src/palco/TelaPalco.tsx` (796), `worker/src/rotas.ts` (475).

Documentos do Palco (as mesmas 9 destinações):
- `AGENTS.md` e `CLAUDE.md` são novos e seguem o mesmo padrão do site.
- `PRODUCT.md` é novo, montado a partir do README e de `docs/checklist-funcionalidades.md`.
- `README.md`, o guia para quem não programa, fica como está, com um mapa acrescentado.
- `docs/architecture.md` é novo, montado a partir de `docs/decisao-motor.md`, `grade-e-partes.md` e `workers-builds.md`, que continuam e passam a ser linkados.
- `docs/design.md` mapeia para o `docs/identidade-visual.md` que já existe. Esse arquivo fica canônico, então o design.md só aponta para ele ou é um link curto.
- `docs/onboarding.md`, `docs/quality.md` e `docs/setup.md` são novos.
- `tasks/todo.md` (28,8K) é enxugado como o do site, e o resto vai para `tasks/arquivo/`.

Matriz do Palco (o que muda em relação ao site):

| Componente | Ação no Palco |
|---|---|
| Superpowers, Ponytail, Caveman, RTK, Context7, memória, hooks | iguais ao site (reusar) |
| Graphify | `.graphifyignore` com exclusões para `saida`, `dist`, `.wrangler`, `tools/.modelos-whisper`, `tests/fixtures`, `*.log` e `.env`, extração `--code-only` e `graphify-out/` no `.gitignore` |
| Vercel skills | `vercel-react-best-practices`, `vercel-composition-patterns` e `find-skills`, no projeto e com `--copy`. As de Next e de deploy na Vercel ficam fora |
| next-dev-loop / next-bundle-optimizer | N/A, porque o Palco é Vite e não Next |
| supabase-postgres-best-practices | N/A, porque o banco é D1. A Supabase só faz o login |
| gh-fix-ci | **instalar** (Codex), porque o Palco tem GitHub Actions. Uso só em leitura, sem mexer no CI sem pedido |
| differential-review + prompt 13 | instalar e registrar em `docs/quality.md`, porque há login, permissão de acesso e chaves B2 |
| shadcn | N/A, porque o Palco não usa shadcn (componentes próprios e Tailwind 4) |
| Sentry | N/A |
| ESLint | já existe e passa. Medir o perfil tipado (`no-floating-promises`, `no-misused-promises`) e os módulos de quality gate do toolkit, com contagem por regra. Regra nova com violações entra como `warn` num comando de medição separado, sem tocar no `npm run lint` que o CI usa. Regra nova sem violação entra como `error` |
| Arquivos > 350 linhas | contagem e plano registrados em `docs/quality.md`, sem refatorar agora (o motor de áudio é sensível) |
| Avaliação do harness | a mesma rodada descartável vale para os dois |

### 4.5 Documentos do repositório (as 9 destinações do toolkit)

| Destino | Origem | Conteúdo |
|---|---|---|
| `AGENTS.md` | atual + template | Divisão Claude/Codex segue a preferência mais nova do Paulo (16/10): o Codex é assistente que o Claude comanda (`--model gpt-6-astra`); deploy, push, merge e segredos ficam com o Claude. Aberto sozinho, o Codex segue as mesmas regras e os mesmos pontos de parada. A regra antiga da branch `gestao` sai (já mesclada). Curto: o que é, comandos, regras de trabalho, pontos de parada, divisão Claude/Codex, mapa dos docs e do Drive, regra do histórico, política de subagentes. Fonte comum para Claude e Codex. |
| `CLAUDE.md` | atual | Importa `@AGENTS.md` e guarda só o que é do Claude. Os "fatos que não podem ser esquecidos" vão para `docs/architecture.md`, e o AGENTS aponta para eles. |
| `PRODUCT.md` | cópia do Drive | Revisado: público, oferta, posicionamento. Tira o que mudou (preço e contagem conferidos no código). |
| `README.md` | reescrito | Para humano: o que é, como rodar, testar e publicar, e onde está cada coisa. |
| `docs/architecture.md` | CLAUDE.md + código | Stack, Workers e o limite de 10 ms, sessão, pagamento, entrega B2, D1, robô `workers/recuperacao-carrinho`, gestão, fatos críticos. |
| `docs/design.md` | CLAUDE.md + `tailwind.config.js` | Paleta, fontes, regras visuais, celular. |
| `docs/onboarding.md` | novo | PC novo do zero: clonar, `npm ci`, `.env.local`/`.dev.vars` (de onde vêm, sem segredo), Drive, ferramentas. |
| `docs/quality.md` | novo | Comandos de verificação, testes, lint, revisão de segurança (prompt 13 do toolkit: fonte e como chamar), revisão de diff. |
| `docs/setup.md` | novo | Revisão do toolkit, data, decisões, matriz de cobertura final, como manter e repetir. |

### 4.6 `tasks/`
- `tasks/todo.md` passa a ter só o que está **em andamento ou esperando o Paulo**, com no máximo 1 tela por frente.
- O que já foi feito vira linhas no `HISTORICO.md`. O texto longo (medições, diagnósticos, provas) vai para `tasks/arquivo/AAAA-MM-DD-tema.md`, sem perder nada.
- Os arquivos de especificação existentes (`tasks/whatsapp.md` etc.) também vão para `tasks/arquivo/` quando a frente estiver concluída.

## 5. Matriz de cobertura do toolkit

Legenda: **reusar** = já funciona; **instalar/integrar** = entra nesta entrega; **N/A** = não se aplica, com motivo.

| Componente | Situação | Ação | Escopo | Como provar |
|---|---|---|---|---|
| Superpowers | ativo | reusar | global | skill carrega nesta sessão |
| Ponytail (full) | ativo | reusar + citar no AGENTS | global | hook de sessão |
| Caveman | ativo | reusar. Conversa curta em pt-BR; código, docs e commits normais | global | hook de sessão |
| RTK | hook ativo | reusar, sem wrapper duplicado | global | `rtk --version` e saída condensada |
| Context7 | MCP no Claude e no Codex | reusar, sem servidor duplicado | global | uma consulta real (Next 15) |
| Graphify | 0.9.92 global | integrar: `.graphifyignore` (com `.open-next`, `.wrangler`, `.dev.vars`, `assets/*.b64.*`, `public/img`) + extração `--code-only`; `graphify-out/` no `.gitignore` | projeto | `graphify query` responde sobre o código |
| Subagentes / seleção de modelo | — | integrar: texto curto no AGENTS (modelo mais leve que dá conta; um escritor por arquivo; revisor só lê) | projeto | texto presente |
| Memória em camadas | MEMORY.md do Claude, claude-mem | reusar. Corrigir as memórias desatualizadas (C:dev, tv-build). Registrar onde ficam em `docs/setup.md` | global | memória lida numa sessão nova |
| Handoff entre sessões | `tasks/todo.md` | reusar o `todo.md` enxuto como handoff. Template do toolkit só se faltar algo | projeto | — |
| Vercel skills | nenhuma no projeto | instalar: `vercel-react-best-practices`, `vercel-composition-patterns`, `find-skills`, com `--copy` (Windows), Claude + Codex. Fora: `web-design-guidelines` (já existe global, duplicaria), `deploy-to-vercel`, `vercel-cli-with-tokens`, `vercel-optimize` (o deploy é Cloudflare), `vercel-react-view-transitions` (ninguém pediu), `writing-guidelines` (opcional, fora por ora) | projeto | skill aparece na lista do cliente |
| next-dev-loop | — | N/A: exige Next 16.3+ | — | — |
| next-bundle-optimizer | — | N/A por ora: exige `next analyze`, e o build é OpenNext. Reavaliar ao subir o Next | — | — |
| supabase-postgres-best-practices | — | N/A: o banco é D1 (SQLite). A Supabase só confere senha | — | — |
| gh-fix-ci | — | N/A: não há GitHub Actions | — | — |
| Revisão de segurança (prompt 13) + differential-review | — | integrar: fonte e invocação registradas em `docs/quality.md`. `differential-review` instalado no projeto (Claude + Codex), já que o site tem pagamento, login e webhooks | projeto | skill listada; o prompt tem caminho |
| shadcn | `radix-ui` instalado, sem `components.json` | N/A: o shadcn CLI não roda aqui (ver histórico em `tasks/todo.md`, "O `shadcn init` não roda aqui") | — | — |
| Sentry MCP | — | N/A: o projeto não usa Sentry | — | — |
| agent-browser / Chrome DevTools MCP | Chrome do Claude disponível | reusar o navegador que já existe para a checagem local. Nada novo instalado | — | site local abre e a home renderiza |
| Skills da Anthropic, plugins oficiais, skill-creator | globais | reusar. Nada no projeto | global | — |
| Obsidian / MCP de memória | — | N/A: o Drive e o HISTORICO resolvem; não há necessidade concreta | — | — |
| Hooks de cliente | `rtk hook` | reusar. Nenhum hook novo, nenhum hook de Git | — | — |
| ESLint (quality gates) | ausente | integrar em **modo medição**: `eslint` + `eslint-config-next` (perfil JS), regras do toolkit que valem sem TypeScript/Drizzle/Pino, tudo em `warn`, script `npm run lint`. `next.config.mjs` ganha `eslint.ignoreDuringBuilds: true` para o deploy não mudar. Contagem por regra registrada em `docs/quality.md` | projeto | `npm run lint` roda e conta |
| Limite de 350 linhas | 7 arquivos acima (maior: `WhatsappConversas.jsx`, 941) | registrar contagem e plano em `docs/quality.md`. Sem refatorar nesta entrega (risco no Worker de 10 ms; vira proposta própria) | — | contagem registrada |
| `templates/next/` (TS, Zod, Pino, Drizzle) | — | N/A: o projeto é JS, D1 sem ORM | — | — |
| Avaliação do harness (doc 07, prompt 14) | — | rodar uma vez em cópia descartável fora do projeto | temporário | resultado em `docs/setup.md` |

## 6. Qualidade e verificação

- Corrigir o build: `npm ci` em `C:\dev\trilha-viva` (o lockfile não muda). Provar com `npm run build` e `npx opennextjs-cloudflare build` (só o build, **sem deploy**).
- Linha de base: 210 testes passando; build falhando (`/apple-icon`, ENOENT na fonte do `@vercel/og`); 1 aviso do Tailwind (`duration-[600ms]` ambíguo).
- Depois de cada etapa: `npm test` e `npm run build`.
- Site local: `npm run dev` numa porta livre, home e `/entrar` abrem sem erro no console.
- Revisão independente do diff final (só leitura) antes de entregar.

## 7. Ordem das entregas

1. **Base**: `npm ci`, build provado; backup dos arquivos de instrução atuais em `~/tv-backups/2026-10-18-docs/`.
2. **Docs do repo**: AGENTS, CLAUDE, PRODUCT, README e `docs/*`; `todo.md` enxuto + `tasks/arquivo/`.
3. **Drive**: `LEIA-ME.md`, `HISTORICO.md` preenchido com o passado, cópia antiga para `_ARQUIVO`.
4. **Ferramentas**: `.graphifyignore` e grafo, skills no projeto, ESLint em medição.
5. **Verificação**: testes, build, site local, consulta Context7, consulta Graphify, avaliação do harness, revisão independente; `docs/setup.md` com a matriz final.
6. **Memória**: corrigir as memórias desatualizadas do Claude.

Commits na branch `organizacao`. Nada de push, merge em `main` ou deploy sem o OK do Paulo.

## 8. Pontos de parada com o Paulo
- Push da branch `organizacao` (site e Palco), de `whatsapp-acesso-meta` e de `partes-e-rampa` (Palco).
- Merge em `main`: publica o site. Mesmo uma mudança só de docs dispara deploy. A branch saiu de `acesso-liberado-robo`, então esta precisa entrar antes (ou junto).
- Remover `~/tv-build`.

## 9. Escolhas minhas (o Paulo pode mudar)
- Branch saindo de `acesso-liberado-robo`, para pegar o `todo.md` mais novo.
- ESLint em modo medição, fora do build.
- Prompt 13 referenciado em `docs/quality.md` em vez de copiado.
- Sem refatorar arquivos grandes agora.
- Conjunto reduzido de skills da Vercel.
- Formato da linha do `HISTORICO.md` e as áreas.
- Arquivo morto na pasta `arquivo\` que já existe no Drive.
- Divisão Claude/Codex conforme a memória de 16/10.
- `~/tv-build` fica até o Paulo autorizar a remoção.
