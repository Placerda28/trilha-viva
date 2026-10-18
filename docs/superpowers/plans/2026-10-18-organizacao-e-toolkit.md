# Organização do projeto e adoção do Vibe Coding Toolkit — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** cada lugar com um dono (GitHub = código e docs técnicas; Drive = gestão e `HISTORICO.md`). Site e Palco com documentação curta, toolkit adotado item por item e build do site funcionando de novo.

**Arquitetura:** só documentação, configuração de ferramentas e uma reinstalação do `node_modules`. Nenhuma mudança de comportamento do site ou do Palco. Duas branches `organizacao`, uma por repo, com commits locais. Arquivos no Drive editados direto em `G:\`.

**Stack:** site em Next 15 (JS) + OpenNext/Cloudflare + D1 + `node --test`; Palco em Vite 8 + React 19 + TS 6 + Hono/Workers + D1 + ESLint 10 + Vitest 5 + Playwright; Graphify 0.9.92; `npx skills@latest`.

**Spec:** `docs/superpowers/specs/2026-10-18-organizacao-e-toolkit-design.md` (toolkit `de66fe3`, cópia em `C:\Users\PauloHenriqueLacerda\AppData\Local\Temp\claude\C--Users-PauloHenriqueLacerda\d7992814-f92a-4fb1-9fc0-817628f788cd\scratchpad\vct`).

## Restrições globais

- Tudo em português do Brasil, linguagem simples: o Paulo não programa.
- Sem push, sem merge em `main`, sem deploy, sem `wrangler d1 ... --remote`, sem segredo em arquivo versionado.
- Não mexer em: `open-next.config.ts`, `"keep_vars"` do `wrangler.jsonc`, fluxo de download (`app/api/baixar`, `lib/b2.js`, `lib/cota.js`).
- Nada é apagado. O que sai de cena é movido (Drive: `01 - DEV (ARQUIVOS DO SITE)\arquivo\`; PC: `~/tv-backups/`).
- Sem hooks de Git, sem exigência de branch/worktree, sem alterar config global de clientes.
- Docs não descrevem como pronto o que não existe; nada de placeholder (`TODO`, `<preencher>`, `{{`).
- Comandos `npm` precisam de Node no PATH: em cada shell, rodar antes `eval "$(fnm env)"`.
- Site: branch `organizacao`, que já existe e saiu de `acesso-liberado-robo`. Palco: branch `organizacao`, que sai de `partes-e-rampa`.
- Formato da linha do histórico: `- AAAA-MM-DD · ÁREA · o que foi feito · onde ver`. Áreas: `SITE`, `PALCO`, `GESTAO`, `INSTAGRAM`, `ANUNCIO`, `ACERVO`, `OUTRO`.

## Foco de revisão

1. **Histórico reconstruído com fato inventado:** cada linha do passado precisa ter origem real (hash de commit, arquivo de tarefa ou pasta de post). Conferir por amostragem 10 linhas contra a origem (Tarefa 5, passo 4).
2. **Doc que contradiz o código** (preço, contagem de músicas, provedor de pagamento): conferir os números no código antes de escrever (Tarefas 2 e 4, passo "conferir fatos").
3. **Link quebrado entre docs:** todo link relativo dos `.md` novos aponta para arquivo existente (Tarefa 8, passo 2).
4. **Ferramenta nova que muda build ou CI:** `npm run build` do site e `npm run lint`/`test`/`build` do Palco continuam iguais à linha de base (Tarefas 6, 7 e 8).
5. **Segredo vazando para o grafo ou para os docs:** `.graphifyignore` cobre `.env*` e `.dev.vars`; varrer os docs novos atrás de chaves (Tarefa 8, passo 3).

---

### Tarefa 1: Base — backup e build do site de volta

**Arquivos:** nenhum versionado. Backup em `~/tv-backups/2026-10-18-docs/`.

- [ ] **Passo 1:** copiar `AGENTS.md`, `CLAUDE.md`, `README.md` e `tasks/` do site e `README.md` e `tasks/` do Palco para `~/tv-backups/2026-10-18-docs/{site,palco}/`. Conferir com `ls -R`.
- [ ] **Passo 2:** em `C:\dev\trilha-viva`, rodar `npm ci`. Esperado: termina sem erro, e `git status` não mostra mudança no `package-lock.json`.
- [ ] **Passo 3:** `ls node_modules/next/dist/compiled/@vercel/og/` mostra `noto-sans-v27-latin-regular.ttf` (sem `.bin`).
- [ ] **Passo 4:** `npm run build`. Esperado: termina com exit 0 e gera as páginas (antes falhava em `/apple-icon`).
- [ ] **Passo 5:** `npx opennextjs-cloudflare build` (só build). Esperado: exit 0. **Não** rodar `deploy`.
- [ ] **Passo 6:** `npm test`. Esperado: 210 passando.
- [ ] Se `npm ci` não resolver: parar, registrar o erro e seguir com as tarefas independentes (2 a 5 não dependem do build).

### Tarefa 2: Documentos do site

**Arquivos (em `C:\dev\trilha-viva`):**
- Reescrever: `AGENTS.md`, `CLAUDE.md`, `README.md`
- Criar: `PRODUCT.md`, `docs/architecture.md`, `docs/design.md`, `docs/onboarding.md`, `docs/quality.md` (`docs/setup.md` fica para a Tarefa 8)

**Conteúdo obrigatório por arquivo:**
- `AGENTS.md`, com no máximo cerca de 80 linhas:
  - o que é (1 parágrafo);
  - comandos: `npm ci`, `npm run dev`, `npm test`, `npm run build`, `npm run lint` (Tarefa 6), `npm run preview`; deploy = commit em `main` (automático), e a reserva manual `npm run deploy` só com OK;
  - regras de trabalho do template do toolkit (menor mudança, não inventar, autorização para publicar/gastar/destruir);
  - pontos de parada do CLAUDE.md atual;
  - divisão Claude/Codex conforme o spec 4.5 (Codex assistente, `--model gpt-6-astra`; deploy/push/merge/segredos com o Claude);
  - política de subagentes (modelo mais leve que dá conta; um escritor por arquivo; revisor só lê; coordenador confere o diff);
  - regra do histórico (spec 4.3), com o caminho `G:\Meu Drive\01 - OFICINA\02. TRILHA VIVA\HISTORICO.md` e o que fazer sem `G:\`;
  - mapa: PRODUCT, `docs/*`, `tasks/todo.md`, Drive (`LEIA-ME.md`, `02 - PUBLICIDADE`), Palco (`C:\dev\trilha-viva-palco`);
  - skills do projeto (Tarefa 6) e quando usar cada uma.
- `CLAUDE.md`: primeira linha de conteúdo `@AGENTS.md`, mais apenas o que é do Claude: não ativar review gate, preferência de idioma e a nota sobre ferramentas Write/Edit. Remover as instruções de "C:dev" e `~/tv-build`, que agora vivem em `docs/architecture.md` como histórico ("até 18/10 publicava-se de `~/tv-build`").
- `PRODUCT.md`: partir de `G:\...\01 - DEV (ARQUIVOS DO SITE)\trilha-viva\PRODUCT.md`.
- `docs/architecture.md`: todos os "fatos que não podem ser esquecidos" do CLAUDE.md atual (10 ms de CPU, sessão, pagamento MP/Stripe, B2/cota, D1 em UTC, `ldJson`/`escapeHtml`, escapes corrompidos), mais o mapa de pastas (`app/`, `components/`, `lib/`, `lib/gestao/`, `workers/recuperacao-carrinho`, `migrations/`, `assets/` + `scripts/decode-assets.mjs`, `tests/`) e o fluxo de compra → acesso → download.
- `docs/design.md`: paleta exata do CLAUDE.md atual, fontes, "sem sombras", "vermelho nunca em área grande", celular primeiro.
- `docs/onboarding.md`: PC novo, do zero. Instalar Node 24 (fnm), Git e `gh`; `git clone`; `npm ci`; `.env.local` e `.dev.vars` a partir dos `.example` (os valores vêm do painel da Cloudflare ou do Paulo, nunca do repo); Google Drive para desktop (`G:\`); abrir o Claude Code ou o Codex na pasta.
- `docs/quality.md`: comandos de verificação; testes (`node --test`, 3 pastas); lint em medição (preenchido na Tarefa 6); limite de 350 linhas com a lista dos arquivos acima (`wc -l`) e o plano "refatorar só em tarefa própria"; revisão de segurança (fonte `https://raw.githubusercontent.com/soumatheusgomes/vibe-coding-toolkit/de66fe3/docs/prompts/13-security-review.md`, como invocar em modo repositório e em modo diff, relatório privado fora do repo, skill `differential-review`); revisão independente de diffs não triviais.

- [ ] **Passo 1: conferir fatos** no código antes de escrever: preço (`grep -rn "89" app/ lib/ | head`), contagem de músicas exibida, provedor padrão (`PAGAMENTO`). Anotar no texto só o que bate.
- [ ] **Passo 2:** escrever os 8 arquivos (`git mv` não se aplica; o conteúdo antigo está no backup e no git).
- [ ] **Passo 3:** `grep -rnE "TODO|<preencher>|\{\{" AGENTS.md CLAUDE.md PRODUCT.md README.md docs/*.md` não retorna nada.
- [ ] **Passo 4:** commit `docs: AGENTS, CLAUDE, PRODUCT, README e docs/ refletem o site atual`.

### Tarefa 3: `tasks/` do site enxuto

**Arquivos:** `tasks/todo.md` (reescrito); criar `tasks/arquivo/`; mover os `tasks/*.md` de frentes concluídas.

- [ ] **Passo 1:** classificar cada seção `#`/`##` do `todo.md` como "em andamento / esperando o Paulo" ou "concluída". Critério: uma seção com `- [ ]` aberto e ainda relevante fica; o resto é concluído.
- [ ] **Passo 2:** gravar o texto integral das seções concluídas em `tasks/arquivo/AAAA-MM-DD-tema.md` (uma por frente, com a data da frente), sem editar o conteúdo.
- [ ] **Passo 3:** `todo.md` novo: um bloco curto por frente aberta (o que falta, quem decide, link para o arquivo detalhado). Hoje devem ficar pelo menos: `acesso_liberado` aguardando a Meta e o merge de `acesso-liberado-robo`.
- [ ] **Passo 4:** mover para `tasks/arquivo/` os `tasks/*.md` de frentes concluídas (`git mv`). Ficam os que o `todo.md` novo ainda cita.
- [ ] **Passo 5: prova de que nada se perdeu.** O total de linhas não vazias de (`todo.md` novo + `tasks/arquivo/*`) é maior ou igual ao do `todo.md` antigo, e `git grep -c` de 5 frases-chave antigas acha cada uma.
- [ ] **Passo 6:** commit `tasks: todo.md só com o que está aberto; concluído vai para tasks/arquivo`.

### Tarefa 4: Palco — branch, documentos e `tasks/`

**Arquivos (em `C:\dev\trilha-viva-palco`):** criar `AGENTS.md`, `CLAUDE.md`, `PRODUCT.md`, `docs/architecture.md`, `docs/design.md`, `docs/onboarding.md`, `docs/quality.md`, `tasks/arquivo/`; modificar `README.md` (só um mapa no topo) e `tasks/todo.md`.

- [ ] **Passo 1:** `git checkout -b organizacao partes-e-rampa`.
- [ ] **Passo 2: conferir fatos** em `README.md`, `docs/checklist-funcionalidades.md`, `docs/decisao-motor.md`, `wrangler.jsonc`, `package.json` e `tasks/todo.md` (etapa atual, URL de teste, quem libera acesso).
- [ ] **Passo 3:** escrever os docs com a mesma estrutura da Tarefa 2:
  - `AGENTS.md`: comandos `npm run lint|typecheck|test|build|test:e2e` (e2e roda no CI), `python -m unittest discover -s tools`, `python tools/preparar_lote.py`, `npm run deploy` só com OK; regras; regra do histórico (área `PALCO`); mapa; a relação com o site (mesma conta, B2 só `palco/`).
  - `docs/design.md`: um parágrafo apontando para `docs/identidade-visual.md`, que continua canônico.
  - `docs/architecture.md`: resume e linka `decisao-motor.md`, `grade-e-partes.md`, `workers-builds.md`, `sem-internet.md`.
  - `docs/quality.md`: comandos, CI (`testes.yml`), testes pendentes (link para `docs/testes-pendentes.md`), lint em medição (Tarefa 7), 350 linhas (`motores.ts` 914, `TelaPalco.tsx` 796, `rotas.ts` 475, conferir com `wc -l`), revisão de segurança igual à do site.
- [ ] **Passo 4:** enxugar `tasks/todo.md` com o mesmo método e as mesmas provas da Tarefa 3, passos 1 a 5.
- [ ] **Passo 5:** `npm run lint && npm run typecheck && npm test && npm run build` iguais à linha de base (130 testes).
- [ ] **Passo 6:** commits `docs: AGENTS, CLAUDE, PRODUCT e docs/ do Palco` e `tasks: todo.md só com o que está aberto`.

### Tarefa 5: Drive — LEIA-ME, HISTORICO e cópias antigas

**Arquivos (em `G:\Meu Drive\01 - OFICINA\02. TRILHA VIVA`):** criar `LEIA-ME.md` e `HISTORICO.md`; mover `01 - DEV (ARQUIVOS DO SITE)\trilha-viva` → `01 - DEV (ARQUIVOS DO SITE)\arquivo\trilha-viva-copia-2026-10-02`. PC: mover `~/C:dev/tv-sim-dev.log` → `~/tv-backups/` e remover a pasta `~/C:dev` vazia.

- [ ] **Passo 1:** `LEIA-ME.md`, com no máximo cerca de 60 linhas:
  - o que é o Trilha Viva (site + Palco);
  - o que cada pasta guarda (`01 - DEV`, `02 - PUBLICIDADE`, `03 - MULTITRACK - VS`, `04 - PADS`, `Claude outputs`, `Download do Telegram`);
  - onde está o código (GitHub `Placerda28/trilha-viva` e `trilha-viva-palco`; `C:\dev\...`);
  - a regra de anotar no `HISTORICO.md`, com o formato e exemplos de cada área;
  - "regras de postagem: ver `02 - PUBLICIDADE\LEIA-ME - COMO ORGANIZAR A PUBLICIDADE.md`".
- [ ] **Passo 2:** `HISTORICO.md`. Cabeçalho com o formato e as áreas; depois meses em ordem decrescente. Fontes:
  - `git log --format='%ad %h %s' --date=short` dos dois repos (agrupar commits do mesmo dia e tema numa linha, com o hash do último);
  - `tasks/arquivo/*` dos dois repos;
  - a tabela de status do LEIA-ME da publicidade e os nomes das pastas de post (`INSTAGRAM`; post agendado/futuro **não** entra como feito);
  - `02 - CAMPANHAS DE ANUNCIOS` (`ANUNCIO`);
  - `Claude outputs\notas\*.md` e `Download do Telegram\*.md` (`ACERVO`/`OUTRO`).
  A última linha do arquivo registra esta entrega.
- [ ] **Passo 3:** mover a cópia antiga com `mv` e conferir que o destino existe e que a origem sumiu. O mesmo vale para o log de `~/C:dev`.
- [ ] **Passo 4: prova contra invenção.** Sortear 10 linhas do passado e, para cada uma, abrir a origem citada e confirmar. Anotar o resultado no relatório final.

### Tarefa 6: Ferramentas do site — Graphify, skills e ESLint em medição

**Arquivos:** criar `.graphifyignore`, `eslint.config.mjs`, `eslint-rules/{core-rules.cjs,index.cjs,utils.cjs}`, `eslint-rules/verify.mjs`, `skills-lock.json` (gerado pela CLI), `.claude/skills/*` e `.agents/skills/*` (gerados); modificar `.gitignore` (`graphify-out/`), `package.json` (`"lint"`, `"lint:verify"`, devDependencies), `next.config.mjs` (`eslint: { ignoreDuringBuilds: true }`), `docs/quality.md` e `AGENTS.md` (seção de skills).

- [ ] **Passo 1:** `.graphifyignore` a partir de `templates/project/.graphifyignore.example`, mais `.open-next/`, `.wrangler/`, `.dev.vars`, `.env*`, `assets/*.b64.*`, `public/img/`, `.tmp-sql/` e `graphify-out/`. Rodar `GRAPHIFY_NO_AUTO_REFRESH=1 graphify extract . --code-only --no-cluster`. Esperado: `graphify-out/` criado e `graphify query "onde a sessão do cliente é validada?"` cita `lib/sessao.js`.
- [ ] **Passo 2:** skills:
  ```
  npx --yes skills@latest add vercel-labs/agent-skills --skill vercel-react-best-practices vercel-composition-patterns --agent codex claude-code --copy --yes
  npx --yes skills@latest add vercel-labs/skills --skill find-skills --agent codex claude-code --copy --yes
  npx --yes skills@latest add https://github.com/trailofbits/skills/tree/main/plugins/differential-review --skill differential-review --agent codex claude-code --copy --yes
  ```
  Conferir que o `name:` do frontmatter de cada `SKILL.md` instalado bate com o pedido e que nenhum duplica uma skill global (`ls ~/.claude/skills ~/.agents/skills`).
- [ ] **Passo 3:** ESLint. Antes, consultar no Context7 a config flat do `eslint-config-next` para Next 15.5. Instalar `eslint@^9` e `eslint-config-next@15.5` como devDependencies. Copiar as 3 `.cjs` e o `verify.mjs` do toolkit. Ligar: `quality/max-lines` 350; `no-console`; proibição de importar `lib/d1.js` em `components/**` e em arquivos de cliente. Tudo em `warn`.
- [ ] **Passo 4:** `node eslint-rules/verify.mjs eslint-rules/index.cjs`. Esperado: exit 0.
- [ ] **Passo 5:** `npm run lint` roda e conta. Registrar a contagem por regra em `docs/quality.md`. Regra com 0 violações → `error`, e rodar de novo.
- [ ] **Passo 6:** `npm run build` com exit 0 (o lint não roda no build) e `npm test` com 210 passando.
- [ ] **Passo 7:** commit `chore: graphify, skills do projeto e ESLint em modo medição`.

### Tarefa 7: Ferramentas do Palco — Graphify, skills e lint tipado em medição

**Arquivos (Palco):** criar `.graphifyignore`, `eslint-rules/*` (as 3 `.cjs` + `verify.mjs`), `eslint.measure.config.js`, `skills-lock.json` e as pastas de skills; modificar `.gitignore`, `package.json` (`"lint:medir"`, `"lint:verify"`), `docs/quality.md` e `AGENTS.md`.

- [ ] **Passo 1:** `.graphifyignore` com `saida/`, `dist/`, `.wrangler/`, `tools/.modelos-whisper/`, `tools/.tmp/`, `tests/fixtures/`, `test-results/`, `*.log`, `.env*` e `.dev.vars`. Extrair como na Tarefa 6. Esperado: `graphify query "onde o acesso ao Palco é liberado?"` cita `worker/src/`.
- [ ] **Passo 2:** as mesmas skills da Tarefa 6, mais:
  `npx --yes skills@latest add openai/skills --skill gh-fix-ci --agent codex --copy --yes`. Antes, conferir em `docs/tools/19-*.md` do toolkit a origem exata; se for outra, usar a do guia.
- [ ] **Passo 3:** `eslint.measure.config.js` estende `eslint.config.js` e adiciona o perfil tipado (`parserOptions.projectService`) com `@typescript-eslint/no-floating-promises` e `no-misused-promises`, mais `quality/max-lines` 350 e `no-console`, tudo em `warn`. Script `"lint:medir": "eslint -c eslint.measure.config.js ."`. Medir tempo e memória (`Measure-Command` ou `time`).
- [ ] **Passo 4:** `node eslint-rules/verify.mjs eslint-rules/index.cjs` com exit 0. Rodar `npm run lint:medir`, registrar a contagem por regra e o tempo em `docs/quality.md`. Regra com 0 violações vai para o `eslint.config.js` principal como `error`, desde que `npm run lint` continue com exit 0.
- [ ] **Passo 5:** `npm run lint && npm run typecheck && npm test && npm run build`, iguais à linha de base.
- [ ] **Passo 6:** commit `chore: graphify, skills do projeto e lint tipado em medição`.

### Tarefa 8: Verificação, `docs/setup.md` e revisão

**Arquivos:** criar `docs/setup.md` nos dois repos.

- [ ] **Passo 1:** `docs/setup.md` de cada repo:
  - toolkit `de66fe3` e data 18/10/2026;
  - versões (Node, Next/Vite, rtk 1.0.1, graphify 0.9.92, codex 0.155.0);
  - matriz final (spec seção 5, ou 4.4b para o Palco), com o status real: validado / configurado sem execução / reusado / N/A / bloqueado;
  - onde fica a memória (MEMORY.md do Claude, claude-mem, `HISTORICO.md`);
  - política de delegação;
  - como repetir o setup sem duplicar (rodar o prompt 12 de novo; as skills ficam no `skills-lock.json`);
  - decisões a revisar e seus gatilhos (subir Next → `next-bundle-optimizer`/`next-dev-loop`; zerar warnings → promover a `error`).
- [ ] **Passo 2: links.** Script de uso único no scratchpad: para cada `.md` novo, cada `](caminho)` relativo precisa existir. Esperado: zero quebrados.
- [ ] **Passo 3: segredos.** `git diff main --stat` mais `git grep -nE "(sk_live|APP_USR-|re_[A-Za-z0-9]{20}|eyJhbGci|-----BEGIN)"` nos dois repos e nos `.md` do Drive. Esperado: nada.
- [ ] **Passo 4: execução local.** Site: `npm run dev` numa porta livre; `/` e `/entrar` respondem 200 (`curl -s -o /dev/null -w "%{http_code}"`). Palco: `npm run dev`, raiz com 200. Parar os processos criados.
- [ ] **Passo 5: ferramentas vivas.**
  - Context7: consulta real (Next 15, `revalidate`).
  - Graphify: as duas consultas das Tarefas 6 e 7.
  - RTK: um `git status` condensado, sem wrapper duplo.
  - Skills: aparecem na lista do cliente numa sessão nova, se observável; senão, registrar "configurado, sem prova em sessão nova".
- [ ] **Passo 6: avaliação do harness.** Copiar `templates/harness-evaluation/` para o scratchpad. Rodar `node scripts/validate-harness.mjs <cópia>` do toolkit e os casos do prompt 14 que valem. Registrar passou/falhou/não rodou e o modelo em `docs/setup.md`.
- [ ] **Passo 7: revisão independente**, só leitura, num subagente de modelo forte. Escopo: `git diff acesso-liberado-robo..organizacao` (site) e `git diff partes-e-rampa..organizacao` (Palco), mais os 2 `.md` do Drive. Foco: fatos errados, link quebrado, segredo, mudança de build/CI, regra perdida do CLAUDE.md antigo. Corrigir o que for confirmado e rodar de novo as checagens afetadas.
- [ ] **Passo 8:** commit `docs: setup.md com a matriz final do toolkit` nos dois repos. Acrescentar ao `HISTORICO.md` a linha desta entrega.

### Tarefa 9: Memória do Claude

**Arquivos:** `C:\Users\PauloHenriqueLacerda\.claude\projects\C--Users-PauloHenriqueLacerda\memory\`.

- [ ] **Passo 1:** corrigir `trilha-viva-local.md` (o projeto agora fica em `C:\dev\trilha-viva`; `~/C:dev` foi aposentada) e `trilha-viva-deploy.md` (build em `C:\dev` provado; `~/tv-build` é reserva até o OK).
- [ ] **Passo 2:** criar `trilha-viva-organizacao.md`: GitHub = código; Drive = gestão + `HISTORICO.md` + `LEIA-ME.md`; anotar toda entrega. Linkar `[[palco-projeto]]`.
- [ ] **Passo 3:** atualizar o `MEMORY.md` (uma linha por memória).
