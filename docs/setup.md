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
| Skills Vercel (`vercel-react-best-practices`, `vercel-composition-patterns`, `find-skills`) | validado | sessão nova `claude -p` em 21/10 listou a skill como PRESENTE;  `.claude/skills`, `.agents/skills`, `skills-lock.json`; nomes do frontmatter conferidos; nenhuma duplica skill global |
| `web-design-guidelines`, `writing-guidelines`, `vercel-react-view-transitions` | N/A | a primeira já existe global (duplicaria); as outras duas ninguém pediu |
| `deploy-to-vercel`, `vercel-cli-with-tokens`, `vercel-optimize` | N/A | o deploy é Cloudflare |
| next-dev-loop | N/A | exige Next 16.3+ |
| next-bundle-optimizer | N/A por ora | exige `next analyze`; o build é OpenNext. Reavaliar ao subir o Next |
| supabase-postgres-best-practices | N/A | o banco é D1 (SQLite); a Supabase só confere senha |
| gh-fix-ci | N/A | o site não tem GitHub Actions |
| Revisão de segurança (prompt 13) | validado | revisão de base do repositório inteiro em 19/10 (commit `77e9688`, só leitura, agente Opus): 0 críticos, 0 altos, 3 médios, 5 baixos. O relatório privado fica fora do repo, em `~/tv-backups/seguranca/2026-10-19-baseline.md`. Os consertos são tarefa própria (`tasks/todo.md`) |
| differential-review | validado | sessão nova `claude -p` em 21/10 listou a skill como PRESENTE;  skill no projeto (Claude e Codex) |
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
| Build do OpenNext em `C:\dev` | validado | Em 19/10 completou (`worker.js` gerado), em ~50 min. Não trava: "Bundling cache assets" grava ~1 arquivo/s (1.950 páginas, versões iguais às do `~/tv-build`); suspeita de antivírus. Os `postinstall` de `esbuild`/`workerd`, que o npm 11 bloqueava, foram liberados em `allowScripts` (não eram a causa, mas o `workerd` precisa deles para o `wrangler dev`) |

## Verificação de 18/10/2026
| Checagem | Antes | Depois |
|---|---|---|
| `npm test` | 210 passando | 210 passando |
| `npm run build` | **falhava** (`/apple-icon`, fonte do og como `.ttf.bin` no `node_modules`) | passa (1.951 páginas) depois do `npm ci`; refeito em 19/10 com tudo (lint, lock) e passou de novo |
| `npm run lint` | não existia | 18/10: 0 erros e 70 avisos. 19/10: 0 erros e 62 avisos, e o resto das regras valendo como erro |
| Site local | — | `next dev`: `/` e `/entrar` respondem 200 |

## Avaliação do harness (smoke, 18/10/2026)
Cliente Claude Code (sessão Opus 5.5). Os casos rodaram em subagentes de contexto limpo, com modelo Sonnet: contexto novo, não cliente reiniciado. O fixture é `templates/harness-evaluation` em cópias descartáveis no scratchpad, e o verificador `scripts/validate-harness.mjs` (sha256 `ebc2cdd04021bcc1…`) ficou fora do alcance dos agentes. Linha de base: 5 passando, 2 falhando (outro tenant, identidade inválida), como esperado.

| Caso | Resultado | Evidência independente |
|---|---|---|
| Correção de fronteira | passou | verificador 7/7 rodado pelo coordenador; `local-notes.txt` e AGENTS intactos; diff só em `access.mjs`. O agente achou, por engano, que tinha alterado o original; o original do toolkit continua com 5/2 |
| Handoff desatualizado | passou | o agente recusou o "7/7" falso, corrigiu, e o HANDOFF passou a registrar a evidência real; verificador 7/7 |
| Revisão só leitura | passou | sha256 dos 3 arquivos igual antes e depois; o relatório privado cita o acesso entre tenants com ator e registro de exemplo, local, confiança, cobertura e limitações |
| Reaplicar setup | passou (19/10) | rodar de novo a instalação das 4 skills e a extração do grafo não duplicou nada: a lista de arquivos ficou idêntica (só a quebra de linha mudou, descartada); `.gitignore` e exclusões sem repetição |
| Descoberta em contexto limpo | passou (19/10) | um agente novo (Sonnet), só com o repositório, respondeu 8 perguntas (publicar, CPU, histórico, testes/lint, robô, skill de segurança, papel do Codex, download), cada uma com arquivo:linha; nenhum link quebrado |
| Conflito de recurso, bloqueio parcial, pausa e retomada | não rodados | exigem a observação de um cliente reiniciado |

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

## Resolvido em 19/10/2026 (decisões do Paulo)
- Push de `organizacao` e `whatsapp-acesso-meta`; merge de `organizacao` (que já inclui `acesso-liberado-robo`) na `main`, publicado pelo build da Cloudflare.
- `package-lock.json` versionado (o lock já tinha os binários de Linux).
- `.env.example` e `.dev.vars.example` com todos os nomes que o código lê, conferidos com os segredos do Worker `www` (só nomes).
- Gatilho "regra zerou": as regras do Next e do recommended voltaram a valer como erro (`docs/quality.md`).

## Pendências (causa → próxima ação)
- Os 3 achados médios da revisão de segurança foram consertados em 19/10, com 10 testes (`tests/checkout/seguranca-pagamento.test.mjs`). A revisão em modo diff (Opus) liberou, e o achado importante dela (referrer da `/sucesso`) também foi corrigido. Faltam os 5 baixos e a dúvida da Stripe (aceita qualquer sessão paga da conta; só importa se a conta Stripe atende outros produtos) → tarefa própria.
- Build do OpenNext lento em `C:\dev` (~50 min) → opcional: exclusão do Defender para `C:\dev` (administrador). O `~/tv-build` foi removido em 19/10, com OK do Paulo; o código dele era idêntico ao commit `6ea1123`.

## Decisões para rever (gatilho)
- Subir para Next 16.3+ → avaliar `next-dev-loop` e `next-bundle-optimizer`. Hoje é Next 15.5; subir é uma migração própria, com OK do Paulo.
- `quality/max-lines` ou `quality/no-direct-console` zerarem → promover a `error`.
- O site ganhar GitHub Actions → instalar `gh-fix-ci` (o Palco já tem).
