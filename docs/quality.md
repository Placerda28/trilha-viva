# Qualidade e verificação

## Antes de entregar qualquer mudança
```bash
npm test         # node --test em tests/gestao, tests/recuperacao e tests/checkout
npm run build    # build do Next (também monta as imagens de assets/)
```
- Se a mudança mexer em rota dinâmica, robô ou gestão, rode também `npm run preview` (runtime dos Workers) e lembre do limite de 10 ms de CPU (`docs/architecture.md`).
- Em conserto de bug, primeiro um teste que reproduz o bug, depois o conserto, depois a suíte inteira.
- Mudança não trivial passa por uma revisão independente (outro agente, só leitura) antes do merge.

## Testes
- Os testes usam o `node --test` puro, sem framework. Os arquivos ficam em `tests/<área>/*.test.mjs`.
- Eles não acessam serviço real: D1, Mercado Pago, Meta e e-mail são simulados dentro dos testes.

## Lint
- `npm run lint` roda o ESLint 9 (`eslint.config.mjs`) com `eslint:recommended`, as regras do Next (`eslint-config-next` 15.5) e as três regras `quality/*` do toolkit (`eslint-rules/`, copiadas sem alteração da revisão `de66fe3`).
- O build não roda o lint (`eslint.ignoreDuringBuilds` no `next.config.mjs`), então o deploy não depende dele. Rode `npm run lint` antes de entregar: ele termina com erro se uma regra valendo for quebrada.
- `npm run lint:verify` é o auto-teste das regras `quality/*`.
- Para atualizar as regras: copie de novo as três `.cjs` e o `verify.mjs` da revisão nova do toolkit, rode `npm run lint:verify` e meça de novo.

Histórico:
- **18/10/2026, medição:** 203 arquivos, 0 erros e 70 avisos. Eram 51 `no-direct-console`, 11 `max-lines`, 5 `no-unused-vars`, 1 `no-img-element`, 1 `no-useless-escape` e 1 `no-anonymous-default-export`. Só `quality/no-direct-data-access` (com zero violações) entrou como erro.
- **19/10/2026, gatilho "regra zerou → erro":**
  - as variáveis não usadas e a barra invertida sobrando foram removidas;
  - o pixel da Meta no `<noscript>` ganhou uma exceção comentada (não é foto);
  - `export default` sem nome passou a ser permitido em `workers/`, porque é o formato do Worker.
  - Com isso, todas as regras do Next e do `eslint:recommended` voltaram ao nível padrão (erro), e uma sonda com variável não usada falha como deveria.

Hoje: 0 erros e 62 avisos, todos em duas regras que ficam em aviso.

| Avisos | Regra | O que significa |
|---|---|---|
| 51 | `quality/no-direct-console` | `console.*` direto. Nos Workers é o log de fato; só cai se o Paulo quiser um módulo de log |
| 11 | `quality/max-lines` | arquivos acima de 350 linhas (tabela abaixo) |

## Tamanho de arquivo (referência do toolkit: 350 linhas)
Arquivos acima do limite em 18/10/2026 (o catálogo gerado não conta):

| Linhas | Arquivo |
|---|---|
| 941 | `components/gestao/WhatsappConversas.jsx` |
| 776 | `workers/recuperacao-carrinho/whatsapp.js` |
| 565 | `workers/recuperacao-carrinho/index.js` |
| 494 | `lib/gestao/whatsapp.js` |
| 487 | `app/page.js` |
| 481 | `workers/recuperacao-carrinho/whatsapp-estado.js` |
| 462 | `components/gestao/Cupons.jsx` |
| 447 | `lib/gestao/recuperacao.js` |
| 443 | `components/gestao/Recuperacao.jsx` |
| 376 | `components/CheckoutForm.jsx` |
| 360 | `lib/gestao/cupons.js` |

Plano: dividir só numa tarefa própria, um arquivo por vez, por responsabilidade, com os testes da área passando antes e depois e sem aumentar o trabalho no carregamento do módulo (limite de CPU). O `max-lines` do lint (abaixo) acompanha a contagem.

## Revisão de segurança
O site tem pagamento, login, webhooks e dados de clientes. Para revisar:
- **Prompt do toolkit (revisão completa ou de um diff):** fonte fixa em https://raw.githubusercontent.com/soumatheusgomes/vibe-coding-toolkit/de66fe3/docs/prompts/13-security-review.md. No agente, peça: "Leia esse arquivo e execute o bloco 'Prompt' neste projeto". Para um diff, informe a base e o head (exemplo: `main` e a branch). A revisão é só leitura. O relatório fica numa pasta privada **fora do repositório** (exemplo: `~/tv-backups/seguranca/`), sem segredos.
- **Skill `differential-review`** (instalada no projeto): use-a para revisar o diff de uma branch que mexe em checkout, webhook, sessão, permissão da gestão ou robô. Sem ela, faça o rastreio manual do código.
- Instalar ou rodar a revisão não autoriza testar contra a produção, enviar código para fora nem aplicar correção sozinha.
- Para atualizar o prompt, troque a revisão (`de66fe3`) pela mais nova do toolkit e registre a troca em `docs/setup.md`.

## Auditoria de dependências
- Rode `npm audit --omit=dev`, que mostra o que vai para produção. Se houver conserto sem versão maior, rode `npm audit fix --omit=dev`, depois `npm ci` (o `--omit=dev` tira as ferramentas de desenvolvimento do `node_modules`), `npm test` e `npm run build`.
- Não use `npm audit fix` sem `--omit=dev` nem `--force` sem revisar: em 19/10 o `fix` completo mexia em 77 pacotes, inclusive no `wrangler`, que é a ferramenta de deploy.
- **19/10/2026:** produção com 0 vulnerabilidades depois de `next` 15.5.26 → 15.5.28 (envenenamento de cache SSG/ISR, moderada) e `sharp` 0.35.4 → 0.35.5 (alta, só no build).
- Continuam no desenvolvimento, porque pedem versão maior (`--force`): `braces`, `postcss-selector-parser` e `undici` (este via `wrangler`/miniflare). Nenhuma vai para o site publicado. Reavaliar quando subir `wrangler` ou o Tailwind.
