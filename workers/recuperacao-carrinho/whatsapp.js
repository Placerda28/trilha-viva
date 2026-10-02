const TEXTOS = [
  ({ nome, link }) => `${nome ? `Oi, ${nome}!` : 'Oi!'} Aqui é da Trilha Viva. Vi que você começou a liberar o acesso às mais de 2.000 multitracks gospel e não concluiu. Ficou alguma dúvida? Se quiser terminar, é por aqui: ${link}

Se não quiser mais mensagens, responda SAIR.`,
  ({ nome, link }) => `${nome ? `Olá, ${nome}, tudo bem?` : 'Olá, tudo bem?'} É da Trilha Viva. Seu acesso ao acervo de multitracks ficou pela metade. Posso ajudar em alguma coisa? Para concluir com Pix ou cartão: ${link}

Para não receber mais mensagens, responda SAIR.`,
  ({ nome, link }) => `${nome ? `Oi, ${nome}! Passando` : 'Oi! Passando'} para lembrar do seu acesso à Trilha Viva: mais de 2.000 multitracks gospel por R$ 89,90, pagamento único. Se ainda fizer sentido para o seu ministério, é só concluir aqui: ${link}

Não quer mais mensagens? Responda SAIR.`,
]

function semBarraNoFim(valor) {
  let resultado = String(valor || '').trim()
  while (resultado.endsWith('/')) resultado = resultado.slice(0, -1)
  return resultado
}

function primeiroNome(valor) {
  const limpo = Array.from(String(valor || ''), (caractere) => {
    const codigo = caractere.charCodeAt(0)
    return codigo <= 31 || codigo === 127 ? ' ' : caractere
  }).join('').trim()
  const fim = limpo.indexOf(' ')
  return (fim === -1 ? limpo : limpo.slice(0, fim)).slice(0, 30)
}

function variacaoDoCarrinho(id) {
  let soma = 0
  for (const caractere of String(id || '')) soma += caractere.charCodeAt(0)
  return soma % TEXTOS.length
}

export function montarWhatsapp(carrinho, env) {
  const site = semBarraNoFim(env.SITE_URL)
  const link = `${site}/assinar?r=${encodeURIComponent(carrinho.id)}&utm_source=whatsapp&utm_medium=lembrete&utm_campaign=carrinho`
  return TEXTOS[variacaoDoCarrinho(carrinho.id)]({
    nome: primeiroNome(carrinho.nome),
    link,
  })
}

export function dentroDoHorario(agora = new Date()) {
  const brasilia = new Date(new Date(agora).getTime() - 3 * 60 * 60 * 1000)
  const hora = brasilia.getUTCHours()
  return hora >= 9 && hora < 20
}

export function configuracaoWhatsappValida(env) {
  const provedor = String(env.WHATSAPP_PROVEDOR || '').toLowerCase()
  if (provedor === 'zapi') {
    return Boolean(env.ZAPI_INSTANCIA && env.ZAPI_TOKEN && env.ZAPI_CLIENT_TOKEN)
  }
  if (provedor === 'evolution') {
    return Boolean(
      env.EVOLUTION_URL && env.EVOLUTION_INSTANCIA && env.EVOLUTION_APIKEY
    )
  }
  return false
}

export async function enviarWhatsapp({ telefone, texto }, env, fetchImpl = globalThis.fetch) {
  const provedor = String(env.WHATSAPP_PROVEDOR || '').toLowerCase()
  if (!configuracaoWhatsappValida(env)) {
    throw new Error('Configuração do provedor de WhatsApp incompleta.')
  }

  let url
  let headers
  let body
  if (provedor === 'zapi') {
    url = `https://api.z-api.io/instances/${env.ZAPI_INSTANCIA}/token/${env.ZAPI_TOKEN}/send-text`
    headers = {
      'Client-Token': env.ZAPI_CLIENT_TOKEN,
      'Content-Type': 'application/json',
    }
    body = { phone: `55${telefone}`, message: texto }
  } else {
    url = `${semBarraNoFim(env.EVOLUTION_URL)}/message/sendText/${encodeURIComponent(env.EVOLUTION_INSTANCIA)}`
    headers = {
      apikey: env.EVOLUTION_APIKEY,
      'Content-Type': 'application/json',
    }
    body = { number: `55${telefone}`, text: texto }
  }

  const controlador = new AbortController()
  const timeout = setTimeout(() => controlador.abort(), 15000)
  try {
    const resposta = await fetchImpl(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controlador.signal,
    })
    if (!resposta.ok) {
      throw new Error(`Provedor de WhatsApp respondeu com HTTP ${resposta.status}`)
    }
  } finally {
    clearTimeout(timeout)
  }
}
