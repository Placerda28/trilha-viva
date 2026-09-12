// Conversa com o Backblaze B2, onde o acervo mora.
//
// POR QUE O ARQUIVO PASSA PELO SITE, e não por um link direto do Backblaze:
//
// 1. Dinheiro. A saída de dados do B2 é grátis sem limite quando o download
//    passa pela Cloudflare. Num link direto ela é grátis só até 3x o que
//    guardamos por mês, e depois é cobrada por GB.
// 2. Controle. Link assinado, mesmo curto, pode ser copiado e colado num grupo
//    enquanto vale. Aqui não existe endereço do arquivo — existe o nosso
//    endereço, que só responde a quem está logado e comprou.
//
// O custo disso seria processamento, e não é: o site não lê o arquivo, ele
// repassa o fluxo. Os bytes atravessam sem nunca entrar na memória.

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
  const downloadUrl = d?.apiInfo?.storageApi?.downloadUrl || d?.downloadUrl
  if (!d?.authorizationToken || !downloadUrl) {
    console.error('b2 authorize: resposta sem token ou endereço')
    return null
  }

  cache = {
    token: d.authorizationToken,
    downloadUrl,
    expira: Date.now() + 20 * 3600 * 1000,
  }
  return cache
}

function caminhoCodificado(caminho) {
  return String(caminho)
    .split('/')
    .map((parte) => encodeURIComponent(parte))
    .join('/')
}

// Devolve a resposta do B2 como ela é, com o corpo em fluxo. Quem chama
// repassa esse fluxo ao cliente.
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
