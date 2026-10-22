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

// Filtros opcionais: quem (e-mail), tipo (acao) e período (inicioUtc/fimUtc).
function clausulasRegistro({ quem, tipo, inicioUtc, fimUtc } = {}) {
  const partes = []
  const valores = []
  const quemLimpo = String(quem || '').trim().toLowerCase().slice(0, 254)
  const tipoLimpo = String(tipo || '').trim().slice(0, 60)
  if (quemLimpo) { partes.push('quem = ?'); valores.push(quemLimpo) }
  if (tipoLimpo) { partes.push('acao = ?'); valores.push(tipoLimpo) }
  if (inicioUtc && fimUtc) { partes.push('criado_em >= ? AND criado_em < ?'); valores.push(inicioUtc, fimUtc) }
  return { sql: partes.length ? `WHERE ${partes.join(' AND ')}` : '', valores }
}

export async function consultarRegistro(db, valorPagina, filtros = {}) {
  const pagina = paginaValida(valorPagina)
  const deslocamento = (pagina - 1) * POR_PAGINA
  const onde = clausulasRegistro(filtros)
  const [lista, total, quems, tipos] = await Promise.all([
    db.prepare(`
      SELECT id, criado_em, quem, acao, alvo, detalhe
        FROM registro
        ${onde.sql}
       ORDER BY criado_em DESC, id DESC
       LIMIT ? OFFSET ?`)
      .bind(...onde.valores, POR_PAGINA, deslocamento)
      .all(),
    db.prepare(`SELECT COUNT(*) AS total FROM registro ${onde.sql} LIMIT 1`).bind(...onde.valores).first(),
    db.prepare('SELECT DISTINCT quem FROM registro ORDER BY quem LIMIT 50').all(),
    db.prepare('SELECT DISTINCT acao FROM registro ORDER BY acao LIMIT 100').all(),
  ])
  return {
    pagina,
    por_pagina: POR_PAGINA,
    total: Number(total?.total || 0),
    itens: resultados(lista).map(itemDaLinha),
    quem_opcoes: resultados(quems).map((l) => l.quem),
    tipo_opcoes: resultados(tipos).map((l) => l.acao),
  }
}
