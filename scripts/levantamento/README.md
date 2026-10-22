# Levantamento de metadados

Não modifica o catálogo nem publica o site. Valores ausentes ou conflitantes ficam nulos. Usa apenas Node e os executáveis ffmpeg/ffprobe já instalados (devem estar no PATH).

## Executar somente o piloto

Na raiz do projeto:

```powershell
node --env-file=.env.local scripts/levantamento/rodar.mjs --piloto
```

Seleciona os seis slugs solicitados e vinte adicionais. Sorteio com semente `20261021`, ordenação inicial por slug, pelo menos cinco extras com RAR. Slug solicitado ausente no mapa aparece com erro explícito; não substituímos por outra música.

Filtros opcionais: `--limite N` limita slugs (todas as versões desses slugs são examinadas); `--slugs a,b,c` escolhe slugs. Sem seleção explícita, o programa recusa executar. Nesta entrega, não executar o acervo inteiro.

## Reprocessar sem rede

```powershell
node scripts/levantamento/rodar.mjs --reprocessar
```

Recalcula a última seleção usando os bytes e o PCM guardados. Não lê credenciais, não autoriza no B2 e não faz HEAD/Range. Também aceita `--piloto`, `--slugs a,b,c` e `--limite N` para selecionar dentro do cache. Cache ausente ou incompleto interrompe a execução antes de substituir os resultados existentes; nunca tenta a rede como alternativa.

**O checkpoint antigo (versão 1) contém apenas resultados.** Ele não permite recuperar bytes de índice ou áudio que não foram guardados. Uma primeira execução com a versão nova, pelo Claude com rede, precisa preencher o cache:

```powershell
node --env-file=.env.local scripts/levantamento/rodar.mjs --piloto
```

Depois dessa coleta, os reprocessamentos não baixam novamente. Uma execução normal com rede também reaproveita os intervalos e o PCM quando tamanho/ETag não mudaram. Se o arquivo remoto mudou, começa outro cache para aquela versão.

## Saídas e retomada

- `data/levantamento.json`: dados por slug e arquivo.
- `tasks/levantamento-musicas.csv`: uma linha por arquivo.
- `tasks/levantamento-nao-reconhecidos.csv`: nomes de faixas e ocorrências.
- `os.tmpdir()/tv-levantamento/progresso.json`: checkpoint versão 2, com mapa, seleção, tamanho/ETag, intervalos guardados e referências ao PCM.
- Arquivos `.bin` e `.pcm` nessa mesma pasta temporária: bytes originais dos índices/prefixos e clique decodificado em float32. Nada disso vai para o repositório; não guarda credenciais.
- `os.tmpdir()/tv-levantamento/resumo.json`: bytes efetivamente recebidos, tempo e totais RAR, separando entradas e pacotes.

Um pedido por vez, timeout de 60 segundos, até cinco tentativas em HTTP 429/5xx, espera exponencial e Retry-After. Exige HTTP 206 e Content-Range exato. Nunca aceita pacote inteiro. Checkpoint salvo por renomeação após cada intervalo/PCM; resultados são recalculados, sem reaproveitar análises antigas. Saídas representam somente a seleção atual e são gravadas depois do processamento.

Estimativa para o acervo inteiro é extrapolação simples por arquivo, não promessa. Não é calculada quando há resultados reutilizados. MB usa 1.000.000 bytes, inclui mapa, índices e repetições de prefixo, não inclui cabeçalhos HTTP.

## Regras e limites

- Tom só em campos após ` - ` ou após `tom`/`key`. BPM exige marcador BPM e intervalo 50–200. Evidências contraditórias deixam o campo vazio.
- Canais usam somente nome da faixa, sem usar o título da pasta. `qtd_arquivos` conta faixas de áudio, inclusive não reconhecidas; ignora `._*` e `__MACOSX`. ZIP respeita UTF-8/CP437, recupera UTF-8 válido sem flag quando há mojibake e normaliza NFC. `bip` secundário não transforma instrumento em clique. Loop/FX/vocoder/mix e outros nomes não reconhecidos continuam no relatório para revisão.
- ZIP suporta store/deflate para áudio. RAR suporta áudio apenas store; solid, multivolume e criptografados não são extraídos. Índice desconhecido vira `erro_indice`. SFX não suportado. Não valida CRC de arquivos inteiros.
- Para áudio, primeiro lê 64 KiB compactados. WAV informa duração pelo cabeçalho. Depois estima 90 segundos pela proporção compactada com folga de 50%, teto de 32 MiB compactados e 64 MiB descomprimidos. Prefixo curto pode impedir detectar BPM; não se inventa resultado.
- Clique exige 40 ataques e 80% de intervalos consistentes (±3% da mediana). Compara amplitude e energia de alta frequência: padrão alternado consistente sugere subdivisão; acento a cada quatro sugere compasso. Exige 85% de consistência por fase e contraste de 1,7. São heurísticas musicais, não prova de compasso. Conforme solicitado, pulso próximo de meio BPM cujo dobro é inteiro (por exemplo 68,5) sugere o dobro (137), desde que esteja em 50–200.
- Outra variante do mesmo slug pode confirmar uma alternativa a ±4%: `fonte_bpm = clique+nome`. Usa o valor medido, não copia o nome. Se duas alternativas forem confirmadas, deixa vazio. Nomes de outra música nunca entram no desempate; 77 não confirma 72/144.
- Se continuar ambíguo, `bpm` e `fonte_bpm` ficam nulos; `bpm_alternativas` guarda todos os candidatos no JSON e no CSV. Confiança mede regularidade, não certeza do compasso. BPM final vira inteiro somente a ±0,3; fora disso, mantém uma casa decimal.
- MP3 usa ffmpeg em pipe. Duração exige Xing/VBRI ou CBR comprovável; início uniforme sozinho não prova CBR. Sem evidência, duração vazia. AIF/FLAC/M4A contam como canais; áudio desses formatos não é analisado nesta rodada.
- Não extrai tom pelo áudio. Não usa catálogo como fonte dos valores.

## Gerar a ficha técnica do site

Depois de atualizar o levantamento e a pesquisa, execute na raiz, sem rede:

```powershell
node scripts/levantamento/gerar-ficha.mjs
```

Gera `lib/ficha.js` compacto (e `lib/ficha-dados-*.js` caso ultrapasse 90 KB). O site importa somente esse módulo, nunca os JSON de origem. `getFicha(slug)` devolve a ficha ou `null`; `CANAIS` contém os nomes na ordem de exibição.

O principal prioriza presença de BPM, tom, canais e duração, nessa ordem; empates mantêm o primeiro arquivo. BPM e tom ausentes vêm do primeiro outro arquivo com o campo, depois da pesquisa. Duração vem somente do principal; compasso, somente do MultiTracks. BPM e segundos são arredondados para inteiros.

`qtd_reconhecidos` conta faixas de áudio reconhecidas, inclusive várias faixas do mesmo canal, tanto na análise quanto no reuso do cache. Canais só aparecem com pelo menos 80% das faixas reconhecidas e nunca em VS MP3. Resultados antigos sem essa contagem ocultam os canais: reexecute o levantamento com o cache e depois gere a ficha novamente.

## Testes

```powershell
node --test tests/seo/levantamento*.test.mjs
npm test
npm run lint
npm run build
```

## Revisão após piloto — 21/10/2026

Claude executou o piloto com rede: 34 arquivos, 88 MB, 202 segundos (informado na revisão). Os três resultados foram lidos para estas correções. Esta revisão não executou o piloto nem substituiu seus JSON/CSV. O cache disponível ainda é versão 1, sem índice/PCM; precisa da primeira coleta com a versão nova antes de `--reprocessar`.

Os testes usam arquivos sintéticos e verificam o mesmo resultado por leitura inicial e reprocessamento offline. O build pode exigir `XDG_CONFIG_HOME` e `WRANGLER_LOG_PATH` em subpastas temporárias se o ambiente bloquear o diretório global do Wrangler; isso não altera configuração do projeto.
