import { site } from '@/lib/site'

// Conversions API da Meta: o mesmo evento que o Pixel dispara no navegador,
// mandado também pelo servidor. Serve para quando o navegador não manda
// (bloqueador de anúncio, Safari, aba fechada antes da hora).
//
// Os dois lados usam o MESMO event_id — é assim que a Meta junta os dois e
// conta uma compra só, em vez de duas.
//
// Nunca lança erro: rastreamento de anúncio não pode derrubar checkout nem
// webhook. Sem o token cadastrado, simplesmente não faz nada.

const API = 'https://graph.facebook.com/v21.0'

async function sha256(texto) {
  const dados = new TextEncoder().encode(texto)
  const hash = await crypto.subtle.digest('SHA-256', dados)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Lê os cookies _fbp e _fbc que o Pixel grava no navegador.
export function lerCookiesMeta(req) {
  const cookies = {}
  for (const parte of (req.headers.get('cookie') || '').split(';')) {
    const i = parte.indexOf('=')
    if (i > 0) cookies[parte.slice(0, i).trim()] = parte.slice(i + 1).trim()
  }
  return { fbp: cookies._fbp || '', fbc: cookies._fbc || '' }
}

export function ipDoPedido(req) {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    ''
  )
}

export async function enviarEventoMeta({
  nome,
  id,
  email,
  ip,
  ua,
  fbp,
  fbc,
  url,
  valor,
  moeda = 'BRL',
}) {
  const pixel = site.metaPixelId
  const token = process.env.META_CAPI_TOKEN
  if (!pixel || !token) return { enviado: false, motivo: 'nao_configurado' }

  try {
    const user_data = {}
    if (email) user_data.em = [await sha256(String(email).trim().toLowerCase())]
    if (ip) user_data.client_ip_address = ip
    if (ua) user_data.client_user_agent = ua
    if (fbp) user_data.fbp = fbp
    if (fbc) user_data.fbc = fbc

    const evento = {
      event_name: nome,
      event_time: Math.floor(Date.now() / 1000),
      event_id: id,
      action_source: 'website',
      event_source_url: url || site.url,
      user_data,
    }
    if (valor != null) evento.custom_data = { value: valor, currency: moeda }

    const corpo = { data: [evento] }
    // Código de teste do Gerenciador de Eventos (aba "Testar eventos"). Só
    // existe enquanto se confere a instalação; depois apaga-se a variável.
    if (process.env.META_TEST_EVENT_CODE) corpo.test_event_code = process.env.META_TEST_EVENT_CODE

    const res = await fetch(`${API}/${pixel}/events?access_token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) {
      console.error('meta capi', nome, res.status, (await res.text()).slice(0, 300))
      return { enviado: false, motivo: `http_${res.status}` }
    }
    return { enviado: true }
  } catch (err) {
    console.error('meta capi', nome, err?.message)
    return { enviado: false, motivo: 'falhou' }
  }
}
