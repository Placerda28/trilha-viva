import { limparTelefone } from './carrinhos.js'

function contato({ email, telefone } = {}) {
  return [String(email || '').trim().toLowerCase(), limparTelefone(telefone)]
}

export async function ehContatoTeste(db, dados = {}) {
  try {
    if (!db) return false
    const linha = await db.prepare(`
      SELECT 1 AS ok FROM contatos_teste
       WHERE (tipo = 'email' AND valor = ?) OR (tipo = 'telefone' AND valor = ?)
       LIMIT 1`).bind(...contato(dados)).first()
    return Boolean(linha)
  } catch (erro) {
    console.error('contato teste consultar', erro?.message)
    return false
  }
}

// A verificação é acessória: uma falha nunca pode impedir liberar uma compra.
export async function ehTeste(db, { email, telefone, referencia } = {}) {
  try {
    if (!db) return false
    const linha = await db.prepare(`
      SELECT (
        EXISTS(SELECT 1 FROM contatos_teste
          WHERE (tipo = 'email' AND valor = ?) OR (tipo = 'telefone' AND valor = ?) LIMIT 1)
        OR EXISTS(SELECT 1 FROM carrinhos WHERE id = ? AND teste = 1 LIMIT 1)
      ) AS teste LIMIT 1`).bind(...contato({ email, telefone }), String(referencia || '')).first()
    return Boolean(Number(linha?.teste || 0))
  } catch (erro) {
    console.error('compra teste consultar', erro?.message)
    return false
  }
}

// Recebe o envio como parâmetro para testar que nenhum evento sai para a Meta.
export async function enviarMetaSeReal(teste, evento, enviarEventoMeta) {
  if (teste) {
    console.log(`meta capi ${evento.nome} pulado (teste) ${evento.referencia || evento.id}`)
    return { status: 'teste' }
  }
  return enviarEventoMeta(evento)
}
