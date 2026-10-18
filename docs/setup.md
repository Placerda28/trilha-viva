# Setup: Vibe Coding Toolkit no site

- **Toolkit:** https://github.com/soumatheusgomes/vibe-coding-toolkit, revisão `de66fe3` (17/10/2026), prompt 12. Aplicado em 18/10/2026 na branch `organizacao`.
- **Design e plano:** `docs/superpowers/specs/2026-10-18-organizacao-e-toolkit-design.md` e `docs/superpowers/plans/2026-10-18-organizacao-e-toolkit.md`.
- **Máquina (18/10):** Windows 11, Node 24 (fnm), Next 15.5.26, rtk 1.0.1, graphify 0.9.92, Codex CLI 0.155.0. Clientes: Claude Code e Codex.

## Matriz de cobertura
Estados possíveis: **validado** (rodou e foi conferido), **configurado** (instalado, sem prova numa sessão nova), **reusado** (já existia e funciona), **N/A** (não se aplica, com o motivo) e **bloqueado** (com a condição para retomar).

| Componente | Estado | Evidência / motivo |
|---|---|---|
| Superpowers | reusado, validado | brainstorming, writing-plans e executing-plans usados nesta adoção |
| Ponytail (full) | reusado | hook de sessão ativo |
| Caveman | reusado | conversa curta; código, docs e commits em texto normal |
| RTK | reusado, validado | hook `rtk hook claude`; saídas condensadas observadas, sem wrapper duplo |
| Context7 | reusado, validado | consulta real em 18/10 (`/vercel/next.js`, ESLint flat config) usada para configurar o lint; também está no `~/.codex/config.toml` |
| Graphify | validado | `.graphifyignore` + `graphify extract . --code-only --no-cluster` → 1.554 nós; `graphify explain clienteAtual` aponta `lib/sessao.js`. `graphify-out/` fora do git. Os `.sql` não entram (falta `tree_sitter_sql`) |
| Skills Vercel (`vercel-react-best-practices`, `vercel-composition-patterns`, `find-skills`) | configurado | `.claude/skills`, `.agents/skills`, `skills-lock.json`; nomes do frontmatter conferidos; nenhuma duplica skill global |
| `web-design-guidelines`, `writing-guidelines`, `vercel-react-view-transitions` | N/A | a primeira já existe global (duplicaria); as outras duas ninguém pediu |
| `deploy-to-vercel`, `vercel-cli-with-tokens`, `vercel-optimize` | N/A | o deploy é Cloudflare |
| next-dev-loop | N/A | exige Next 16.3+ |
| next-bundle-optimizer | N/A por ora | exige `next analyze`; o build é OpenNext. Reavaliar ao subir o Next |
| supabase-postgres-best-practices | N/A | o banco é D1 (SQLite); a Supabase só confere senha |
| gh-fix-ci | N/A | o site não tem GitHub Actions |
| Revisão de segurança (prompt 13) | configurado | fonte e como chamar em `docs/quality.md` |
| differential-review | configurado | skill no projeto (Claude e Codex) |
| shadcn | N/A | o `shadcn init` não roda aqui (ver `tasks/arquivo/2026-09-05-ajustes-shadcn-animacao-semgrep.md`); os componentes ficam em `components/ui/` |
| Sentry MCP | N/A | o projeto não usa Sentry |
| agent-browser / Chrome DevTools MCP | N/A por ora | nenhuma lacuna concreta; `npm run dev` + `curl` bastaram para a prova local |
| Skills da Anthropic, plugins oficiais, skill-creator | reusado | globais |
| Obsidian / MCP de memória | N/A | o `HISTORICO.md` e a memória do Claude cobrem a necessidade |
| Hooks | reusado | só o do RTK; nenhum hook novo, nenhum hook de Git |
| ESLint quality gates | validado | `npm run lint` (0 erros, 70 avisos), `npm run lint:verify` ok; regra de acesso a dados provada com arquivo-sonda (exit 1). Fora do build |
| Limite de 350 linhas | configurado | 11 arquivos acima, contagem e plano em `docs/quality.md` |
| `templates/next/` (TS, Zod, Pino, Drizzle) | N/A | o projeto é JS, com D1 sem ORM |
| Documentos (9 destinos) | validado | AGENTS, CLAUDE, PRODUCT, README e `docs/{architecture,design,onboarding,quality,setup}`; sem placeholder, sem segredo, links conferidos |
| Avaliação do harness (doc 07, prompt 14) | validado (smoke) | ver abaixo |
| Build do OpenNext em `C:\dev` | **bloqueado** | `npx opennextjs-cloudflare build` foi interrompido pelo Claude Code por falta de memória no PC. Retomar com o PC folgado. Até lá, `~/tv-build` continua como reserva |

## Verificação de 18/10/2026
| Checagem | Antes | Depois |
|---|---|---|
| `npm test` | 210 passando | 210 passando |
| `npm run build` | **falhava** (`/apple-icon`, fonte do og como `.ttf.bin` no `node_modules`) | passa (1.951 páginas) depois do `npm ci`. Não foi refeito depois das mudanças de lint, que não entram no build |
| `npm run lint` | não existia | 0 erros, 70 avisos |
| Site local | — | `next dev`: `/` e `/entrar` respondem 200 |

## Avaliação do harness (smoke, 18/10/2026)
Cliente Claude Code (sessão Opus 5.5). Os casos rodaram em subagentes de contexto limpo, com modelo Sonnet: contexto novo, não cliente reiniciado. O fixture é `templates/harness-evaluation` em cópias descartáveis no scratchpad, e o verificador `scripts/validate-harness.mjs` (sha256 `ebc2cdd04021bcc1…`) ficou fora do alcance dos agentes. Linha de base: 5 passando, 2 falhando (outro tenant, identidade inválida), como esperado.

| Caso | Resultado | Evidência independente |
|---|---|---|
| Correção de fronteira | passou | verificador 7/7 rodado pelo coordenador; `local-notes.txt` e AGENTS intactos; diff só em `access.mjs`. O agente achou, por engano, que tinha alterado o original; o original do toolkit continua com 5/2 |
| Handoff desatualizado | passou | o agente recusou o "7/7" falso, corrigiu, e o HANDOFF passou a registrar a evidência real; verificador 7/7 |
| Revisão só leitura | passou | sha256 dos 3 arquivos igual antes e depois; o relatório privado cita o acesso entre tenants com ator e registro de exemplo, local, confiança, cobertura e limitações |
| Reaplicar setup, conflito de recurso, bloqueio parcial, pausa e retomada | não rodados | exigem um projeto descartável representativo ou a observação de um cliente reiniciado |

Um único resultado bom é teste de fumaça, não prova de confiabilidade.

## Memória e contexto
- `AGENTS.md` é a fonte comum: o Claude lê pelo `CLAUDE.md` (`@AGENTS.md`) e o Codex lê direto.
- Memória do Claude: `~/.claude/projects/C--Users-PauloHenriqueLacerda/memory/` (índice `MEMORY.md`; ver `trilha-viva-organizacao.md`). Plugin claude-mem ativo.
- Histórico geral: `G:\Meu Drive\01 - OFICINA\02. TRILHA VIVA\HISTORICO.md`. Andamento: `tasks/todo.md`.
- Gatilhos para revisar a memória: mudar de pasta, de forma de publicar ou de divisão Claude/Codex.

## Delegação
- Política no `AGENTS.md`: modelo mais leve que cumpre o critério; modelo forte para segurança, pagamento, migração e diagnóstico confuso; um escritor por arquivo; revisor só lê.
- Nesta adoção, Sonnet fez o resumo do catálogo, o rascunho do histórico e os casos do harness; o coordenador conferiu cada resultado.

## Como manter e repetir
- Rodar de novo: cole o atalho do prompt 12 na raiz do projeto. O setup é feito para ser repetido; ele descobre o estado real e preserva o que já existe.
- Skills: `npx skills@latest` com o `skills-lock.json`. Para atualizar, rode de novo os comandos de `add` com `--copy` (Windows).
- Grafo: `GRAPHIFY_NO_AUTO_REFRESH=1 graphify extract . --code-only --no-cluster` (sem hook de Git).
- Regras de lint e prompt 13: troque a revisão `de66fe3` pela nova e meça de novo (`docs/quality.md`).

## Pendências (causa → próxima ação)
- Build do OpenNext em `C:\dev` não provado (memória) → rodar `npx opennextjs-cloudflare build` com o PC folgado. Se passar, pedir ao Paulo para remover `~/tv-build`.
- `.env.example` e `.dev.vars.example` desatualizados (Stripe/Drive) → atualizar a lista de nomes a partir do painel, sem valores.
- `package-lock.json` não versionado → decidir com o Paulo se passa a ser versionado (recomendado para `npm ci` em PC novo).
- Push e merge da branch `organizacao` (precisa de `acesso-liberado-robo` antes) → OK do Paulo.

## Decisões para rever (gatilho)
- Subir para Next 16.3+ → avaliar `next-dev-loop` e `next-bundle-optimizer`.
- Regra de lint zerou → promover a `error`.
- Projeto ganhar GitHub Actions → instalar `gh-fix-ci`.
