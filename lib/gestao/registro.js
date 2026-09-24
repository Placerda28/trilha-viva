const POR_PAGINA = 50

function paginaValida(valor) {
  const pagina = Number(valor)
  return Number.isSafeInteger(pagina) && pagina >= 1 ? pagina : 1
}

function resultados(resultado) {
  return Array.isArray(resultado?.results) ? resultado.results : []
}

function isoUtc(valor) {
  if (!valor) return null
  const achado = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/.exec(String(valor))
  return achado ? `${achado[1]}T${achado[2]}Z` : null
}

function detalheJson(detalhe) {
  if (detalhe == null) return null
  try {
    const texto = JSON.stringify(detalhe)
    return texto.length <= 1000 ? texto : null
  } catch {
    return null
  }
}

// O registro é sempre melhor esforço: a pessoa não pode receber erro ao
// criar um cupom ou remover um membro porque o diário secundário falhou.
export async function gravarRegistro(db, { quem, acao, alvo = null, detalhe = null }) {
  try {
    if (!db) return false
    await db.prepare(`
      INSERT INTO registro (quem, acao, alvo, detalhe)
      VALUES (?, ?, ?, ?)`)
      .bind(
        String(quem || '').trim().toLowerCase().slice(0, 254),
        String(acao || '').slice(0, 60),
        alvo == null ? null : String(alvo).slice(0, 254),
        detalheJson(detalhe)
      )
      .run()
    return true
  } catch (erro) {
    console.error('registro de ação', String(acao || '').slice(0, 60), erro?.message)
    return false
  }
}

function itemDaLinha(linha) {
  let detalhe = null
  try {
    detalhe = linha.detalhe ? JSON.parse(linha.detalhe) : null
  } catch {
    detalhe = null
  }
  return {
    id: Number(linha.id),
    quando: isoUtc(linha.criado_em),
    quem: linha.quem,
    acao: linha.acao,
    alvo: linha.alvo || null,
    detalhe,
  }
}

export async function consultarRegistro(db, valorPagina) {
  const pagina = paginaValida(valorPagina)
  const deslocamento = (pagina - 1) * POR_PAGINA
  const [lista, total] = await Promise.all([
    db.prepare(`
      SELECT id, criado_em, quem, acao, alvo, detalhe
        FROM registro
       ORDER BY criado_em DESC, id DESC
       LIMIT ? OFFSET ?`)
      .bind(POR_PAGINA, deslocamento)
      .all(),
    db.prepare('SELECT COUNT(*) AS total FROM registro LIMIT 1').first(),
  ])
  return {
    pagina,
    por_pagina: POR_PAGINA,
    total: Number(total?.total || 0),
    itens: resultados(lista).map(itemDaLinha),
  }
}
