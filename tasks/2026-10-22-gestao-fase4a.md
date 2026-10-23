# Gestão nova — Fase 4a

Entrega na branch `gestao-nova-2`, em 22/10/2026.

- Vendas usa o período global. `/gestao/periodo` redireciona para `/gestao/vendas`, preservando `de` e `ate`. Duas consultas à rota de período comparam intervalos de mesma duração, inclusive Pix e cartão.
- Clientes usa segmentos, origem, último acesso e menu de ações com confirmação. A linha abre o detalhe por clique, Enter ou Espaço.
- Cupons mostra a lista primeiro, criação em diálogo, filtros, uso proporcional e autor/data da desativação.
- Registro e Atividade traduzem todas as ações atuais. Um teste confere a cobertura do catálogo.
- Leads lê `q` da URL, consulta a API e mostra cartões nas telas menores.

## Limites dos contratos atuais

- A API de período não recebe busca. Vendas identifica a busca como restrita aos 25 itens da página atual. A planilha exporta todas as compras reais do período.
- `testes=1` inclui testes junto aos clientes reais; não existe filtro exclusivo de testes. A tela explica esse comportamento.
- CSV de Clientes respeita busca, mas não situação nem testes. CSV de Leads não respeita `q`. Ambos têm aviso na tela.
- O filtro combinado de cupons consulta `situacao=todos` e seleciona os ativos vencidos ou esgotados no navegador.

## Validação

Executar `npm test` e `npx eslint components app/interno`. Os testes novos verificam a tradução das ações e o redirecionamento antigo.
Build, push e deploy não fazem parte desta entrega. Conferência visual em navegador autenticado e comparação com produção ficam pendentes.

Histórico geral pendente: a instrução desta tarefa restringe a escrita à worktree.
