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
async function autorizacaoDeDownload(caminho, segundos, auth) {
  if (!auth?.bucketId) {
    console.error('b2 autorizacaoDeDownload: sem bucketId (defina B2_BUCKET_ID se a chave nao for restrita a um balde)')
    return null
  }

  const pedir = (a) =>
    fetch(a.apiUrl + '/b2api/v3/b2_get_download_authorization', {
      method: 'POST',
      headers: { Authorization: a.token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bucketId: a.bucketId,
        fileNamePrefix: caminho,
        validDurationInSeconds: segundos,
      }),
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

// O link que o cliente segue pra baixar a música de verdade, direto do
// Backblaze. `nomeArquivo` vai no b2ContentDisposition — é o que faz o
// arquivo chegar como "Artista - Música.zip" em vez do nome cru do balde.
// `segundos` curto de propósito: o link não precisa durar, só precisa
// funcionar no instante em que o navegador clica nele.
export async function linkDeDownload(caminho, nomeArquivo, segundos = 300) {
  const auth = await autorizar()
  if (!auth) return null

  const token = await autorizacaoDeDownload(caminho, segundos, auth)
  if (!token) return null

  const disposicao = "attachment; filename*=UTF-8''" + encodeURIComponent(nomeArquivo)
  const params = new URLSearchParams({
    Authorization: token,
    b2ContentDisposition: disposicao,
  })

  return auth.downloadUrl + '/file/' + balde() + '/' + caminhoCodificado(caminho) + '?' + params.toString()
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
