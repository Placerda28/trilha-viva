import { assinarDescadastro, normalizarEmailLembrete } from '../../lib/lembrete-assinatura.js'

const TEXTOS_INICIAIS = [
  ({ nome, link }) => `${nome ? `Oi, ${nome}!` : 'Oi!'} Aqui é da Trilha Viva. Vi que você começou a liberar o acesso às mais de 2.000 multitracks gospel e não concluiu. Ficou alguma dúvida? Se quiser terminar, é por aqui: ${link}`,
  ({ nome, link }) => `${nome ? `Olá, ${nome}, tudo bem?` : 'Olá, tudo bem?'} É da Trilha Viva. Seu acesso ao acervo de multitracks ficou pela metade. Posso ajudar em alguma coisa? Para concluir com Pix ou cartão: ${link}`,
  ({ nome, link }) => `${nome ? `Oi, ${nome}! Passando` : 'Oi! Passando'} para lembrar do seu acesso à Trilha Viva: mais de 2.000 multitracks gospel por R$ 89,90, pagamento único. Se ainda fizer sentido para o seu ministério, é só concluir aqui: ${link}`,
]

const TEXTOS_SEGUIMENTO = [
  ({ nome, link }) => `${nome ? `Oi, ${nome}!` : 'Oi!'} Aqui é da Trilha Viva de novo. Seu acesso às mais de 2.000 multitracks gospel continua esperando: clique, guia e cada instrumento no seu canal, para o ensaio e para o culto. Para concluir: ${link}`,
  ({ nome, link }) => `${nome ? `Olá, ${nome}!` : 'Olá!'} Uma dica rápida da Trilha Viva: com multitrack, a banda ensaia com a mesma referência e o culto fica mais seguro. O acervo completo sai por R$ 89,90, pagamento único. Para garantir o seu: ${link}`,
  ({ nome, link }) => `${nome ? `Oi, ${nome}, tudo bem?` : 'Oi, tudo bem?'} Passando para saber se ficou alguma dúvida sobre a Trilha Viva. É só responder esta mensagem. Se quiser concluir agora, com Pix ou cartão: ${link}`,
]

const TEXTO_FINAL = ({ nome, link }) => `${nome ? `Oi, ${nome}!` : 'Oi!'} Esta é a última mensagem da Trilha Viva sobre o seu acesso que ficou pela metade. Se ainda fizer sentido para o seu ministério, o acervo continua por R$ 89,90: ${link}`

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
  return soma % TEXTOS_INICIAIS.length
}

export async function montarWhatsapp(carrinho, env, numeroEtapa = 1) {
  const etapa = Math.min(8, Math.max(1, Number(numeroEtapa) || 1))
  const site = semBarraNoFim(env.SITE_URL)
  const email = normalizarEmailLembrete(carrinho.email)
  const assinatura = await assinarDescadastro(email, env.LEMBRETE_SEGREDO)
  const link = `${site}/assinar?r=${encodeURIComponent(carrinho.id)}&utm_source=whatsapp&utm_medium=lembrete&utm_campaign=carrinho-wa-${etapa}`
  const sair = `${site}/api/descadastrar?e=${encodeURIComponent(email)}&t=${assinatura}`
  const dados = {
    nome: primeiroNome(carrinho.nome),
    link,
  }
  let texto
  if (etapa === 1) texto = TEXTOS_INICIAIS[variacaoDoCarrinho(carrinho.id)](dados)
  else if (etapa === 8) texto = TEXTO_FINAL(dados)
  else texto = TEXTOS_SEGUIMENTO[(etapa - 2) % TEXTOS_SEGUIMENTO.length](dados)
  return `${texto}

Para não receber mais, responda SAIR ou toque aqui: ${sair}`
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
