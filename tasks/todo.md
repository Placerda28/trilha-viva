# Em andamento e esperando o Paulo

Só o que ainda está aberto. O detalhe de cada frente fica em `tasks/arquivo/`, e o resumo do que já foi feito, no `HISTORICO.md` do Drive. Atualizado em 19/10/2026.

Os itens marcados "conferir" vieram de frentes antigas e podem já ter sido resolvidos por trabalho posterior. Confirme antes de agir e apague o que já estiver feito.

## Próxima sessão: comece por aqui (deixado em 21/10/2026)

O roteiro de 19/10 foi concluído em 20 e 21/10 (detalhe no `HISTORICO.md` do Drive). No ar: site `df79b202`, robô `7b99c0c1`, Palco `1e310dd8`.

**Testes do Paulo (pediu para fazer outra hora).** Ao voltar, pergunte quais ele já fez e confira o que der no banco:
1. **Gestão do site:** abrir as abas Cupons, Recuperação e WhatsApp e ver se algo ficou estranho. Elas mudaram por dentro em 21/10, com a divisão dos arquivos grandes; o comportamento deveria ser o mesmo.
2. **Equipe:** remover um membro e conferir que ele perde o acesso à gestão.
3. **SAIR do WhatsApp:** tocar em "Não quero receber" num lembrete. Depois eu confiro a tabela `descadastros` e o carrinho.
4. **Palco ao vivo:** partes no lugar certo, pulo natural, guia anunciando o destino e fader de rampa, inclusive durante o crossfade.
5. **Acesso da compra:** na próxima venda real, o acesso deve chegar uma vez só (`compras.acesso_enviado_em` preenchido).

**Frentes grandes, cada uma em sessão própria:**
- **Next 16 no site.** O Next 15 saiu do suporte em 21/10; o build só passa por causa da opção `--dangerouslyUseUnsupportedNextVersion` no painel da Cloudflare. Planejar antes de fazer.
- **Palco:** dividir `app/src/audio/motores.ts`, que exige plano e prova de áudio; consertar o teste instável do potenciômetro (ver `tasks/todo.md` do Palco).

## Plano de SEO (`tasks/plano-seo.md`), iniciado em 21/10/2026

Branch `seo-fase-a`. Uma fase de cada vez, com prova e OK do Paulo antes de seguir.

### Fase A: correções rápidas (no ar em 21/10, versão `ef4df588`, commit `0cad938`)
- [x] **1.1 Drive:** o passo 1 do "Do download ao domingo" (`lib/tools.js`, usado na home e na `/como-usar`) dizia que o acervo abre no Google Drive. Trocado pelo texto do plano. Antes, a busca por "Drive" achava esse texto visível ao cliente e mais 5 comentários de código. Depois, só os 5 comentários (`app/api/acesso`, `lib/arquivos.js`, `lib/artists.js`, `lib/catalog.js`, `lib/safe.js`).
- [x] **1.2 www e http:** feito pelo Paulo no painel da Cloudflare em 21/10 (Always Use HTTPS e a regra "www para raiz", 301 com query string). Prova por `curl`: `https://www…/musicas/unico-fernandinho` responde 301 para `https://trilhaviva.org/musicas/unico-fernandinho`; `http://trilhaviva.org/` responde 301 para `https://trilhaviva.org/`; `https://www…/musicas?cat=Adoração` responde 301 e mantém o `?cat=`; `http://www…` chega com 1 salto só. Fluxos conferidos sem criar dados: `/`, `/assinar` e `/entrar` respondem 200, e `/acervo` manda para o login (307); checkout vazio volta 400 "Informe seu nome."; login vazio volta 400; o webhook recusa pedido sem assinatura (400). Link do Zorcha (Drive): 200 e abre o ZIP da Morada. Falta o Paulo conferir no painel do Mercado Pago que a URL do webhook é `https://trilhaviva.org/...` (o código não manda `notification_url`).
- **Decisão nova do Paulo (21/10), muda o item 5 do plano:** o Zorcha continua mandando o link do Drive no Instagram, sem mudança. No site, `/vs-gratis` é só uma página com a VS grátis. Ao clicar em baixar, ela pede nome, e-mail e número (WhatsApp) e, informados, libera o download na hora, na própria tela. Isso substitui o "download só pelo e-mail" do 5.1/5.2, e o WhatsApp deixa de ser opcional. Aplicar na Fase D.
- [x] **1.3 Redirecionamentos:** `data/redirects.json` com 197 slugs antigos, tirados do histórico do git do catálogo: 55 vão para a música, 104 para o artista e 38 para `/musicas`. A regra de correspondência fica em `scripts/achar-redirects.mjs`, e a revisão linha a linha em `tasks/redirects-revisao.csv`. Prova local (`next start`): os 10 endereços do Google respondem 301 para uma página 200; slug desconhecido continua dando 404.
- [x] **1.4 Sitemap:** `lastmod` real (`data/lastmod.json`, tirado do histórico), artista = maior data das músicas, páginas fixas com data constante, sem `changefreq`/`priority`. São 1.938 endereços (1.563 músicas, 362 artistas, 9 páginas, 4 posts), sem divisão porque fica abaixo de 2.000. As 1.563 músicas reúnem 1.819 arquivos, porque as versões de tom/ao vivo ficam na mesma página. Os 1.613/1.822 do plano são o catálogo de 22/09, antes de juntar duplicatas. Prova local: `checar-sitemap` deu 1.938 respostas 200, 0 de 3xx e 0 de 4xx.
- [x] **1.5 Metadados sociais:** o `twitter` do layout perdeu título e descrição, e o Next passa a copiar os do `og` de cada página. `/blog`, `/faq`, `/artistas`, `/termos` e `/privacidade` ganharam `openGraph` próprio. Antes, herdavam o `og:url` da home. Conferido em home, música, artista, blog, artigo e FAQ.
- **Regra para o futuro:** sempre que um slug mudar, a linha entra no `data/redirects.json` (rodar `scripts/achar-redirects.mjs` depois de gerar o catálogo). Isso está anotado no `leia-me.txt` do gerador e no `docs/architecture.md`.
- **Publicação:** o build automático da Cloudflare NÃO disparou nos pushes de `6b9a573`, `f4891fa` e `81fb680`: eles não aparecem no painel nem como Failed, então o aviso do GitHub não chegou. Ele só voltou com um commit vazio (`0cad938`, "chore: dispara build da Fase A"): Ready em 2m57s, versão `ef4df588`, no ar às 13:46. Se um push não gerar build, o primeiro recurso é um commit vazio, e a publicação manual fica como reserva.
- **Provas em produção (21/10, depois do deploy):** os 10 endereços do Google respondem 301 para uma página 200. Pelo `www` chegam em 2 saltos, com 200 no fim. Slug desconhecido dá 404. Os 3 `curl` do 1.2 continuam certos. A home não tem mais "Google Drive", e o passo novo aparece na home e na `/como-usar`. `og:url` e `twitter:title` estão certos em home, música, artista, blog, artigo e FAQ. O sitemap não tem `changefreq`/`priority`, e `checar-sitemap https://trilhaviva.org` deu 1.938 respostas 200, 0 de 3xx e 0 de 4xx/5xx. Fluxos: `/`, `/assinar` e `/entrar` respondem 200; `/acervo` manda para o login (307); checkout, login e webhook respondem como antes (400 para pedido vazio ou sem assinatura). O link do Zorcha responde 200.
- [x] **Paulo (21/10):** o webhook do Mercado Pago está em `https://trilhaviva.org/api/mercadopago/...`, e as entregas de hoje deram 200. Sitemap reenviado no Search Console e "Validar correção" iniciada em 404 e em canônica alternativa. Conferir a evolução no Search Console daqui a 4 e 8 semanas (tabela "Como vamos medir" do plano).
- [x] **Revisão do `tasks/redirects-revisao.csv` (Paulo, 21/10):** 9 destinos corrigidos à mão, que iam para `/musicas` ou para o artista: os 5 de Thamiris → Thamires Garcia, `sou-casa-kleberson-kollins` → Klebson Kollins, `o-grande-eu-sou-nazareno` → `...-central-music`, `vitorioso-gabi-sampaio` → `vitorioso-es-gabi-sampaio` e `santo-espirito-nivea-soares-jesus-culture` → `santo-espirito-jesus-culture`. O resto fica como está, inclusive `caminho-fernandinho` → `caminho-no-deserto-fernandinho`. **Regra do Paulo:** não redirecionar para a versão de outro artista com o mesmo título; nesse caso, o destino certo é a página do artista. Rodar `achar-redirects.mjs` de novo mantém as linhas corrigidas à mão. No ar com o commit `4b52eec` (build automático disparou desta vez). Prova em produção: os 9 respondem 301 para uma página 200.

### Fase B: levantamento de BPM, tom, duração e canais (branch `seo-fase-b`, PARE E MOSTRE)
- Scripts em `scripts/levantamento/` (README lá). Leem os arquivos do B2 por pedaços (Range), com uma chave só de leitura no `.env.local` (`B2_KEY_ID`/`B2_APP_KEY`, criada pelo Paulo em 21/10). O cache fica em `%TEMP%\tv-levantamento` e permite retomar. Rodada completa em 21/10, em blocos na frente da conversa, porque o Claude Code parava o processo em segundo plano por falta de memória. Foram cerca de 5 GB.
- Saída: `data/levantamento.json` (por música, uma entrada por arquivo), `tasks/levantamento-musicas.csv` e `tasks/levantamento-nao-reconhecidos.csv`.
- Resultado das 1.563 músicas: **BPM 985 (63,0%)**, tom 793 (50,7%), canais 1.485 (95,0%), duração 1.031 (66,0%). O BPM vem do nome em 881 arquivos, do clique em 194 e de clique+nome em 36. O tom vem só do nome: o tom pelo áudio ficou fora desta rodada.
- A meta do plano (90% com BPM) não foi atingida, e a causa está nos dados: dos 1.819 arquivos, 421 são RAR compactados, que não dão para ler pelo clique sem baixar inteiros. Além disso, em 208 músicas o clique fica entre dobro e metade (ex.: 70 ou 140) e o BPM fica vazio de propósito. Nenhum dado foi inventado.
- Faixas não reconhecidas: 2.615 de 23.155 (11,3%), a maioria `Loop`, `FX` e mixes completos. Banjo, Mandolin, Baritone, Hammond, Mellotron, Bajo (baixo em espanhol) e outros esperam a decisão do Paulo.
- [x] **Paulo (21/10):** a amostra de 20 músicas sorteadas está certa.
- [x] **Paulo (21/10):** o MultiTracks sozinho vale como fonte.
- [x] **Paulo (21/10), canais:** cada instrumento ganha a própria categoria, sem ser juntado a outro: Órgão (Hammond), Sintetizador (synth, SYNT), Mellotron, Banjo, Bandolim (Mandolin), Dulcimer e Lap Steel. Loop vira "Loops" e FX vira "Efeitos". Bajo (espanhol) = Baixo. Mixes completos (Master, VS, BASE) continuam fora. Faixas não reconhecidas agora são 1.505 de 23.155 (6,5%), quase todas com nome de gravador ou ambíguas (Baritone, Guilde, `other`).
- **Ordem combinada com o Paulo (21/10):** 1) Fase C sem a prévia de áudio (2.2, 2.4, 2.5 e 2.6); 2) página de Natal (Fase E, prazo 31/10); 3) página VS Grátis (Fase D, com a regra nova: o formulário libera o download na hora); 4) prévia de áudio (2.3, que exige chave de escrita do B2 e pasta pública, com OK do Paulo).
### Fase C, parte 1 (sem a prévia de áudio): no ar em 21/10 (commit `1468e33`, build automático)
- **Provas em produção:** as 5 páginas respondem 200, com a ficha e a duração certas; a âncora `#mudar-tom-e-bpm` existe; o sitemap deu 1.938 respostas 200. Checkout, login e webhook respondem como antes, e o link do Zorcha responde 200. Lighthouse no celular depois da mudança: nota 97 (antes 98), LCP de 2,0 a 2,1 s (antes 1,8 a 2,0), TBT de 120 a 140 ms (antes 100 a 110), CLS 0,001. A piora é pequena, dentro da variação, e fica anotada.
- [ ] **Paulo:** no Search Console, pedir indexação das 5 URLs (Inspeção de URL) e rodar o Teste de pesquisa aprimorada (search.google.com/test/rich-results) nelas.
- **Ficha (`lib/ficha.js`, gerado):** 1.499 músicas com algum dado; BPM 1.177, tom 1.047, duração 1.017, canais 1.342. Os canais só aparecem quando ≥ 80% das faixas do arquivo foram reconhecidas. A duração vem só do arquivo, nunca do MultiTracks.
- **Página de música (2.2, 2.4, 2.5):** a trilha de navegação passou a incluir o artista. O H1 vem com link para o artista. A linha da ficha mostra só os campos com dado, com o aviso "podem ser alterados no seu programa", que leva para `/como-usar#mudar-tom-e-bpm`. O botão de compra subiu. Entram ainda o H2 "BPM e tom de X" (ou "Sobre a multitrack de X") com 2 parágrafos, a lista real de canais, as frases de uso escolhidas pelas regras do item 8 (3 variações por frase, escolhidas pelo slug) e as relacionadas, que priorizam o mesmo artista com BPM ±8. Título e descrição seguem o 2.4, e o `MusicRecording` ganhou `duration`. "Ouça a prévia" só entra quando a prévia existir. A frase sobre o momento do culto só aparece em Adoração, Celebração e Ministração, porque "Congregacional" é o valor padrão do catálogo.
- **`/como-usar#mudar-tom-e-bpm` (2.6):** a seção nova fica em `components/MudarTomBpm.jsx`. Os passos foram conferidos na documentação oficial em 21/10: guia do REAPER v7.81, manual do Ableton Live 12 (o controle é "Pitch") e ajuda do Prime. No Prime, só o passo do tom está documentado; o andamento ficou como orientação geral.
- **Sitemap:** as músicas passam a ter `lastmod` = 21/10 (`MODELO_DA_MUSICA` em `app/sitemap.js`), porque a página mudou para todas.
- **Provas locais (`next start`):** as 5 páginas do plano (Galileu 116 BPM C#; Nada Além do Sangue 77 BPM; Dono da Minha Afeição 74 BPM C; Único 73 BPM Bb; Nunca Foi Sobre Nós 124 BPM C) saíram com título, descrição, ficha, duração ISO e artista na trilha certos. Duas vizinhas do mesmo artista (Galileu e Único) mostram parágrafos diferentes. A VS MP3 e a música sem dado aparecem certas. A âncora foi testada no clique, no celular (Pixel 7) e no computador. Lighthouse da página no ar, antes da mudança: nota 98 no celular, LCP de 1,8 a 2,0 s, CLS 0. Falta medir depois de publicar e rodar o Teste de pesquisa aprimorada do Google.

- **Fase B concluída** na branch `seo-fase-b` (não publicada: são dados e scripts, que a página só usa na Fase C).
- **Decisão do Paulo (21/10), muda a regra "só dado do arquivo" do plano:** o BPM e o tom que faltam vêm de pesquisa na internet. Só entra o dado que o arquivo não traz (o do arquivo sempre vence) e só quando 2 fontes independentes concordam (BPM ±2, mesmo tom); senão, fica vazio. Na página, aparece igual ("Tom original", com o aviso de que pode ser alterado na DAW). Internamente fica marcado `fonte = pesquisa`, com as URLs, em `data/pesquisa-bpm-tom.json`.
- **Resultado da pesquisa (21/10):** a busca geral na internet rendeu pouco. Em cerca de 245 músicas, ficaram 1 BPM e 4 tons, e o limite de 200 buscas por sessão do Claude Code acabou. A pedido do Paulo, a fonte passou a ser o **MultiTracks.com** (`scripts/levantamento/multitracks.mjs`): o sitemap de músicas é casado com o catálogo por artista e título normalizados, e a página da música dá Key, BPM, compasso e duração. O `robots.txt` permite, e o script faz 1 pedido a cada 1,5 s. Das 883 músicas com algo faltando, 315 casaram; 193 ganharam BPM e 253 ganharam tom. Álbuns que discordam deixam o campo vazio. Conferência com 30 músicas que já tinham dado do arquivo (`tasks/multitracks-conferencia.csv`): tom 13 de 13 (F# = Gb), BPM 10 de 13 exatos, 2 pela metade (meio tempo) e 1 por pouco (130 contra 135). O MultiTracks sozinho vale como fonte, e o Paulo pode vetar.
- **Cobertura agora:** BPM em 1.178 músicas (75,4%) e tom em 1.046 (66,9%).

## Segurança: revisão de base de 19/10 (relatório privado em `~/tv-backups/seguranca/2026-10-19-baseline.md`)
- [x] 3 achados médios consertados com teste e publicados (19/10).
- [x] 5 achados baixos tratados em 20/10: B-1 aceito pelo Paulo; B-2 checkout/carrinho usam `cf-connecting-ip` (falta freio de cupom no D1 ou regra de rate limit da Cloudflare); B-3 carrinho pago não revela dados; B-4 aceito (reenvio é idempotente, prazo arriscaria reenvios legítimos); B-5 `/api/baixar` recusa `Sec-Fetch-Site` de outro site. Revisão do Codex: nenhum problema real.
- [x] Stripe desativada (Paulo, 20/10): sem filtro a aplicar.

## Ferramentas (19/10)
- [x] Exclusão do Defender feita (20/10); conferir se o build caiu de ~50 min. Antes: exclusão do Defender para `C:\dev` (administrador). O `~/tv-build` foi removido em 19/10.
- [x] Robô `whatsapp-acesso-meta` publicado em 19/10 (versão 6358fe4b, commit 064ec7a): recusa de token/acesso pela Meta não encerra o WhatsApp do carrinho; 1 e-mail de aviso por dia. A coluna da migração `0015` já existia em produção (aplicada em 08/10 com o número antigo); backup em `~/tv-backups/d1-antes-0015.sql`.
- [x] E-mail de aviso com chave de idempotência do dia (20/10).

## Conferido em 20/10 (resolvido pelo uso real, sai da lista)
- `acesso_liberado` ligado e provado na compra de teste 91.
- Cartão e Pix provados por vendas reais: 19 no cartão e 22 no Pix até 20/10, chegando à Meta (`meta_status=ok`).
- Recuperação por e-mail rodando: 24 lembretes da 1ª etapa e 14 da 2ª.
- WhatsApp em sequência ativo desde 04/10, com os 3 modelos aprovados e as 3 etapas saindo.
- Número real e ligação sem deploy em uso (`whatsapp_estado=ativo`).
- Coluna WhatsApp em Clientes no ar (`components/gestao/ClientesTabela.jsx`).
- Acesso do Rafael reenviado em 03/10 (registro `acesso_reenviado`).
- `CUPOM_TESTE` não existe mais no `www`.

## Ainda aberto
- [ ] **URGENTE: build automático quebrado desde 21/10.** O OpenNext recusa Next 15 (2 anos do lançamento, 21/10/2024). Todo push na `main` falha no Workers Builds. Publicado à mão em 21/10 (www `40ce34ce`) com `npx opennextjs-cloudflare build --dangerouslyUseUnsupportedNextVersion && npx opennextjs-cloudflare deploy`. Paulo pôs a opção no comando de build do painel em 21/10. Falta o definitivo: subir para Next 16 (o 15 deixa de receber consertos de segurança).
- [x] Compra 10 (`mp_179645402809`, Kaylan) marcada como teste em 20/10 (Paulo confirmou).
- [ ] Prova da Equipe: removido perde o acesso (Paulo vai testar em 20/10). Membro novo e troca de senha já ocorreram (Kaylan, 24/09).
- [ ] SAIR do WhatsApp nunca foi usado em produção (`descadastros` vazio). Paulo deu OK em 20/10: falta ele tocar em "Não quero receber" num lembrete e eu conferir.
- [x] Verificação da empresa na Meta: feita (Paulo, 20/10).
- [x] CPU conferida em 20/10 (7 dias, API GraphQL): www 48.289 pedidos, 0 erros, p50 8 ms, p99 311 ms, nenhum `exceededCpu`; robô 1.055 rodadas, 0 erros, máx. 30 ms.
- [x] Entrega do acesso idempotente no ar em 21/10 (commits `4f7a363`, `bc0b61f`, `dc5b917`; migração 0016 aplicada antes, backup em `~/tv-backups/d1-compras-antes-0016.sql`). Prova: próxima compra real recebe o acesso uma vez.
- Reembolso: ADIADO por decisão do Paulo (24/09).
- Futuro: o Direct do Instagram e o Messenger não chegam à gestão (são outros canais).
- Detalhes antigos: `arquivo/2026-10-02-whatsapp-pela-api-oficial-da-meta.md`, `arquivo/2026-09-24-menu-de-gestao-plano-e-andamento.md`, `arquivo/2026-10-12-*.md`.

## Se as vendas caírem
- Tornar o WhatsApp opcional no checkout. A decisão de 03/10 foi manter obrigatório por enquanto.
