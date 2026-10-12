import { site } from './site.js'
import { COOKIE_ORIGEM, lerCookie, lerCookieOrigem, montarCustomData, montarUserData } from './rastreio.js'

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

// Lê os cookies _fbp e _fbc que o Pixel grava no navegador.
export function lerCookiesMeta(req) {
  const cabecalho = req.headers.get('cookie') || ''
  return { fbp: lerCookie(cabecalho, '_fbp'), fbc: lerCookie(cabecalho, '_fbc') }
}

// A origem da visita guardada pelo componente Origem (cookie tv_origem).
export function lerOrigemVisita(req) {
  return lerCookieOrigem(lerCookie(req.headers.get('cookie') || '', COOKIE_ORIGEM))
}

export function ipDoPedido(req) {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    ''
  )
}

// Devolve { enviado, status }: status é 'ok' ou o motivo da falha (ex.:
// http_400), para a compra registrar o resultado.
export async function enviarEventoMeta({
  nome,
  id,
  email,
  telefone,
  nomeCliente,
  ip,
  ua,
  fbp,
  fbc,
  url,
  valor,
  moeda = 'BRL',
  referencia,
  fetchImpl = fetch,
}) {
  const pixel = site.metaPixelId
  const token = process.env.META_CAPI_TOKEN
  if (!pixel || !token) return { enviado: false, status: 'nao_configurado' }

  try {
    const evento = {
      event_name: nome,
      event_time: Math.floor(Date.now() / 1000),
      event_id: id,
      action_source: 'website',
      event_source_url: url || site.url,
      user_data: await montarUserData({ email, telefone, nome: nomeCliente, ip, ua, fbp, fbc }),
    }
    const custom = montarCustomData({ valor, moeda, referencia })
    if (custom) evento.custom_data = custom

    const corpo = { data: [evento] }
    // Código de teste do Gerenciador de Eventos (aba "Testar eventos"). Só
    // existe enquanto se confere a instalação; depois apaga-se a variável.
    if (process.env.META_TEST_EVENT_CODE) corpo.test_event_code = process.env.META_TEST_EVENT_CODE

    const res = await fetchImpl(`${API}/${pixel}/events?access_token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) {
      console.error('meta capi', nome, res.status, id, (await res.text()).slice(0, 300))
      return { enviado: false, status: `http_${res.status}` }
    }
    // O sucesso também vai para o registro: assim dá para conferir, compra a
    // compra, que ela chegou à Meta.
    console.log('meta capi', nome, 'ok', id)
    return { enviado: true, status: 'ok' }
  } catch (err) {
    console.error('meta capi', nome, 'falhou', id, err?.message)
    return { enviado: false, status: 'falhou' }
  }
}
