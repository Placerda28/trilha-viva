Sempre responder, explicar e comentar em português do Brasil. O dono do projeto não programa: linguagem simples.

# Trilha Viva — regras do projeto

Site https://trilhaviva.org, vende um pacote de multitracks gospel. Dono: Paulo.

## Como trabalhar
- Todo commit em `main` publica o site na hora (deploy automático da Cloudflare). Trabalho novo vai numa branch; só entra em `main` com o OK do Paulo.
- O menu de gestão é construído na branch `gestao`. Plano e andamento em `tasks/todo.md`.
- Divisão com o Codex: ele faz o backend (`lib/gestao/`, `app/api/gestao/`, mudanças pontuais em checkout/webhook); o Claude faz o frontend (`app/gestao/`, `components/gestao/`) e revisa todo diff do Codex. Os dois nunca mexem no mesmo arquivo ao mesmo tempo.
- Toda especificação mandada ao Codex começa com "Responda e comente sempre em português do Brasil."
- Não ativar o review gate do Codex.
- Pontos de parada com o Paulo: antes de alterar o D1 de produção (mostrar o SQL), segredos novos, merge em `main` e compra real de teste.

## Fatos que não podem ser esquecidos
- Next.js em Cloudflare Workers via OpenNext, plano grátis: **10 ms de CPU por visita**. Coisa pesada no carregamento de módulo derruba a página com Erro 1102 (intermitente). Telas dinâmicas: consultas enxutas, paginação, nada de listas enormes no servidor. `localeCompare` é caro: reaproveitar um `Intl.Collator`.
- Não mexer em `incrementalCache` / `enableCacheInterception` do `open-next.config.ts`.
- `"keep_vars": true` no `wrangler.jsonc` tem que continuar lá, senão o deploy apaga as variáveis do painel.
- Variável nova no painel da Cloudflare só vale depois de "Promote version" (Deployments → Version History).
- **Sessão**: é nossa, não da Supabase. Cookie `tv_sessao` → resumo SHA-256 na tabela `sessoes` do D1 → `clienteAtual()` em `lib/sessao.js`. A Supabase só confere senha (`lib/senhas.js`, chave de servidor `SUPABASE_SECRET_KEY`). Quem decide acesso ao acervo é `temCompra()` (compra com `status = 'pago'`).
- Pagamento: Mercado Pago Checkout Pro (Pix e cartão). Stripe fica como reserva (`PAGAMENTO=stripe`). Compra do MP é gravada como `mp_<id>` na coluna `stripe_session_id`. A `external_reference` é um UUID.
- Entrega: `/acervo` → `/api/baixar` → link temporário do Backblaze B2, cota de 30 downloads/dia (`lib/cota.js`). **Não mexer no fluxo de download.**
- Datas no D1 são UTC (`datetime('now')`). O dia do negócio é o de Brasília (UTC−3).
- Paleta: ink #0D0D0D, ink-muted #5C5C5C, paper #F2F3F5, mist #E7E8EB, line #E0E2E6, signal #E5152D (só gráfico/borda), signal-deep #C40F24 (texto/botão no claro), signal-lite #FF5566 (texto no preto). Vermelho nunca em área grande. Sem sombras. Fontes Archivo e Source Serif 4 auto-hospedadas (`next/font/google` não funciona). Tem que funcionar no celular.
- Dado de fora dentro de `<script>` passa por `ldJson()` de `lib/safe.js`. Nome de cliente em e-mail passa por `escapeHtml`.
- Segredos nunca entram no git: `npx wrangler secret put NOME` ou painel.
- Evitar sequências de escape com barra invertida e caracteres invisíveis em literais: já se corromperam no caminho até o repositório (ver `lib/safe.js` e `app/api/baixar/route.js`).
- A pasta local do projeto tem um caractere especial no nome ("C:dev"): a ferramenta Write/Edit pode falhar; nesse caso, grave pelo terminal.
