// Envio de comprovantes de saque ao B2 (balde do site, prefixo afiliados-comprovantes/).
// Usa uma chave SÓ de escrita nesse prefixo (B2_COMPROVANTES_KEY_ID / B2_COMPROVANTES_APP_KEY),
// separada da chave de leitura do acervo. A leitura continua em lib/b2.js (linkDeDownload).
// Sem `@/`: recebe env e fetch por parâmetro (testes). CPU: o arquivo vai ao B2 como veio, sem base64 nem SHA-1.
export const PREFIXO_COMPROVANTES = 'afiliados-comprovantes/'
export const MAX_COMPROVANTE_BYTES = 5 * 1024 * 1024

const AUTH_URL = 'https://api.backblazeb2.com/b2api/v3/b2_authorize_account'

export const envioConfigurado = (env = process.env) =>
  Boolean(env.B2_COMPROVANTES_KEY_ID && env.B2_COMPROVANTES_APP_KEY)

// Tipo pelo "número mágico" (primeiros bytes), nunca pelo nome do arquivo.
export function tipoPelosBytes(b) {
  if (b.length >= 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d) {
    return { ext: 'pdf', mime: 'application/pdf' }
  }
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' }
  if (b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v)) {
    return { ext: 'png', mime: 'image/png' }
  }
  return null
}

// Caminho que o servidor gera; é o único formato aceito em "pagar".
export const caminhoDoComprovante = (saqueId, ext) => `${PREFIXO_COMPROVANTES}${saqueId}-${crypto.randomUUID()}.${ext}`
export const caminhoValido = (saqueId, caminho) =>
  new RegExp(`^${PREFIXO_COMPROVANTES}${Number(saqueId)}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](pdf|jpg|png)$`).test(
    String(caminho || ''),
  )

async function json(res) {
  try {
    return await res.json()
  } catch {
    return null
  }
}

// corpo: ArrayBuffer (ou Uint8Array). Devolve { ok: true } ou { ok: false, motivo }.
export async function enviarParaB2({ caminho, corpo, mime }, { env = process.env, fetchImpl = globalThis.fetch } = {}) {
  if (!envioConfigurado(env)) return { ok: false, motivo: 'nao-configurado' }
  try {
    const basic = btoa(`${env.B2_COMPROVANTES_KEY_ID}:${env.B2_COMPROVANTES_APP_KEY}`)
    const a = await fetchImpl(AUTH_URL, { headers: { Authorization: `Basic ${basic}` } })
    const auth = a.ok ? await json(a) : null
    const api = auth?.apiInfo?.storageApi
    const apiUrl = api?.apiUrl || auth?.apiUrl
    const bucketId = api?.bucketId || env.B2_BUCKET_ID
    if (!auth?.authorizationToken || !apiUrl || !bucketId) {
      console.error('b2-envio authorize', a.status)
      return { ok: false, motivo: 'autorizacao' }
    }
    const u = await fetchImpl(`${apiUrl}/b2api/v3/b2_get_upload_url`, {
      method: 'POST',
      headers: { Authorization: auth.authorizationToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucketId }),
    })
    const alvo = u.ok ? await json(u) : null
    if (!alvo?.uploadUrl || !alvo?.authorizationToken) {
      console.error('b2-envio get_upload_url', u.status)
      return { ok: false, motivo: 'url-de-envio' }
    }
    const e = await fetchImpl(alvo.uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: alvo.authorizationToken,
        'X-Bz-File-Name': encodeURIComponent(caminho).replace(/%2F/g, '/'),
        'Content-Type': mime,
        // shortcut: sem conferência de SHA-1 (CPU de 10 ms); o comprovante é visto por um humano ao pagar.
        'X-Bz-Content-Sha1': 'do_not_verify',
      },
      body: corpo,
    })
    if (!e.ok) {
      console.error('b2-envio upload', e.status, (await e.text()).slice(0, 200))
      return { ok: false, motivo: 'upload' }
    }
    return { ok: true }
  } catch (falhou) {
    console.error('b2-envio', falhou?.message)
    return { ok: false, motivo: 'rede' }
  }
}
