import { setTimeout as delay } from 'node:timers/promises'

// O cliente é sequencial: nunca mantém mais de um pedido em andamento.
export async function connectB2() {
  let bytes = 0
  async function request(url, options = {}) {
    for (let attempt=0; attempt<5; attempt++) {
      let response
      try { response = await fetch(url, {...options, signal: AbortSignal.timeout(60000)}) }
      catch { throw new Error('conexao_b2_indisponivel') }
      if (response.status === 429 || response.status >= 500) {
        const retry = response.headers.get('retry-after')
        await response.body?.cancel()
        if (attempt === 4) throw new Error(`b2_http_${response.status}`)
        const seconds = Number(retry)
        await delay(Math.min(60000, Math.max(1000 * 2 ** attempt,
          Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retry) - Date.now() || 0)))
        continue
      }
      if (!response.ok) { await response.body?.cancel(); throw new Error(`b2_http_${response.status}`) }
      return response
    }
  }
  if (!process.env.B2_KEY_ID || !process.env.B2_APP_KEY) throw new Error('credenciais_b2_ausentes')
  const response = await request('https://api.backblazeb2.com/b2api/v3/b2_authorize_account', {
    headers:{Authorization:'Basic '+Buffer.from(process.env.B2_KEY_ID+':'+process.env.B2_APP_KEY).toString('base64')},
  })
  const auth = await response.json()
  const base = auth.apiInfo?.storageApi?.downloadUrl
  if (!base || !auth.authorizationToken) throw new Error('autorizacao_b2_invalida')
  const url = path => base+'/file/trilha-viva-acervo/'+path.split('/').map(encodeURIComponent).join('/')
  const headers = { Authorization: auth.authorizationToken }
  async function open(path) {
    const head = await request(url(path), {method:'HEAD',headers})
    const size = Number(head.headers.get('content-length'))
    const etag = head.headers.get('etag')
    if (!Number.isSafeInteger(size) || size < 1) throw new Error('tamanho_b2_invalido')
    return {size, etag, async read(start,length) {
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(length) || start < 0 || length < 1 || start+length > size) throw new Error('range_invalido')
      // Nunca aceitar o arquivo inteiro, nem quando o servidor ignora Range.
      if (length === size) throw new Error('arquivo_inteiro_recusado')
      const r = await request(url(path), {headers:{...headers, Range:`bytes=${start}-${start+length-1}`, ...(etag ? {'If-Match':etag} : {})}})
      if (r.status !== 206 || r.headers.get('content-range') !== `bytes ${start}-${start+length-1}/${size}`) {
        await r.body?.cancel(); throw new Error('range_nao_respeitado')
      }
      const chunks=[]; let count=0
      for await (const chunk of r.body) {
        count+=chunk.length; bytes+=chunk.length
        if (count>length) throw new Error('range_excedido')
        chunks.push(chunk)
      }
      if(count!==length) throw new Error('range_incompleto')
      return Buffer.concat(chunks)
    }}
  }
  return {open, get bytes(){return bytes}, async map() {
    const file=await open('_catalogo/arquivos.json')
    // O mapa é metadado, lido em dois intervalos, nunca um pacote musical.
    const middle=Math.floor(file.size/2)
    return JSON.parse(Buffer.concat([await file.read(0,middle),await file.read(middle,file.size-middle)]).toString('utf8'))
  }}
}
