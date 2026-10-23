# Gestão nova — Fases 4b e 5

Conferência da terceira rodada em 23/10/2026, na worktree `gestao-nova-2`.

## Ponto de partida e resultado desta rodada

- Base: `44ae790` (fase 4a). Trabalho retomado de `7aac0e1` e `026f0d1` (WIP da segunda rodada).
- O diff acumulado contém 19 arquivos, com 628 inserções e 256 remoções. Os nove itens pedidos já estavam implementados; esta rodada não refez componentes nem alterou o backend.
- Esta rodada criou somente este documento, depois de conferir componentes, páginas, contratos das APIs e executar os testes e o lint.
- A fase 4b foi conferida inteira antes da fase 5. Não houve commit, push, deploy, build, instalação de dependência ou envio de mensagem.

## Fase 4b — conferência item por item

1. **Carrinhos:** incluído em `COM_PERIODO`; usa `usePeriodo` e quatro `Kpi`; Recuperados separa e-mail e WhatsApp. Filtros em `Segmentos`, coluna Origem, resumo dos lembretes e Dialog com e-mails e `SequenciaWhatsapp`. Menu de ações oferece marcar/desmarcar teste e parar lembretes quando aplicável, com confirmação. “Como funciona” usa `Collapsible` do Radix. Arquivos: `Casca.jsx`, `Recuperacao.jsx`, `RecuperacaoTabela.jsx` e `SequenciaWhatsapp.jsx`.
2. **WhatsApp:** abas Conversas [n], Sequências e Robô, nessa ordem. Robô começa pelo cartão de estado, com `modelo_status`, `ligado_em` e os controles existentes. Parar lembretes e Chamar de novo usam `AcaoGestao`; não usam `window.confirm`. Conversas usa altura calculada com `100dvh`, descontando topo, espaço inferior e área segura do celular. Arquivos: `WhatsappConversas.jsx`, `WhatsappConversasPainel.jsx`, `WhatsappEstado.jsx` e `WhatsappCompositor.jsx`.
3. **Leads:** período global, quatro `Kpi` com comparação ao período anterior, busca por URL, telefone formatado por `whatsappUtil`, tabela no computador e cartões no celular. A largura mínima de 760 px foi retirada. Validação do intervalo vem de `usePeriodo`. Arquivo: `Leads.jsx`.
4. **Registro:** subtítulo “Tudo que a equipe mexeu na gestão.”; filtros Quem, Tipo e período. Quem vem de `quem_opcoes`; as ações de Tipo estão organizadas em grupos. Mantém o mapa `ACOES` da fase 4a. Arquivo: `Registro.jsx`.
5. **Contatos de teste:** mostra autor e dia/mês quando `criado_por` e `criado_em` estão presentes. A página própria já existia. Arquivo: `ContatosTeste.jsx`.
6. **Equipe:** lista primeiro, botão “Adicionar à equipe” abre Dialog; cada membro mostra último acesso ou “Ainda não entrou”; sem o `mt-8` extra na seção. Mantém a restrição ao master. Arquivo: `Equipe.jsx`.

Os componentes citados ficam em `components/gestao/`.

## Fase 5 — conferência item por item

7. **Campanhas:** página em `app/interno/gestao/campanhas/page.js` e componente `components/gestao/Campanhas.jsx`. Período global; linhas por fonte/campanha com anúncios expansíveis; Leads, Carrinhos, Vendas, Faturamento e Carrinho → venda; linha Sem registro e total. No celular, cartões com os anúncios em expansão própria.
8. **Downloads:** página em `app/interno/gestao/downloads/page.js` e componente `components/gestao/Downloads.jsx`. Quatro `Kpi`; gráfico numérico com agrupamento por dia, semana ou mês; até 50 músicas com links sem prefetch; até 20 clientes com abertura do Detalhe pelo id. A cota vem de `limite_dia`, sem número fixo na apresentação. Sem exibição de IP. Usa período global e cartões no celular.
9. **Navegação:** Campanhas e Downloads estão no `MENU` sem `soDepois`. O Painel oferece “Ver campanhas”, preservando o período e com `prefetch={false}`. Arquivos: `BarraLateral.jsx` e `Painel.jsx`.

## Limites dos contratos preservados

- Carrinhos: `de` e `ate` filtram os cartões, mas a lista e o CSV continuam históricos. A tela explica isso. O CSV não inclui testes.
- Leads: busca filtra os itens, mas os cartões e o CSV continuam incluindo todos os leads do período. A tela explica isso quando há busca.
- Registro: a API aceita uma ação exata em `tipo`, não uma categoria inteira. O seletor agrupa as ações por Cupons, Clientes, Carrinhos, Equipe, Testes e WhatsApp, sem prometer filtro por categoria.
- Campanhas: a API não fornece leads nem conversão por anúncio; a tela mostra “—”. As consultas têm limites de grupos, portanto a lista pode ser parcial; vendas e faturamento totais vêm da consulta do período inteiro. A tela mantém esse aviso.
- Downloads: a API fornece o slug, não o título de catálogo; o link apresenta o slug com espaços. “Hoje” e a cota diária são independentes do período escolhido.

## Validação executada em 23/10/2026

- `npm test`: **343 testes aprovados, zero falhas, zero ignorados**.
- `npx eslint components app/interno`: **sem erros nem avisos**.
- `git diff --check`: sem problemas no estado conferido.
- `tests/gestao/telas-fase4b-5.test.mjs`, já presente no WIP, renderiza Campanhas e Downloads com contratos simulados. Confere série numérica, cota recebida, link sem prefetch, abertura do cliente pelo id, carregamento, falha, estado vazio, anúncio expandido, métricas indisponíveis, total e escape de nomes.
- Conferência estática dos cartões responsivos, quebra de texto, controles com área de toque de 44 px e links novos sem prefetch. Não houve medição de layout no navegador; isso não comprova `scrollWidth === 390`.

## Pendências de validação para o coordenador

- Navegador autenticado: conferir as telas em 1440, 1024 e 390 px, ausência de rolagem lateral, altura das conversas, diálogos e navegação por teclado.
- Não foram executadas as provas de produção da seção 7: comparação dos números com D1, permissões por perfil via HTTP, CPU do Worker, Network/prefetch e fluxos públicos após publicação.
- Build não executado por proibição expressa desta tarefa. O resultado de testes/lint não substitui build ou validação visual.
- Revisão do diff e decisão de integração/publicação ficam com o coordenador. Nenhuma dúvida funcional exige decisão para manter o comportamento já implementado.
- `prints-fase3/` já estava sem rastreamento ao começar; não foi alterado.
- Histórico geral e aviso à Publicidade não foram escritos: esta tarefa restringe a atuação à worktree e não autoriza mensagem a terceiros. Linha sugerida para o histórico, quando o coordenador registrar a entrega:

`- 2026-10-23 · GESTAO · Conferidas as fases 4b e 5 da gestão, com Carrinhos, WhatsApp, Leads, Registro, Equipe, Campanhas e Downloads; 343 testes aprovados e lint limpo, validação visual pendente · tasks/2026-10-22-gestao-fase4b-5.md`
