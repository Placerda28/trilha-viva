const codificador = new TextEncoder()

export function normalizarEmailLembrete(email) {
  return String(email || '').trim().toLowerCase()
}

function paraHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function assinarDescadastro(email, segredo) {
  const chaveTexto = String(segredo || '')
  const emailNormalizado = normalizarEmailLembrete(email)
  if (!chaveTexto || !emailNormalizado) return ''

  const chave = await crypto.subtle.importKey(
    'raw',
    codificador.encode(chaveTexto),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const assinatura = await crypto.subtle.sign(
    'HMAC',
    chave,
    codificador.encode(`descadastro:${emailNormalizado}`)
  )
  return paraHex(new Uint8Array(assinatura))
}

// A comparação percorre sempre os 64 caracteres de uma assinatura SHA-256.
// Assim, uma diferença no primeiro caractere não termina antes de uma diferença
// no último e não entrega a posição correta por diferença de tempo.
function iguaisEmTempoConstante(esperada, recebida) {
  const a = String(esperada || '')
  const b = String(recebida || '')
  let diferenca = a.length ^ b.length
  for (let i = 0; i < 64; i++) {
    diferenca |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return diferenca === 0
}

export async function assinaturaDescadastroValida(email, assinatura, segredo) {
  const recebida = String(assinatura || '').toLowerCase()
  if (!/^[0-9a-f]{64}$/.test(recebida)) return false
  const esperada = await assinarDescadastro(email, segredo)
  return iguaisEmTempoConstante(esperada, recebida)
}
