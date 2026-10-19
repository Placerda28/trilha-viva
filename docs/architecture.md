# Arquitetura do site

## Peças
- **Next.js 15 (App Router) em JavaScript**, Tailwind 3 e React 19. Roda em **Cloudflare Workers** via OpenNext (`open-next.config.ts`, `wrangler.jsonc`).
- **D1** (SQLite da Cloudflare): clientes, sessões, compras, carrinhos, cupons, equipe, registro de ações e WhatsApp. O esquema fica em `migrations/0000…0014`. O acesso passa por `getDB`/`umaLinha`/`executar` de `lib/d1.js`.
- **Supabase**: só confere a senha (`lib/senhas.js`, chave de servidor `SUPABASE_SECRET_KEY`).
- **Pagamento**: Mercado Pago Checkout Pro, com Pix e cartão (`lib/mercadopago.js`). A Stripe fica como reserva (`PAGAMENTO=stripe`).
- **Entrega dos arquivos**: Backblaze B2, com link temporário (`lib/b2.js`) e cota de downloads (`lib/cota.js`).
- **E-mail**: Resend (`lib/email.js`). **WhatsApp**: API oficial da Meta (`lib/whatsapp-*.js`).
- **Meta (anúncios)**: Pixel no navegador (`components/MetaPixel.jsx`) e eventos pelo servidor (`lib/meta.js`, `lib/rastreio*.js`).
- **Robô** `workers/recuperacao-carrinho/`: um Worker separado, com `wrangler.jsonc` próprio. Manda lembretes de carrinho abandonado por e-mail e WhatsApp e acompanha a aprovação de modelos na Meta. É publicado à parte do site.

## Pastas
- `app/`: páginas e rotas. As públicas são home, `musicas/`, `artistas/`, `blog/`, `como-usar/`, `faq/`, `assinar/`, `sucesso/`, `entrar/`, `criar-senha/`, `primeiro-acesso/`, `recuperar/`, `redefinir/`, `acervo/`, `privacidade/` e `termos/`.
- `app/interno/gestao/`: menu de gestão (Clientes, Período, Cupons, Recuperação — com as conversas de WhatsApp em `recuperacao/whatsapp` —, Equipe, Registro). Só admin entra.
- `app/api/`: `checkout`, `mercadopago`, `webhook`, `acesso`, `baixar`, `carrinho`, `conta`, `cupom`, `descadastrar` e `interno` (a gestão).
- `components/`: componentes do site. `components/gestao/` reúne as telas da gestão.
- `lib/`: regras do negócio. `lib/gestao/` guarda o backend da gestão (permissão em `permissao.js`).
- `lib/catalog.js` + `lib/catalog-dados-1…8.js`: o acervo, já pronto e ordenado. **Arquivo gerado, não edite à mão.** O gerador (`gerar_catalogo.py`) fica no Drive, em `01 - DEV (ARQUIVOS DO SITE)\Claude outputs\gerar catalogo`.
- `assets/*.b64.NN` + `assets/manifest.json`: as imagens em pedaços base64, conferidas por sha256. `scripts/decode-assets.mjs` monta tudo em `public/img/` antes do build (`prebuild`).
- `migrations/`: SQL do D1, numerado.
- `tests/`: `checkout/`, `gestao/`, `recuperacao/` (`node --test`).

## Fluxo de compra
1. O cliente preenche os dados em `/assinar`, e `POST /api/checkout` cria a preferência no Mercado Pago (o carrinho é gravado).
2. Depois de pagar, o cliente volta para `/sucesso`, que confere o pagamento a cada 3 s por até 3 min (`lib/pos-pagamento.js`).
3. O webhook do Mercado Pago (`/api/mercadopago/webhook`) grava a compra e manda o e-mail de criar senha. Se `WA_ACESSO=ativo`, manda também o WhatsApp `acesso_liberado`.
4. O cliente cria a senha e entra. `/acervo` lista as músicas, e `/api/baixar` devolve o link temporário do B2.

## Fatos que não podem ser esquecidos
- **10 ms de CPU por visita** (plano grátis da Cloudflare). Coisa pesada no carregamento de módulo derruba a página com o Erro 1102, de forma intermitente. Nas telas dinâmicas: consultas enxutas, sempre com `LIMIT`, paginação, nada de listas enormes no servidor. `localeCompare` é caro: reaproveite um `Intl.Collator`. Quase todo o site é estático de propósito, e `/acervo` é a exceção dinâmica.
- Não mexa em `incrementalCache` / `enableCacheInterception` do `open-next.config.ts`.
- `"keep_vars": true` no `wrangler.jsonc` tem que continuar lá. Sem ele, o deploy apaga as variáveis do painel.
- Variável nova no painel da Cloudflare só vale depois de "Promote version" (Deployments → Version History).
- `NEXT_PUBLIC_SITE_URL` é embutida no build. Ela fica nas variáveis de **Build** da Cloudflare e precisa existir no `.env.local` para o build local.
- **Sessão**: é nossa, não da Supabase. O cookie `tv_sessao` gera um resumo SHA-256, gravado na tabela `sessoes` do D1, e `clienteAtual()` em `lib/sessao.js` faz a conferência. Quem decide o acesso ao acervo é `temCompra()` (compra com `status = 'pago'`).
- **Gestão**: toda rota `/api/interno/gestao/*` é embrulhada por `soAdmin` (ou `soMaster`/`soAdminInclusive`) de `lib/gestao/permissao.js`, que usa `papel()` e responde 404 (`naoEncontrado()`, nunca 403) para quem não é admin. A decisão vem só do servidor. As respostas levam `Cache-Control: no-store`.
- A compra do Mercado Pago é gravada como `mp_<id>` na coluna `stripe_session_id`. A `external_reference` é um UUID.
- **Não mexa no fluxo de download** (`app/api/baixar`, `lib/b2.js`, `lib/cota.js`).
- Datas no D1 são UTC (`datetime('now')`). O dia do negócio é o de Brasília (UTC−3).
- Compra e carrinho de teste ficam marcados com `teste = 1`. As visões `compras_reais` e `carrinhos_reais` filtram os testes, e teste não manda evento à Meta.
- Dado de fora dentro de `<script>` passa por `ldJson()` de `lib/safe.js`. Nome de cliente em e-mail passa por `escapeHtml`.
- Evite sequências de escape com barra invertida e caracteres invisíveis em literais: elas já se corromperam no caminho até o repositório (veja `lib/safe.js` e `app/api/baixar/route.js`).
- Imagens usam `<img>` simples, não `next/image`: o otimizador do Next não roda nos Workers sem um loader configurado.
- Fontes auto-hospedadas via `@fontsource` (`next/font/google` não funciona aqui).
- Migração do D1 sempre ANTES do deploy que usa as colunas novas. Quem aplica no `--remote` é o Paulo, depois de ver o SQL.

## Publicação
- O caminho principal é um commit em `main`: a Cloudflare faz o build e publica sozinha.
- **Reserva manual (só com OK do Paulo), o único caminho já provado:** `cd ~/tv-build && git checkout --detach main && npx opennextjs-cloudflare build && npx opennextjs-cloudflare deploy`. O `~/tv-build` é um git worktree e já tem `node_modules`, `.env.local`, `.dev.vars` e `package-lock.json`. Se o envio cair (ECONNRESET), repita só o `deploy`.
- O mesmo build direto em `C:\dev\trilha-viva` (`npx opennextjs-cloudflare build`) **ainda não foi provado**: em 18/10 ele foi interrompido por falta de memória no PC. Quando passar ali, este trecho muda e o `~/tv-build` pode ser removido, com OK do Paulo.
- Histórico: a partir de 12/10/2026 passou-se a publicar do `~/tv-build`, porque a pasta antiga ("C:dev", com um caractere especial no nome) quebrava o build. Desde 18/10 o projeto fica em `C:\dev\trilha-viva`.
- O robô se publica à parte: `cd workers/recuperacao-carrinho && npx wrangler deploy`, só com OK.
