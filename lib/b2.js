// Conversa com o Backblaze B2, onde o acervo mora.
//
// MUDANÇA DE 15/09: o arquivo da música NÃO PASSA MAIS pelo site.
//
// Até aqui o Worker lia a resposta do B2 e repassava o fluxo de bytes pro
// cliente. A ideia (registrada abaixo, na função linkDeDownload) era que
// repassar em fluxo não custa processamento. Os logs do Worker provaram o
// contrário: "Worker exceeded CPU time limit" toda vez que alguém baixava
// uma música, matando o download no meio — por isso o mesmo arquivo saía
// com um tamanho diferente e corrompido a cada tentativa. O plano gratuito
// da Cloudflare dá poucos milissegundos de CPU por visita, e passar um
// arquivo de centenas de MB por essa cota estoura ela quase na hora.
//
// A partir de agora o site só CONFERE quem é, se comprou e a cota — depois
// gera um link do PRÓPRIO Backblaze que expira em poucos minutos
// (b2_get_download_authorization) e manda o navegador direto pra lá. O
// Worker nunca chega a tocar nos bytes do arquivo, então não tem CPU pra
// estourar. O link continua "nosso": só existe depois dessas conferências,
// e morre sozinho pouco depois de ser gerado.
//
// Isso muda o equilíbrio de custo: a saída de dados deixa de ser
// automaticamente grátis (o desconto da Cloudflare/Backblaze só vale
// quando o arquivo atravessa a rede da Cloudflare). Continua barata mesmo
// assim (centavos por GB depois do que o B2 já dá de graça por mês), e um
// produto que chega corrompido custa muito mais caro em reembolso e
// confiança. Se o volume crescer, dá pra recuperar a saída grátis
// colocando um domínio próprio na frente do balde, proxiado pela
// Cloudflare — sem mudar nada deste arquivo.
//
// CORREÇÃO DE 16/09: o link gerado acima nascia recusado pelo B2
// ("bad_auth_token", 401, e o navegador ainda pedia usuário e senha do
// Backblaze). Motivo: o nome bonito do arquivo ia na URL como
// b2ContentDisposition, mas NÃO ia junto no pedido da autorização. A regra
// do B2 é que os dois têm que bater — um link que carrega um
// b2ContentDisposition que a autorização não previu é um link inválido. E
// o formato antigo (filename*=UTF-8'') não serve nem pra tentar: o B2 não
// aceita nome de parâmetro com '*' na autorização. Agora o mesmo texto
// vai nos dois lugares, em ASCII simples e entre aspas.

const AUTH_URL = 'https://api.backblazeb2.com/b2api/v3/b2_authorize_account'

// A autorização do B2 vale 24h. Guardamos em memória para não pedir outra a
// cada download — cada pedido extra é tempo que o cliente espera olhando a
// tela. Some quando o servidor recicla, e aí pede de novo. É o esperado.
let cache = null

export function b2Configurado() {
  return Boolean(process.env.B2_KEY_ID && process.env.B2_APP_KEY)
}

export function balde() {
  return process.env.B2_BUCKET || 'trilha-viva-acervo'
}

async function autorizar() {
  if (cache && cache.expira > Date.now()) return cache

  const id = process.env.B2_KEY_ID
  const chave = process.env.B2_APP_KEY
  if (!id || !chave) return null

  const res = await fetch(AUTH_URL, {
    headers: { Authorization: 'Basic ' + btoa(id + ':' + chave) },
  })
  if (!res.ok) {
    console.error('b2 authorize', res.status, (await res.text()).slice(0, 200))
    return null
  }
  const d = await res.json()

  // A v3 devolve o endereço dentro de apiInfo.storageApi; versões anteriores
  // devolviam na raiz. Aceitamos os dois para não quebrar numa atualização.
  const api = d?.apiInfo?.storageApi
  const downloadUrl = api?.downloadUrl || d?.downloadUrl
  const apiUrl = api?.apiUrl || d?.apiUrl
  if (!d?.authorizationToken || !downloadUrl || !apiUrl) {
    console.error('b2 authorize: resposta sem token ou endereço')
    return null
  }

  // bucketId só vem pronto na resposta quando a chave de aplicativo é
  // restrita a um único balde (é o nosso caso). Se um dia trocarem por uma
  // chave sem essa restrição, dá pra declarar B2_BUCKET_ID nas variáveis do
  // Worker que este código usa esse valor no lugar.
  const bucketId = api?.bucketId || process.env.B2_BUCKET_ID || null

  cache = {
    token: d.authorizationToken,
    downloadUrl,
    apiUrl,
    bucketId,
    expira: Date.now() + 20 * 3600 * 1000,
  }
  return cache
}

// Pede ao B2 um token que autoriza baixar UM arquivo (fileNamePrefix exato,
// não um prefixo de pasta) por um tempo curto. É esse token, colado na URL,
// que faz o link do Backblaze funcionar sem exigir login no B2 — e some
// sozinho depois de expirar.
//
// `disposicao` é o nome bonito do arquivo. Quando vai aqui, o MESMO texto
// tem que ir na URL do download; quando não vai, a URL também não pode
// levar. Qualquer diferença entre os dois e o B2 devolve 401.
async function autorizacaoDeDownload(caminho, segundos, auth, disposicao) {
  if (!auth?.bucketId) {
    console.error('b2 autorizacaoDeDownload: sem bucketId (defina B2_BUCKET_ID se a chave nao for restrita a um balde)')
    return null
  }

  const corpo = {
    fileNamePrefix: caminho,
    validDurationInSeconds: segundos,
  }
  if (disposicao) corpo.b2ContentDisposition = disposicao

  const pedir = (a) =>
    fetch(a.apiUrl + '/b2api/v3/b2_get_download_authorization', {
      method: 'POST',
      headers: { Authorization: a.token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucketId: a.bucketId, ...corpo }),
    })

  let res = await pedir(auth)
  if (res.status === 401) {
    cache = null
    const auth2 = await autorizar()
    if (!auth2) return null
    res = await pedir(auth2)
  }
  if (!res.ok) {
    console.error('b2 download authorization', res.status, (await res.text()).slice(0, 200))
    return null
  }
  const d = await res.json()
  return d?.authorizationToken || null
}

function caminhoCodificado(caminho) {
  return String(caminho)
    .split('/')
    .map((parte) => encodeURIComponent(parte))
    .join('/')
}

// O nome do arquivo como ele pode ir dentro de um cabeçalho
// Content-Disposition que o B2 aceite: ASCII imprimível, sem aspas e sem
// barra invertida. "André" vira "Andre" — a alternativa (filename*=UTF-8'')
// é justamente o formato que o B2 recusa na autorização, porque tem '*' no
// nome do parâmetro.
//
// Comparação por número do caractere de propósito: sequência de escape em
// expressão regular já se corrompeu no caminho até o repositório neste
// projeto, e aqui não precisa de nenhuma.
function nomeSimples(texto) {
  const cru = String(texto).normalize('NFD')
  let saida = ''
  for (const c of cru) {
    const n = c.codePointAt(0)
    if (n < 32 || n > 126) continue // acento solto, emoji, caractere de controle
    if (n === 34 || n === 92) continue // aspas e barra invertida
    saida += c
  }
  saida = saida.trim()
  return saida || 'multitrack.zip'
}

// O link que o cliente segue pra baixar a música de verdade, direto do
// Backblaze. `nomeArquivo` vira o b2ContentDisposition — é o que faz o
// arquivo chegar como "Artista - Música.zip" em vez do nome cru do balde.
// `segundos` curto de propósito: o link não precisa durar, só precisa
// funcionar no instante em que o navegador clica nele.
export async function linkDeDownload(caminho, nomeArquivo, segundos = 300) {
  const auth = await autorizar()
  if (!auth) return null

  const disposicao = 'attachment; filename="' + nomeSimples(nomeArquivo) + '"'

  let token = await autorizacaoDeDownload(caminho, segundos, auth, disposicao)
  let disposicaoUsada = disposicao

  // Se o B2 implicar com o nome, o download não pode morrer por causa
  // disso: vale muito mais entregar a música com o nome cru do balde (que
  // já é "Artista - Musica - Tom - BPM.zip") do que não entregar.
  if (!token) {
    console.error('b2: autorizacao com nome de arquivo recusada, tentando sem')
    token = await autorizacaoDeDownload(caminho, segundos, auth, null)
    disposicaoUsada = null
  }
  if (!token) return null

  // Montado à mão, e não com URLSearchParams, porque ele escreve espaço
  // como '+' — e o texto do b2ContentDisposition tem que chegar ao B2
  // idêntico ao que foi pedido na autorização.
  let q = 'Authorization=' + encodeURIComponent(token)
  if (disposicaoUsada) q += '&b2ContentDisposition=' + encodeURIComponent(disposicaoUsada)

  return auth.downloadUrl + '/file/' + balde() + '/' + caminhoCodificado(caminho) + '?' + q
}

// Devolve a resposta do B2 como ela é, com o corpo em fluxo. Só serve para
// arquivos pequenos (o mapa do catálogo) — para música, use linkDeDownload:
// arquivo grande em fluxo pelo Worker foi o que estourava o limite de CPU.
export async function abrirArquivo(caminho, range) {
  const auth = await autorizar()
  if (!auth) return null

  const url = auth.downloadUrl + '/file/' + balde() + '/' + caminhoCodificado(caminho)
  const cabecalhos = { Authorization: auth.token }
  // Repassar o Range é o que permite retomar um download interrompido — num
  // arquivo de 400 MB no 4G da igreja, isso importa.
  if (range) cabecalhos.Range = range

  const res = await fetch(url, { headers: cabecalhos })

  // Token vencido antes da hora: descarta e tenta uma vez só.
  if (res.status === 401) {
    cache = null
    const auth2 = await autorizar()
    if (!auth2) return null
    const cab2 = { Authorization: auth2.token }
    if (range) cab2.Range = range
    return fetch(auth2.downloadUrl + '/file/' + balde() + '/' + caminhoCodificado(caminho), {
      headers: cab2,
    })
  }

  return res
}

// Le um objeto pequeno do balde como texto. Usado so para o mapa do catalogo
// (_catalogo/arquivos.json) -- nunca para musica, que e' repassada em fluxo
// por abrirArquivo e jamais entra na memoria.
export async function lerTexto(caminho) {
  const res = await abrirArquivo(caminho, null)
  if (!res || !res.ok) {
    console.error('b2 lerTexto', caminho, res?.status)
    return null
  }
  return res.text()
}
