Sempre responder, explicar e comentar em português do Brasil. O dono do projeto, Paulo, não programa: use linguagem simples.

# Trilha Viva — site

O site https://trilhaviva.org vende acesso vitalício, em pagamento único, a um acervo de multitracks gospel (VS). Depois da compra, o cliente cria a senha, entra em `/acervo` e baixa as músicas. Além disso, existe um menu de gestão interno (`/interno/gestao`) e um robô de recuperação de carrinho (e-mail e WhatsApp). O produto irmão, o **Palco**, fica em `C:\dev\trilha-viva-palco`.

## Mapa
- `PRODUCT.md`: para quem é, o que vende, posicionamento.
- `docs/architecture.md`: como o site funciona e os **fatos que não podem ser esquecidos**. Leia antes de mexer em código.
- `docs/design.md`: paleta, fontes e regras visuais.
- `docs/onboarding.md`: preparar um PC novo.
- `docs/quality.md`: verificações, lint, revisão de segurança.
- `docs/setup.md`: ferramentas do toolkit, decisões e como manter.
- `tasks/todo.md`: o que está em andamento ou esperando o Paulo. As frentes concluídas ficam em `tasks/arquivo/`.
- No Google Drive, em `G:\Meu Drive\01 - OFICINA\02. TRILHA VIVA`, ficam a gestão, a publicidade e o histórico geral. Veja o `LEIA-ME.md` de lá.

## Comandos
- `npm ci`: instala as dependências.
- `npm run dev`: abre o site em http://localhost:3000.
- `npm test`: roda os testes (`node --test`).
- `npm run build`: faz o build do Next.
- `npm run lint`: ESLint (não entra no build, mas rode antes de entregar). Só tamanho de arquivo e `console` ficam em aviso; o resto dá erro (`docs/quality.md`).
- `npm run preview`: mostra o site no runtime dos Workers, igual à produção.
- **Publicar:** todo commit em `main` publica o site sozinho, pelo build da Cloudflare. A reserva manual é `npm run deploy`, e só roda com o OK do Paulo.

## Como trabalhar
- Leia as instruções e o código envolvido antes de agir. Separe o que você viu, o que supõe e o que decidiu.
- Faça a menor mudança que resolve por completo e reaproveite o que já existe. Não acrescente dependência, abstração ou recurso que ninguém pediu.
- Antes de implementar, defina como vai provar. Antes de entregar, rode `npm test` e `npm run build`. Em conserto de bug, reproduza o bug primeiro.
- Atualize o documento responsável junto com a mudança (comando, esquema, regra, configuração).
- Trabalho novo vai numa branch e só entra em `main` com o OK do Paulo.
- Pare e fale com o Paulo:
  - antes de alterar o D1 de produção (mostre o SQL);
  - antes de criar segredo novo;
  - antes de merge em `main`, push ou deploy;
  - antes de compra real de teste;
  - antes de qualquer gasto ou mensagem para terceiros.
- Segredo nunca entra no git: use `npx wrangler secret put NOME` ou o painel.

## Claude e Codex
- O Claude coordena. O Codex é assistente que o Claude comanda (`codex --model gpt-6-astra`), e o Claude revisa todo diff do Codex.
- Deploy, push, merge e segredos ficam com o Claude, sempre com o OK do Paulo. O Codex aberto sozinho segue estas mesmas regras e pontos de parada.
- Toda especificação mandada ao Codex começa com "Responda e comente sempre em português do Brasil."
- Dois agentes nunca editam o mesmo arquivo ao mesmo tempo.

## Subagentes
- Delegue só quando isolar o contexto ajuda ou quando há trabalho independente. Use o modelo mais leve que cumpre o critério de aceite. Para segurança, pagamento, migração, permissão e diagnóstico confuso, use o modelo forte.
- Toda tarefa delegada leva objetivo, arquivos permitidos, critério de aceite e formato de retorno.
- Cada arquivo tem um só escritor. Revisores só leem. O coordenador confere o diff e roda as checagens.

## Histórico geral (obrigatório)
Ao terminar uma entrega (commit que muda comportamento, deploy, migração, nova frente), acrescente **uma linha no topo do mês** em `G:\Meu Drive\01 - OFICINA\02. TRILHA VIVA\HISTORICO.md`:

`- AAAA-MM-DD · SITE · o que foi feito, em linguagem simples · onde ver (commit, tarefa)`

As áreas são `SITE`, `PALCO`, `GESTAO`, `INSTAGRAM`, `ANUNCIO`, `ACERVO` e `OUTRO`. Sem `G:\` (outro PC), escreva a linha no fim da resposta e avise que ela ficou pendente.

## Skills do projeto
Ficam em `.claude/skills/` e `.agents/skills/`, com a lista em `skills-lock.json`.
- `vercel-react-best-practices`: ao escrever ou revisar componente React/Next.
- `vercel-composition-patterns`: ao desenhar componentes reaproveitáveis.
- `find-skills`: para procurar uma skill existente antes de criar uma.
- `differential-review`: revisão de segurança de um diff (pagamento, login, webhook). O fluxo está em `docs/quality.md`.
