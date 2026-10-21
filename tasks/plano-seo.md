# Plano Trilha Viva — Visibilidade no Google e vendas (itens 1 a 5)

Versão de 21/10/2026, revisão 2 (aviso de tom/BPM alteráveis na DAW e link do Zorcha mantido). Este arquivo é a especificação completa para o Claude Code executar no repositório `C:\dev\trilha-viva`.

---

## Como usar este arquivo (para o Paulo)

1. Salve este arquivo dentro do repositório, em `tasks/plano-seo.md`.
2. No terminal, abra o Claude Code na pasta do projeto e cole a mensagem abaixo:

> Leia `tasks/plano-seo.md` inteiro antes de mexer em qualquer coisa. Execute fase por fase, na ordem da seção "Ordem de execução". Ao fim de cada fase, prove que funciona (critérios de aceite da fase), registre em `tasks/todo.md` e me mostre o resultado antes de seguir. Onde o plano diz "PARE E MOSTRE", espere minha aprovação. Não invente dados: se um dado não puder ser obtido com segurança, deixe o campo fora da página.

---

## Regras de trabalho (valem para todas as fases)

- **Impacto mínimo.** Mexer só no que a tarefa pede. Não reorganizar, não renomear e não "aproveitar para melhorar" outras partes.
- **Sem gambiarra.** Se a solução certa for maior, parar e explicar antes.
- **Provar antes de marcar como concluído.** Cada item tem critérios de aceite; só marcar como feito com a prova (print, resposta HTTP, saída de teste).
- **Documentar** cada fase em `tasks/todo.md` (o que foi feito, como foi testado, o que ficou pendente).
- **Não quebrar o que vende.** O checkout (Mercado Pago), o webhook, o login (Supabase), a área do cliente, a cota de 30 downloads/dia, o e-mail de carrinho abandonado e o link da VS grátis enviado pelo Zorcha no Instagram têm de continuar funcionando. Testar esses fluxos depois de cada deploy.
- **Não inventar dados.** BPM, tom, duração e canais só aparecem na página se vierem dos arquivos reais. Nada de valor padrão ("Transponível", "Do original", "9 canais" para todas).
- **Visual.** Seguir a identidade atual: preto e branco, vermelho `#E5152D` só em detalhes e no CTA principal. Nada colorido, sem "cara de IA". No front, usar as skills `frontend-design` e `imagegen-frontend-mobile`.
- **Deploy** continua pelo push no GitHub (deploy automático na Cloudflare).

---

## Diagnóstico (dados do Google Search Console, verificados em 21/10/2026)

**Desempenho dos últimos 28 dias (21/09 a 18/10):**

| Métrica | Valor |
|---|---|
| Cliques | 294 |
| Impressões | 3,41 mil |
| CTR média | 8,6% |
| Posição média | 8,1 |

**O que as pessoas pesquisam e não clicam.** Quase todas as pesquisas que mostram o site são do tipo "[música] bpm" ou "[música] multitrack", e quase todas têm 0 clique:

| Pesquisa | Impressões | Cliques | Posição |
|---|---|---|---|
| galileu bpm | 51 | 0 | 10,2 |
| galileu fernandinho bpm | 10 | 0 | 10,9 |
| galileu multitrack | 9 | 0 | 6,7 |
| dono da minha afeição bpm | 7 | 0 | 8,9 |
| ah jesus multitrack | 6 | 0 | 7,0 |
| bpm nada além do sangue | 6 | 0 | 9,8 |
| unico fhop bpm | 6 | 0 | 10,8 |
| quem é como nosso deus bpm | 5 | 0 | 6,6 |
| como usar vs na igreja | 4 | 0 | 8,2 |

A página `/musicas/galileu-fernandinho` teve 200 impressões e CTR de só 2,5%. **Causa:** a pessoa procura o BPM, o resultado do Google não mostra BPM e a página também não tem o BPM. Resolver isso (item 2) é a maior oportunidade de tráfego.

**Indexação (relatório Páginas, atualizado em 11/10):**

| Situação | Páginas | Causa provável |
|---|---|---|
| Indexadas | 1,27 mil | — |
| Detectada, mas não indexada | 684 | O Google achou as páginas, mas ainda não achou que valem a pena: as páginas de música têm texto praticamente igual entre si |
| Página alternativa com tag canônica | 143 | O endereço `www.trilhaviva.org` e o `http://` abrem o site sem redirecionar |
| Não encontrado (404) | 12 | Músicas que mudaram de endereço (slug) sem redirecionamento |
| Excluída por noindex | 2 | Provavelmente páginas privadas (ok, só conferir) |
| Rastreada, mas não indexada | 3 | — |

Exemplos de 404 (endereços antigos que o Google ainda conhece):

```
/musicas/espirito-enche-minha-vida-4-por-1
/musicas/jesus-filho-de-deus-drive-onze-fernandinho
/musicas/vitorioso-gabi-sampaio
/musicas/1000-reasons-10-mil-razoes-matt-redman
/musicas/fez-um-caminho-pra-mim-livres-para-adorar
/musicas/faz-arder-bb-lr-casa-worship
/musicas/1000-graus-bit153-renascer-praise
/musicas/grande-e-o-senhor-inversoes-arieta-magrini
www.trilhaviva.org/musicas/algo-novo-vindo-get-worship
www.trilhaviva.org/musicas/eu-vou-viver-uma-virada-toque-no-altar
```

**Dados estruturados:** já existem e estão válidos (Organization, WebSite, Product com Offer e FAQPage na home; MusicRecording e BreadcrumbList nas músicas; MusicGroup nos artistas; BlogPosting no blog). O relatório "Snippets do produto" tem 1 item válido, 0 erros e 2 avisos ("aggregateRating" e "review" ausentes).

**Sitemap:** 1.938 endereços (1.564 músicas, 363 artistas, 5 do blog e páginas fixas). O `lastmod` de todas as músicas e artistas é a hora da requisição, então o Google não consegue saber o que mudou de verdade.

**Outros achados:**
- A página `/blog` tem `og:url` apontando para a home.
- As páginas internas usam `twitter:title` e `twitter:description` genéricos da home.
- Nenhuma página de música tem prévia de áudio.

---

## Ordem de execução

| Fase | Conteúdo | Por quê nesta ordem |
|---|---|---|
| A | Item 1 — correções rápidas (texto, redirecionamentos, sitemap) | Rápido, sem risco e destrava a indexação |
| B | Item 2.1 — levantamento de BPM, tom, duração e canais | Os itens 2, 4 e 5 dependem desses dados |
| C | Item 2.2 a 2.6 — novas páginas de música, prévia de áudio e seção "como mudar tom e BPM" | Maior ganho de tráfego |
| D | Item 5 — VS grátis com captura de e-mail | Converte o tráfego novo em contatos |
| E | Item 4.1 — página de Natal | Precisa estar no ar até 31/10 |
| F | Item 3 — ajustes nos dados estruturados | Pequeno e independente |
| G | Item 4.2 a 4.4 — página de BPM, coleções e blog | Conteúdo contínuo |

**Exceção de prazo:** se a Fase C atrasar, a Fase E (Natal) passa na frente. A página de Natal tem de estar publicada até **31/10/2026** para dar tempo de o Google indexar antes de dezembro.

---

## Item 1 — Correções rápidas (Fase A)

### 1.1 Texto errado sobre Google Drive

**Problema:** na home, bloco "Do download ao domingo", passo 1, o texto diz que o acervo abre no Google Drive. A entrega é pela área do cliente do site, música por música.

**Fazer:**
1. Procurar no repositório inteiro por "Drive", "Google Drive" e "pasta" em textos visíveis ao cliente: páginas, FAQ, termos, e-mails transacionais e e-mail de carrinho abandonado.
2. Trocar o passo 1 por:
   - **Título:** Entre na sua área e escolha a música
   - **Texto:** Depois da compra, você cria sua senha e o acervo abre na sua área do cliente. Cada música vem em um arquivo com os canais separados em WAV/MP3, mais o clique e a guia. Você baixa até 30 por dia.
3. Corrigir qualquer outra menção a Drive encontrada no passo 1 com texto equivalente.

**Aceite:** a busca por "Drive" no código só retorna resultados que não aparecem para o cliente. Mostrar a lista de ocorrências antes e depois.

### 1.2 Redirecionar www e http para o endereço principal

**Problema:** `https://www.trilhaviva.org/...` e `http://trilhaviva.org/` abrem o site em vez de redirecionar (143 páginas duplicadas no Google).

**Fazer (preferência nesta ordem):**
1. **No painel da Cloudflare, sem código:**
   - SSL/TLS → Edge Certificates → ligar **Always Use HTTPS**.
   - Rules → Redirect Rules → criar regra "www para raiz": quando o hostname for `www.trilhaviva.org`, redirecionar para `https://trilhaviva.org${path}` mantendo a query string, com status **301**.
   - Se o Claude Code não tiver acesso ao painel, ele escreve o passo a passo para o Paulo fazer e para aqui.
2. Só se a regra não for possível: tratar no Worker, no início da requisição, com redirecionamento 301 para o host `trilhaviva.org` mantendo caminho e query.

**Aceite (rodar e mostrar a saída):**
```
curl -sI https://www.trilhaviva.org/musicas/unico-fernandinho   → 301, Location: https://trilhaviva.org/musicas/unico-fernandinho
curl -sI http://trilhaviva.org/                                  → 301, Location: https://trilhaviva.org/
curl -sI "https://www.trilhaviva.org/musicas?cat=Adoração"        → 301 mantendo ?cat=
```
Depois, testar de novo checkout, login e webhook do Mercado Pago. O webhook não pode estar configurado com `www` nem com `http`; conferir a URL cadastrada no Mercado Pago.

### 1.3 Redirecionamentos 301 para músicas que mudaram de endereço

**Problema:** 12 endereços antigos dão 404 (lista no Diagnóstico). O catálogo foi revisado e alguns slugs mudaram (exemplo: `...-thamiris-garcia` virou `...-thamires-garcia`).

**Fazer:**
1. Criar um mapa `slug_antigo → slug_novo` em um arquivo de dados (ex.: `data/redirects.json`). Ele é a única fonte da verdade para redirecionamentos.
2. Preencher o mapa:
   - com os 12 endereços da lista do Diagnóstico;
   - com todo slug que existia no sitemap antigo ou no catálogo anterior e não existe mais. Se houver histórico no git do arquivo do catálogo, comparar as versões.
   - Para achar o novo slug, comparar título e artista normalizados (sem acento, minúsculas). Se não houver correspondente claro, redirecionar para a página do artista; se nem o artista existir, para `/musicas`.
3. No roteamento de `/musicas/[slug]`: se o slug não existe e está no mapa, responder **301** para o novo. Só dar 404 se não estiver no mapa.
4. Regra para o futuro: sempre que um slug mudar, adicionar a linha no mapa. Escrever essa regra em `tasks/todo.md` e no README do catálogo.

**Aceite:** os 12 endereços da lista respondem 301 para uma página que responde 200. Mostrar a saída do `curl -sI` de cada um.

### 1.4 Sitemap com datas reais

**Fazer:**
1. `lastmod` de cada música = data real da última alteração daquela música no catálogo (campo de atualização do registro ou data de upload do arquivo). Se essa data não existir no catálogo, criar o campo e preencher com a data de hoje uma única vez. A partir daí, ela só muda quando a música mudar de verdade.
2. `lastmod` de artista = maior `lastmod` entre as músicas dele.
3. Páginas fixas e blog: data da última alteração do conteúdo (constante no código, atualizada quando o texto mudar).
4. Remover `changefreq` e `priority`; o Google ignora os dois.
5. Garantir que o sitemap só lista endereços que respondem 200 (nenhum que redirecione ou dê 404).
6. Conferir a contagem: músicas no sitemap = páginas públicas de música do catálogo. Hoje são 1.564 no sitemap; explicar a diferença em relação ao catálogo (1.822 arquivos públicos / 1.613 músicas diferentes), que deve vir de versões agrupadas na mesma página. Mostrar o número final.
7. Se passar de 2.000 endereços, dividir em índice de sitemaps (`/sitemap.xml` apontando para `/sitemap-musicas.xml`, `/sitemap-artistas.xml`, `/sitemap-paginas.xml`).

**Aceite:** script que baixa o sitemap, faz requisição em todos os endereços e mostra quantos deram 200, 301 e 404. Precisa dar 100% de 200.

### 1.5 Metadados sociais das páginas internas

- `/blog`: corrigir `og:url` para `https://trilhaviva.org/blog`.
- Todas as páginas: `twitter:title` e `twitter:description` iguais ao `og:title` e ao `og:description` da própria página, e não os da home.

**Aceite:** conferir 1 página de cada tipo (home, música, artista, blog, artigo, FAQ).

### 1.6 Instagram

Sem alteração. `@trilhavivamultitracks` está correto.

### Depois do deploy da Fase A (Paulo, ou Claude pelo navegador)

No Search Console: Sitemaps → reenviar `https://trilhaviva.org/sitemap.xml`. Em Páginas → "Não encontrado (404)" → **Validar correção**. Em Páginas → "Página alternativa com tag canônica adequada" → **Validar correção**.

---

## Item 2 — Páginas de música (Fases B e C)

### 2.1 Levantamento dos dados reais de cada música (Fase B)

**Objetivo:** ter, para cada música do catálogo, BPM, tom, duração e a lista real de canais.

**Fonte:** os arquivos no Backblaze B2 (balde `trilha-viva-acervo`). Cada música é um ZIP com os canais.

**Como fazer (script local que roda uma vez e depois para músicas novas):**

1. **Canais:** ler só o índice de cada ZIP, sem baixar o arquivo inteiro. O índice fica no fim do ZIP e pode ser lido com requisições por intervalo de bytes (HTTP Range). Normalizar os nomes dos arquivos para nomes em português:

   | Nome no arquivo (exemplos) | Nome na página |
   |---|---|
   | click, clique, metronome, met | Clique |
   | guide, guia, cues | Guia |
   | drums, bateria, bat, kick, snare, overhead | Bateria |
   | bass, baixo | Baixo |
   | keys, piano, teclado, rhodes, synth | Teclado / Piano |
   | gtr, guitar, guitarra, eg, ag, violão | Guitarra / Violão |
   | pad, pads | Pads |
   | strings, cordas | Cordas |
   | brass, horns, sopros, metais | Sopros |
   | perc, percussion, percussão | Percussão |
   | vox, vocal, lead | Vocal principal |
   | bv, bgv, backing, coro, choir | Backing vocals |

   Vários arquivos que viram o mesmo nome contam como um canal na lista, mas o número total de arquivos também fica guardado. Nomes que não se encaixam em nenhuma regra vão para um relatório de "não reconhecidos" para o Paulo ver.

2. **BPM e tom pelo nome:** muitos arquivos de VS trazem BPM e tom no nome da pasta ou do arquivo (ex.: `Galileu - 72bpm - A`). Extrair com expressão regular.
   - BPM aceito entre 50 e 200.
   - Tom aceito nos formatos `A`, `Am`, `Bb`, `F#m`, `Lá`, `Lá menor`.

3. **BPM pelo áudio (se não estiver no nome):** baixar só o arquivo do clique e calcular o andamento (biblioteca Python como `librosa` ou `aubio`). O clique é um sinal limpo, então o resultado é confiável. Guardar como "fonte: clique".

4. **Tom pelo áudio (se não estiver no nome):** estimar a partir do canal de teclado/pads com análise de cromagrama. É menos confiável, então **só publicar quando a confiança for alta**; senão deixar o tom em branco e fora da página.

5. **Duração:** pela duração do arquivo de clique ou de qualquer canal (todos têm o mesmo tamanho).

6. **Saída:** salvar no catálogo (no mesmo lugar onde o catálogo do site já fica) os campos `bpm`, `tom`, `duracao_seg`, `canais` (lista), `qtd_arquivos`, `fonte_bpm`, `fonte_tom` e `confianca_tom`. Gerar também `tasks/levantamento-musicas.csv` para revisão.

**PARE E MOSTRE:** antes de publicar, mostrar ao Paulo:
- 20 músicas sorteadas com os dados encontrados (ele confere algumas que conhece);
- quantas músicas ficaram com BPM, com tom e com canais;
- o relatório de nomes de canal não reconhecidos.

**Aceite:** pelo menos 90% das músicas com BPM e canais; nenhuma com dado inventado.

### 2.2 Novo conteúdo da página de música (Fase C)

**Como deve ficar (de cima para baixo), usando Galileu como exemplo:**

1. **Navegação estrutural:** Início › Acervo › Fernandinho › Galileu.
2. **H1:** Galileu. Abaixo, o artista com link para a página dele.
3. **Ficha técnica** em uma linha de destaque, logo abaixo do H1:
   `72 BPM · Tom original: A · 5:12 · 11 canais`
   Campo sem dado não aparece (sem "—" e sem "Transponível").
   Logo abaixo da ficha, em texto menor e cinza (uma linha só):
   `Tom e BPM podem ser alterados no seu programa (REAPER, Ableton, Prime e outros).`
   Essa linha aparece sempre que a ficha mostrar BPM ou tom. A palavra "programa" leva para `/como-usar` (âncora da seção de mudança de tom e andamento, criada no 2.6).
4. **Prévia de áudio** (item 2.3).
5. **Botão principal:** "Liberar acesso vitalício por R$ 89,90", igual ao atual.
6. **H2 "BPM e tom de Galileu"** com dois parágrafos curtos e diretos, que respondem a pesquisa logo de cara:
   > Galileu, de Fernandinho, tem andamento de 72 BPM e está no tom de A na versão original. A multitrack vem com clique nesse andamento e com guia falada, então a banda entra junto sem precisar contar.
   >
   > Se o seu ministro canta em outro tom ou a equipe prefere outro andamento, dá para mudar os dois no programa que você usa para rodar a VS (DAW), como REAPER, Ableton Live ou Prime. Para o andamento, aplique a mudança em todas as faixas juntas, inclusive no clique, para tudo continuar sincronizado. Para o tom, transponha os instrumentos e os vocais, mas não o clique nem a guia. [Veja como fazer →](/como-usar#mudar-tom-e-bpm)
   - Se faltar o tom, o primeiro parágrafo sai sem a parte do tom. Se faltar o BPM, o H2 vira "Sobre a multitrack de Galileu".
   - O segundo parágrafo também usa 3 variações de texto, escolhidas pelo slug (mesma regra do item 8), mantendo sempre as duas orientações técnicas: mudar o andamento em todas as faixas juntas e não transpor clique nem guia.
7. **H2 "Canais desta multitrack"** com a lista real dos canais (substitui a lista fixa de 9 canais). O desenho lateral de canais (clique/guia no fone, resto no PA) também passa a usar a lista real.
8. **Texto de uso que varia de acordo com os dados**, montado com regras e não com IA a cada acesso, para não ficar igual em todas as páginas. Escolher 2 a 3 frases pelas regras:
   - Até 80 BPM: frase sobre música lenta, ministração, pad segurando a dinâmica e cuidado com a guia nas partes livres.
   - De 81 a 115 BPM: frase sobre andamento médio e congregacional.
   - Acima de 115 BPM: frase sobre celebração e baterista com o clique bem alto no fone.
   - Se tem Sopros, Cordas ou Percussão: frase dizendo que esses canais completam a banda que não tem esses músicos.
   - Se tem Backing vocals: frase sobre usar o backing em equipe pequena.
   - Categoria (Adoração, Celebração, Congregacional, Ministração): frase sobre o momento do culto.
   - Escrever pelo menos 3 variações de cada frase e escolher a variação pelo slug (sempre a mesma para a mesma música), para não repetir o mesmo texto em músicas vizinhas.
9. **Bloco do pacote**, igual ao atual ("Esta música vem no pacote…").
10. **Aviso sobre artistas**, igual ao atual.
11. **"Quem toca Galileu também usa"**: igual ao atual, mas, quando possível, priorizar músicas com BPM parecido (±8) e do mesmo artista.

### 2.3 Prévia de áudio de 30 segundos

**Como deve ficar:**
- Um player compacto no visual da marca: botão redondo play/pause, barra de progresso fina e tempo. Fundo preto ou branco, conforme a seção, e vermelho só no progresso.
- Dois botões de alternância acima do player: **"Banda"** (padrão) e **"Clique + guia"**.
- Sem tocar sozinho. Carregar o áudio só quando a pessoa der play (`preload="none"`).
- Funcionar bem no celular, com área de toque de pelo menos 44px.

**Geração dos arquivos (script local com ffmpeg):**
- **"Banda":** mixar todos os canais, exceto Clique e Guia. Pegar 30 s a partir do início do primeiro refrão; como não temos marcação de refrão, usar o trecho que começa em 35% da duração. Aplicar fade-in e fade-out de 1 s, normalizar em -14 LUFS e exportar MP3 estéreo 192 kbps.
- **"Clique + guia":** os mesmos 30 s só com Clique e Guia, para a pessoa ouvir que a guia avisa as partes. Mesmo formato.
- Tamanho estimado: cerca de 720 KB por arquivo, ou 2,6 GB para todo o acervo nos dois modos.
- Guardar no B2 em um prefixo público só para prévias (ex.: `previews/{slug}-banda.mp3`), servido pela Cloudflare com cache longo. O acervo completo continua privado. Conferir que o prefixo público **não** dá acesso a nenhum outro arquivo.
- Música sem prévia gerada: o player não aparece (sem player quebrado).

**Aceite:**
- Ouvir 5 prévias de estilos diferentes e confirmar que não cortam no meio de palavra e que o volume é parecido entre elas.
- No PageSpeed Insights (celular), a página de música não pode ficar mais lenta do que antes. Mostrar os números antes e depois.
- O endereço de um arquivo do acervo completo continua sem acesso público (testar com `curl`).

**PARE E MOSTRE** 3 prévias para o Paulo aprovar o trecho e o volume antes de gerar para o acervo inteiro.

### 2.4 Título e descrição no Google

**Título** (até cerca de 60 caracteres antes do nome da marca):
- Com BPM: `Galileu – Fernandinho: VS, BPM e Tom | Trilha Viva`
- Sem BPM: `VS Galileu – Fernandinho (multitrack com clique) | Trilha Viva`
- Se ficar longo demais, cortar "| Trilha Viva" antes de cortar o nome da música.

**Descrição** (até cerca de 155 caracteres):
- Com BPM e tom: `VS de Galileu (Fernandinho): 72 BPM e tom original A, ajustáveis na sua DAW. Clique, guia e 11 canais. Ouça a prévia. 2.000 VS por R$ 89,90.`
- Sem tom: `VS de Galileu (Fernandinho): 72 BPM, ajustável na sua DAW. Clique, guia e 11 canais. Ouça a prévia. 2.000 VS por R$ 89,90.`
- Sem BPM: `VS de Galileu (Fernandinho) com clique, guia e 11 canais separados. Ouça a prévia. No pacote com 2.000 VS por R$ 89,90, pagamento único.`

`og:title`, `og:description`, `twitter:title` e `twitter:description` seguem os mesmos textos.

### 2.5 Dados estruturados da música

No `MusicRecording` que já existe, acrescentar:
- `duration` no formato ISO 8601 (ex.: `PT5M12S`), só quando houver duração;
- `audio` com um `AudioObject` apontando para a prévia "Banda", só quando a prévia existir.

O `isPartOf` com o Product e a Offer fica como está. **Não** criar um Product por música, porque a música não é vendida separada.

### 2.6 Seção "Como mudar o tom e o BPM" na página Como usar

Criar em `/como-usar` uma seção nova com âncora `#mudar-tom-e-bpm`. É para onde apontam os links da ficha técnica e do parágrafo de BPM das músicas.

**Como deve ficar:**
- **H2:** Como mudar o tom e o BPM da multitrack.
- Parágrafo de abertura: o tom e o BPM informados em cada música são os da versão original; todos podem ser ajustados no programa que roda a VS.
- **H3 "Mudar o andamento (BPM)":** a mudança vale para todas as faixas ao mesmo tempo, inclusive o clique, senão a banda sai do tempo. Recomendar ajustes pequenos (até cerca de 10% para mais ou para menos), porque mudanças grandes deixam o som artificial.
- **H3 "Mudar o tom":** transpor instrumentos e vocais; **não** transpor o clique nem a guia, porque a guia falada fica com a voz estranha. Recomendar até 2 ou 3 semitons para cima ou para baixo.
- **H3 "No REAPER"**, **"No Ableton Live"** e **"No Prime"**: 3 a 5 passos curtos para cada programa.
  - O Claude Code deve **conferir os passos na documentação oficial de cada programa** antes de escrever e citar a versão consultada em comentário no código. Não escrever nome de menu ou atalho de memória.
  - Se não conseguir confirmar um passo, escrever só a orientação geral daquele programa, sem nome de menu.

**Aceite:** a âncora `#mudar-tom-e-bpm` abre a seção certa a partir de uma página de música (testar no celular e no computador).

### Aceite geral do item 2 (testar nestas páginas, que são as que o Google já mostra)

```
/musicas/galileu-fernandinho
/musicas/nada-alem-do-sangue-fernandinho
/musicas/dono-da-minha-afeicao-fhop-music
/musicas/unico-fernandinho
/musicas/nunca-foi-sobre-nos-doxologia-thamires-garcia
```

Para cada uma:
- ficha técnica e canais batem com o ZIP;
- prévia funciona no celular e no computador;
- título e descrição corretos no código-fonte;
- o Teste de pesquisa aprimorada do Google (search.google.com/test/rich-results) não mostra erro.

Comparar o texto de 2 músicas vizinhas do mesmo artista e mostrar que os parágrafos são diferentes.

**Depois do deploy:** pedir indexação dessas 5 URLs em "Inspeção de URL" no Search Console.

---

## Item 3 — Dados estruturados (Fase F)

A base já existe e está válida. Os ajustes são estes:

1. **Product da home e da `/assinar`:**
   - acrescentar `brand` (`{"@type":"Brand","name":"Trilha Viva"}`), `image` (a imagem do pacote/og) e `sku` (`trilha-viva-pacote-completo`);
   - acrescentar `hasMerchantReturnPolicy` com devolução em 7 dias, porque a garantia é de 7 dias: `returnPolicyCategory` = `MerchantReturnFiniteReturnWindow`, `merchantReturnDays` = 7, `applicableCountry` = `BR`, `returnFees` = `FreeReturn`;
   - conferir se `priceValidUntil` é uma data futura (pelo menos 31/12/2026) e não uma data fixa já vencida.
2. **ItemList** em `/musicas`, em cada `/artistas/[slug]` e nas páginas de coleção (item 4): lista ordenada com `url` e `name` de cada música mostrada.
3. **BlogPosting** dos artigos: conferir se têm `headline`, `datePublished`, `dateModified`, `author` (Organization Trilha Viva), `image` e `mainEntityOfPage`.
4. **aggregateRating e review: NÃO adicionar agora.** Só quando houver avaliações reais de compradores, que vão junto com os depoimentos (fica para depois). Avaliação inventada é contra as regras do Google e pode gerar punição manual. Os 2 avisos no Search Console são normais e ficam.

**Aceite:** home, `/assinar`, 1 música, 1 artista e 1 artigo sem erro no Teste de pesquisa aprimorada. Depois do deploy, no Search Console → Snippets do produto, continuar com 0 inválidos.

---

## Item 4 — Conteúdo novo (Fases E e G)

### 4.1 Página de Natal (prazo: no ar até 31/10/2026)

**Endereço:** `/colecoes/natal` (criar o modelo de página "coleção" reaproveitável; ver 4.3).

**Título:** `Multitracks de Natal Gospel: VS para cantata e culto | Trilha Viva`

**Descrição:** `VS de Natal com clique e guia: Ó Noite Santa, Maria Tu Sabias, Nasceu em Belém e mais. Monte a cantata da igreja. Todas no pacote por R$ 89,90.`

**Como deve ficar:**
1. **H1:** Multitracks de Natal para a sua igreja.
2. Parágrafo de abertura (cerca de 80 palavras): o Natal é a época em que a equipe mais precisa de repertório especial, e com VS uma banda pequena faz cantata completa com cordas, sinos e coro.
3. Lista das músicas de Natal do acervo, com ficha técnica (BPM, tom e canais, quando houver), prévia e link para a página de cada uma.
4. **H2 "Sugestão de setlist para a cantata"**: sequência de 6 a 8 músicas da lista, em ordem de energia (abertura animada → adoração → final congregacional), com uma linha explicando cada escolha.
5. **H2 "Como preparar a cantata com VS"**: 4 a 5 dicas práticas (ensaiar com clique 3 semanas antes, ajustar o tom ao coral, mutar o vocal da trilha quando houver coral, levar um backup em pendrive).
6. Bloco de compra igual ao das páginas de música.
7. **H2 "Perguntas sobre VS de Natal"** com 3 perguntas e marcação FAQPage: "Posso mudar o tom para o coral?", "Tem música de Natal infantil?" (responder com o que houver no acervo), "As VS de Natal estão no pacote?".

**Músicas candidatas encontradas no acervo** (o Claude Code confere no catálogo e mostra a lista final ao Paulo):

```
/musicas/a-promessa-nasceu-aline-barros
/musicas/advento-mateus-brito
/musicas/e-natal-israel-salazar
/musicas/gloria-e-aleluia-christmas-gabriel-guedes
/musicas/jesus-nasceu-jemima
/musicas/maria-saibas-que-marcus-salles
/musicas/maria-tu-sabias-fhop-music
/musicas/mary-did-you-know-maverick-city
/musicas/nasceu-em-belem-israel-salazar
/musicas/o-come-all-ye-faithful-planetshakers
/musicas/o-noite-santa-fhop-music
/musicas/o-pequeno-baterista-fhop-music
/musicas/o-vem-o-vem-emanuel-fhop-music
/musicas/oh-vem-emanuel-projeto-sola
/musicas/vem-que-esta-chegando-o-natal-aline-barros
```

Decisão tomada: `emanuel-fernandinho` e `emanuel-vitor-barreto` ficam **fora** (não são músicas de Natal). Paulo pode incluir se quiser.

**Onde linkar:**
- Na home, de 01/11 a 25/12: faixa discreta acima do acervo: "Natal chegando: veja as VS para a cantata →". Programar por data, para sumir sozinha em 26/12.
- No rodapé, na coluna "Acervo": link "Multitracks de Natal" (fixo, o ano todo).
- Nas páginas de cada música de Natal: link "Ver todas as VS de Natal".

**Aceite:** página no ar, no sitemap, sem erro no teste de dados estruturados e com a faixa da home aparecendo só no período certo (testar mudando a data no teste). **PARE E MOSTRE** a lista final de músicas e o setlist antes de publicar.

### 4.2 Página "BPM e tom das músicas"

**Por quê:** é o que as pessoas mais procuram hoje ("[música] bpm").

**Endereço:** `/bpm`

**Título:** `BPM e tom das músicas gospel: tabela com 1.500+ louvores | Trilha Viva`

**Como deve ficar:**
- H1: BPM e tom dos louvores. Parágrafo curto explicando o que é BPM e por que o baterista precisa dele.
- Logo abaixo do parágrafo, um aviso em destaque discreto: "Os valores são da versão original. Tom e BPM podem ser alterados no seu programa (DAW). [Veja como →](/como-usar#mudar-tom-e-bpm)"
- Campo de busca por música ou artista e filtro por faixa de andamento (lenta, média, rápida).
- Tabela: Música | Artista | BPM | Tom original | link "Ver VS". Ordenar por nome da música.
- Só entram músicas com BPM confirmado.
- Para não ficar pesada: a primeira carga traz a tabela completa já no HTML (para o Google ler), sem imagens; a busca filtra no navegador.
- No fim, bloco do pacote.

**Aceite:** a página carrega em menos de 3 s no celular (PageSpeed) e todos os links "Ver VS" respondem 200.

### 4.3 Coleções por momento do culto

**Modelo:** o mesmo da página de Natal (`/colecoes/[slug]`), com H1, parágrafo de abertura, lista com ficha e prévia, dicas, FAQ e bloco de compra.

**Coleções:**

| Endereço | Título (H1) |
|---|---|
| `/colecoes/santa-ceia` | Multitracks para Santa Ceia |
| `/colecoes/batismo` | Multitracks para culto de batismo |
| `/colecoes/abertura-de-culto` | Multitracks para abrir o culto |
| `/colecoes/ministracao` | Multitracks para ministração |
| `/colecoes/culto-de-jovens` | Multitracks para culto de jovens |

**Como escolher as músicas:** o Claude Code gera uma lista inicial com regras.
- Santa Ceia: título com sangue, cruz, cordeiro, ceia, calvário.
- Batismo: águas, rio, batiza, nova vida, renovo.
- Abertura: categoria Celebração com BPM acima de 110.
- Ministração: categoria Ministração ou Adoração com BPM até 80.
- Jovens: Celebração dos artistas mais atuais.

Salvar em `data/colecoes.json`. **PARE E MOSTRE** a lista de cada coleção para o Paulo aprovar; ele pode tirar e pôr músicas editando esse arquivo.

Página "Coleções" (`/colecoes`) listando todas, com link no menu "Músicas" ou no rodapé.

### 4.4 Blog — 6 artigos novos

**Regras para todos os artigos:**
- 1.200 a 1.800 palavras, linguagem simples, direta e sem jargão sem explicação.
- Estrutura com H2/H3 e uma resposta direta à pergunta do título no primeiro parágrafo.
- Pelo menos 3 links para páginas de música e 1 para `/assinar`; quando fizer sentido, link para `/vs-gratis`.
- Bloco de 3 perguntas no fim com marcação FAQPage.
- Imagem de capa própria no visual da marca.
- Nada de preço, versão de programa ou especificação técnica inventada. Se o artigo precisar de preço atual de equipamento ou programa, pesquisar na hora e citar a data da consulta, ou não citar preço.
- Cada artigo passa pela revisão do Paulo antes de publicar (**PARE E MOSTRE**).
- Publicar 1 por semana, não todos de uma vez.

| Ordem | Título | Pesquisa que queremos pegar | Pontos principais |
|---|---|---|---|
| 1 | Repertório de Natal para a igreja: setlist com VS | repertório de natal igreja, músicas de natal gospel | Publicar até 05/11. Setlist, link para `/colecoes/natal` |
| 2 | Como usar VS na igreja: guia para quem está começando | como usar vs na igreja (já aparece no Google) | Equipamento mínimo, roteamento fone/PA, primeiro ensaio, erros comuns |
| 3 | Como rodar VS no celular (Android e iPhone) | como rodar vs no celular | Limites do celular, apps possíveis, saída de áudio separada, quando vale um notebook |
| 4 | VS grátis: como baixar com segurança e testar antes de comprar | vs grátis, multitrack grátis | Riscos de sites piratas, o que conferir numa VS, link para `/vs-gratis` |
| 5 | Como mudar o tom e o BPM de uma multitrack sem perder qualidade | mudar tom vs reaper, mudar bpm vs | Passo a passo no REAPER, Ableton e Prime; limites de semitons e de andamento; não transpor clique nem guia; link para `/como-usar#mudar-tom-e-bpm` |
| 6 | Interface de áudio para igreja: o que olhar antes de comprar | interface de áudio igreja, interface para vs | Número de saídas, alimentação, latência, cabos; faixas de preço só com pesquisa atual |

Atualizar `/blog`, o sitemap e o `dateModified` a cada publicação.

---

## Item 5 — VS grátis com captura de e-mail (Fase D)

**A música grátis:** `A Alegria + O Exército de Deus + Caiam por Terra + Autoridade e Poder` (Morada), endereço atual `/musicas/a-alegria-o-exercito-de-deus-caiam-por-terra-autoridade-e-poder-morada` (responde 200). É a mesma que já é dada no Instagram.

### 5.1 Página `/vs-gratis`

**Título:** `VS Grátis: A Alegria + O Exército de Deus (Morada) | Trilha Viva`

**Descrição:** `Baixe grátis a multitrack A Alegria + O Exército de Deus + Caiam por Terra + Autoridade e Poder, com clique, guia e canais separados.`

**Como deve ficar:**
1. **Topo (escuro, como o topo da home):**
   - H1: Baixe grátis uma VS completa.
   - Subtítulo: A Alegria + O Exército de Deus + Caiam por Terra + Autoridade e Poder — Morada. Com clique, guia e cada instrumento em um canal separado.
   - Ficha técnica real (BPM, tom, duração, canais) e prévia de áudio (item 2.3).
2. **Formulário**, ao lado da prévia no computador e logo abaixo no celular:
   - Nome (obrigatório);
   - E-mail (obrigatório);
   - WhatsApp (opcional) com a frase "para receber novidades e lançamentos";
   - Caixa de consentimento (obrigatória, desmarcada por padrão): "Quero receber a VS e conteúdos da Trilha Viva por e-mail. Posso cancelar quando quiser." com link para `/privacidade`;
   - Botão vermelho: **Quero minha VS grátis**;
   - Verificação anti-robô Cloudflare Turnstile (gratuita), invisível quando possível.
3. **O que vem no arquivo:** a lista de canais.
4. **Faixa do pacote:** "Gostou? Essa é 1 de mais de 2.000. Leve o acervo inteiro por R$ 89,90." com botão secundário para `/assinar`.
5. **Mini FAQ:** "Preciso pagar algo?" (não), "Em quanto tempo chega?" (na hora, no e-mail), "Posso usar no culto?" (sim).

**Depois de enviar o formulário:**
- Tela de confirmação na mesma página: "Pronto, {nome}! Enviamos o link para {e-mail}. Confira também a caixa de spam e promoções." Mais o botão "Não chegou? Reenviar" (liberado depois de 60 s, no máximo 3 reenvios).
- O download **não** aparece na tela, só no e-mail. Isso garante que o e-mail é real.

### 5.2 Entrega do arquivo

- O link do e-mail aponta para o site (ex.: `/vs-gratis/baixar?t={token}`). O site valida o token e libera o arquivo do B2 pelo mesmo mecanismo seguro que a área do cliente já usa.
- Token único por pessoa, válido por **7 dias**, com no máximo **3 downloads**.
- Esses downloads **não** contam na cota de 30/dia de compradores e não exigem login.
- Token vencido: página explicando e com botão para pedir um link novo (reenvia para o mesmo e-mail).

### 5.3 Banco de dados

Nova tabela `leads` (no Supabase, onde já está o login, ou onde o Claude Code achar mais coerente com o projeto). Colunas:

```
id, nome, email (único), whatsapp, consentimento (bool), consentimento_em,
origem (utm_source), meio (utm_medium), campanha (utm_campaign), pagina_entrada,
criado_em, ultimo_envio_em, envios, downloads, primeiro_download_em,
comprou (bool), comprou_em, descadastrado (bool)
```

- Mesmo e-mail cadastrado de novo: atualizar o registro e reenviar o link, sem duplicar.
- Quando uma compra for aprovada (webhook do Mercado Pago), marcar `comprou = true` no lead com o mesmo e-mail.
- Proteção contra abuso: no máximo 5 cadastros por IP por hora.

### 5.4 Sequência de e-mails

Usar o mesmo serviço de e-mail do lembrete de carrinho abandonado, enviado como `trilhaviva.suporte@gmail.com` (ou o remetente já configurado). Todo e-mail tem link de descadastro, que funciona com 1 clique e marca `descadastrado = true`.

| Quando | Assunto | Conteúdo |
|---|---|---|
| Na hora | Sua VS grátis chegou 🎧 | Botão de download; lembrete de validade (7 dias); 3 passos rápidos de uso (link para `/como-usar`) |
| 2 dias depois | Conseguiu rodar a VS? | Dicas de roteamento clique/guia no fone; link para o artigo "Como usar VS na igreja"; convite para responder o e-mail se travou |
| 4 dias depois | Imagina ter 2.000 dessas | Oferta do pacote: R$ 89,90 de R$ 899,00, pagamento único, garantia de 7 dias; 5 músicas populares do acervo com link |
| 7 dias depois | Último lembrete: seu link vence hoje | Lembrete do link e oferta do pacote mais curta |

- A sequência **para** se a pessoa comprar ou se descadastrar.
- Decisão tomada: esses e-mails **não** vão com cópia oculta para o Paulo, porque o volume tende a ser alto. A cópia oculta continua só no carrinho abandonado. O Paulo acompanha pela gestão (5.6).

### 5.5 Onde divulgar a página

- **Página da própria música grátis:** trocar o botão principal por **Baixar grátis** (vai para `/vs-gratis`) e deixar o botão do pacote como secundário.
- **Home:** faixa curta antes da seção de preço: "Quer testar antes? Baixe uma VS grátis →".
- **Menu:** não incluir (o menu continua curto).
- **Rodapé:** link "VS grátis" na coluna "Trilha Viva".
- **Instagram (Zorcha): não mexer.** O link que o Zorcha envia hoje na DM continua ativo e funcionando como está (decisão do Paulo). A página `/vs-gratis` é uma porta de entrada a mais, para quem chega pelo Google e pelo site. O Claude Code não pode desativar, mover nem alterar o arquivo ou o endereço usados pelo Zorcha. Depois de cada deploy, testar esse link.
- **Artigos do blog:** o artigo 4 e os outros, quando fizer sentido.

### 5.6 Gestão

Na página de gestão que já existe, acrescentar a seção **Leads**:
- totais do período (cadastros, baixaram, compraram);
- taxa de conversão lead → compra;
- tabela com nome, e-mail, WhatsApp, origem, data, baixou?, comprou?;
- botão **Exportar CSV**.

Visível só para o Administrador Master e para os membros que ele cadastrar.

### Aceite do item 5

1. Cadastro com e-mail real → e-mail chega em menos de 1 minuto → link baixa o ZIP certo e íntegro (abrir e conferir os canais).
2. 4º download com o mesmo link → bloqueado com mensagem clara.
3. Token com data vencida (forçar no teste) → página de link vencido → pedir novo → funciona.
4. Mesmo e-mail duas vezes → 1 registro só.
5. Compra de teste com o e-mail do lead → `comprou = true` e sequência interrompida.
6. Descadastro → nenhum e-mail novo.
7. Formulário sem consentimento marcado → não envia.
8. Link com UTM → origem gravada certa no lead.
9. Checkout, login, área do cliente e cota de 30/dia continuam funcionando.
10. O link atual do Zorcha continua baixando a VS normalmente.

---

## Como vamos medir (comparar com 21/10/2026)

Conferir no Search Console 4 e 8 semanas depois de cada fase publicada:

| O que olhar | Hoje | Meta em 8 semanas |
|---|---|---|
| Páginas "Detectada, mas não indexada" | 684 | Cair pela metade |
| Páginas com 404 | 12 | 0 |
| Páginas canônicas alternativas (www/http) | 143 | Caindo até zerar |
| CTR da `/musicas/galileu-fernandinho` | 2,5% | Acima de 8% |
| Cliques em pesquisas com "bpm" | ~0 | Crescendo semana a semana |
| Cliques totais (28 dias) | 294 | Dobrar |
| Leads da VS grátis | — | Medir conversão lead → compra |

---

## Pendências e decisões (resumo)

**Já decidido (o Paulo pode mudar):**
- Músicas "Emanuel" fora da página de Natal.
- Sem cópia oculta nos e-mails de lead.
- WhatsApp opcional no formulário.
- Sem avaliação/nota no Google até existirem avaliações reais.

- O link do Zorcha continua ativo e sem alteração; `/vs-gratis` é uma entrada a mais.
- Tom e BPM aparecem como os da versão original, sempre com o aviso de que podem ser alterados na DAW.

**Pendente com o Paulo:** nada no momento.

**Pontos de aprovação (PARE E MOSTRE):**
1. Amostra de 20 músicas do levantamento de dados (2.1).
2. 3 prévias de áudio (2.3).
3. Lista final e setlist de Natal (4.1).
4. Lista de cada coleção (4.3).
5. Cada artigo do blog (4.4).
