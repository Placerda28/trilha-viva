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
