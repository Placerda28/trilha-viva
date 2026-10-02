const PEDIDOS_DE_SAIDA = new Set([
  'sair',
  'parar',
  'pare',
  'stop',
  'cancelar',
  'descadastrar',
  'remover',
])

function somenteDigitos(valor) {
  return Array.from(String(valor || ''))
    .filter((caractere) => caractere >= '0' && caractere <= '9')
    .join('')
}

function telefoneSemPais(valor) {
  const digitos = somenteDigitos(valor)
  // Só tira o 55 quando sobra DDD + número (10 ou 11 dígitos). O DDD 55
  // existe (Santa Maria, RS), então "55" no começo não basta.
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith('55')) {
    return digitos.slice(2)
  }
  return digitos
}

export function lerMensagemRecebida(corpo) {
  if (!corpo || typeof corpo !== 'object') return null

  if ('phone' in corpo || 'text' in corpo) {
    if (corpo.fromMe || corpo.isGroup) return null
    const telefone = telefoneSemPais(corpo.phone)
    const texto = corpo.text?.message
    if (!telefone || typeof texto !== 'string' || !texto.trim()) return null
    return { telefone, texto }
  }

  if (corpo.event !== 'messages.upsert') return null
  const chave = corpo.data?.key
  const jid = String(chave?.remoteJid || '')
  if (chave?.fromMe || jid.endsWith('@g.us')) return null
  const texto =
    corpo.data?.message?.conversation ??
    corpo.data?.message?.extendedTextMessage?.text
  const telefone = telefoneSemPais(jid.split('@')[0])
  if (!telefone || typeof texto !== 'string' || !texto.trim()) return null
  return { telefone, texto }
}

function semAcentos(valor) {
  return Array.from(String(valor || '').normalize('NFD'))
    .filter((caractere) => {
      const codigo = caractere.charCodeAt(0)
      return codigo < 768 || codigo > 879
    })
    .join('')
}

function letraOuNumero(caractere) {
  return (
    (caractere >= 'a' && caractere <= 'z') ||
    (caractere >= '0' && caractere <= '9')
  )
}

export function pedidoDeSaida(texto) {
  const normalizado = semAcentos(texto).toLowerCase()
  let inicio = 0
  let fim = normalizado.length
  while (inicio < fim && !letraOuNumero(normalizado[inicio])) inicio += 1
  while (fim > inicio && !letraOuNumero(normalizado[fim - 1])) fim -= 1
  return PEDIDOS_DE_SAIDA.has(normalizado.slice(inicio, fim))
}

async function resumo(valor) {
  const bytes = new TextEncoder().encode(String(valor || ''))
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
}

export async function compararSegredoEmTempoConstante(recebido, esperado) {
  const [resumoRecebido, resumoEsperado] = await Promise.all([
    resumo(recebido),
    resumo(esperado),
  ])
  let diferenca = 0
  for (let indice = 0; indice < resumoEsperado.length; indice += 1) {
    diferenca |= resumoRecebido[indice] ^ resumoEsperado[indice]
  }
  return diferenca === 0
}
