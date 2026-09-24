Sempre responder, explicar e comentar em português do Brasil. O dono do projeto não programa: linguagem simples.

# Trilha Viva — instruções para o Codex

Leia também o `CLAUDE.md` da raiz: os fatos do projeto listados lá valem para você.

## Seu papel
- Você faz o backend do menu de gestão: `lib/gestao/`, `app/api/gestao/`, tabelas novas e as mudanças pontuais no checkout e nos webhooks que a especificação pedir.
- Não toque em `app/gestao/`, `components/gestao/` (frontend do Claude) nem em arquivo que a especificação não liste.
- Não mexa no fluxo de download (`app/api/baixar`, `lib/b2.js`, `lib/cota.js`), no `open-next.config.ts` nem no `"keep_vars"` do `wrangler.jsonc`.
- Não altere o D1 de produção (`--remote`). Escreva o SQL de migração num arquivo em `migrations/` e pare: quem aplica é o Paulo, depois de ver o SQL.
- Nunca escreva segredo em arquivo do repositório.
- Trabalhe na branch `gestao`. Não faça merge nem push em `main`.

## Regras de código
- Worker da Cloudflare com 10 ms de CPU por visita: consultas enxutas, sempre com `LIMIT`, nada pesado no topo do módulo, sem bibliotecas novas sem pedir.
- Toda rota `/api/gestao/*` começa chamando `papel()` de `lib/gestao/permissao.js` e responde 404 (nunca 403) para quem não é admin. A decisão vem só do servidor (sessão `tv_sessao` validada no D1), nunca de algo mandado pelo navegador.
- Respostas com `Cache-Control: no-store`.
- Siga o estilo do código ao redor: `getDB`/`umaLinha`/`executar` de `lib/d1.js`, comentários em português explicando o porquê.
- Rode `npm run build` antes de entregar e diga o resultado.
