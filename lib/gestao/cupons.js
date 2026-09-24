const CODIGO_RE = /^[A-Z0-9_-]{4,40}$/
const DATA_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export const ERRO_CUPOM_PUBLICO = 'Cupom inválido, vencido ou esgotado.'

export function normalizarCodigoCupom(valor) {
  return String(valor || '').trim().toUpperCase()
}

export function codigoCupomValido(valor) {
  return CODIGO_RE.test(normalizarCodigoCupom(valor))
}

export function calcularPrecoCupom(precoCentavos, tipo, valor) {
  const preco = Number(precoCentavos)
  const desconto = Number(valor)
  if (!Number.isSafeInteger(preco) || preco < 100 || !Number.isSafeInteger(desconto)) {
    return null
  }

  const calculado = tipo === 'percentual'
    ? Math.round((preco * (100 - desconto)) / 100)
    : tipo === 'valor'
      ? preco - desconto
      : NaN

  if (!Number.isFinite(calculado)) return null
  return Math.max(100, calculado)
}

function partesData(valor) {
  const achado = DATA_RE.exec(String(valor || ''))
  if (!achado) return null
  const ano = Number(achado[1])
  const mes = Number(achado[2])
  const dia = Number(achado[3])
  const data = new Date(Date.UTC(ano, mes - 1, dia))
  if (
    data.getUTCFullYear() !== ano ||
    data.getUTCMonth() !== mes - 1 ||
    data.getUTCDate() !== dia
  ) return null
  return { ano, mes, dia }
}

function dataBrasilia(agora) {
  return new Date(agora.getTime() - 3 * 3600000).toISOString().slice(0, 10)
}

function somarUmAno(data) {
  const partes = partesData(data)
  const dia = new Date(Date.UTC(partes.ano + 1, partes.mes - 1, partes.dia))
  // 29/02 vira o último dia de fevereiro, em vez de pular para março.
  if (dia.getUTCMonth() !== partes.mes - 1) dia.setUTCDate(0)
  return dia.toISOString().slice(0, 10)
}

// O fim inclusivo de um dia de Brasília (23:59:59 em UTC-3) cai às 02:59:59
// UTC do dia seguinte. O D1 guarda o texto em UTC, como o restante do projeto.
export function fimDoDiaBrasiliaUtc(valor) {
  const partes = partesData(valor)
  if (!partes) return null
  const utc = new Date(Date.UTC(partes.ano, partes.mes - 1, partes.dia + 1, 2, 59, 59))
  return utc.toISOString().slice(0, 19).replace('T', ' ')
}

function inteiro(valor) {
  const numero = Number(valor)
  return Number.isSafeInteger(numero) ? numero : null
}

function invalido(campo, erro) {
  return { ok: false, campo, erro }
}

export function validarCriacaoCupom(dados, precoBaseCentavos, agora = new Date()) {
  const codigo = normalizarCodigoCupom(dados?.codigo)
  if (!CODIGO_RE.test(codigo)) {
    return invalido('codigo', 'Use de 4 a 40 caracteres: letras, números, hífen ou sublinhado.')
  }

  const tipo = String(dados?.tipo || '')
  if (tipo !== 'percentual' && tipo !== 'valor') {
    return invalido('tipo', 'Escolha desconto percentual ou em valor.')
  }

  const valor = inteiro(dados?.valor)
  if (tipo === 'percentual' && (valor === null || valor < 1 || valor > 100)) {
    return invalido('valor', 'O percentual deve ser um número inteiro de 1 a 100.')
  }
  if (
    tipo === 'valor' &&
    (valor === null || valor < 1 || valor >= Number(precoBaseCentavos))
  ) {
    return invalido('valor', 'O desconto deve ser em centavos e menor que o preço do produto.')
  }

  const validoAte = String(dados?.valido_ate || '')
  if (!partesData(validoAte)) {
    return invalido('valido_ate', 'Informe uma data válida no formato AAAA-MM-DD.')
  }
  const hoje = dataBrasilia(agora)
  if (validoAte < hoje || validoAte > somarUmAno(hoje)) {
    return invalido('valido_ate', 'A validade deve ficar entre hoje e um ano a partir de hoje.')
  }

  const limiteUsos = inteiro(dados?.limite_usos)
  if (limiteUsos === null || limiteUsos < 1 || limiteUsos > 10000) {
    return invalido('limite_usos', 'O limite deve ser um número inteiro de 1 a 10.000.')
  }

  return {
    ok: true,
    dados: {
      codigo,
      tipo,
      valor,
      valido_ate: fimDoDiaBrasiliaUtc(validoAte),
      limite_usos: limiteUsos,
    },
  }
}

function resultados(resultado) {
  return Array.isArray(resultado?.results) ? resultado.results : []
}

function isoUtc(valor) {
  if (!valor) return null
  const achado = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/.exec(String(valor))
  return achado ? `${achado[1]}T${achado[2]}Z` : null
}

export function cupomDaLinha(linha) {
  return {
    id: Number(linha.id),
    codigo: linha.codigo,
    tipo: linha.tipo,
    valor: Number(linha.valor),
    valido_ate: isoUtc(linha.valido_ate),
    limite_usos: Number(linha.limite_usos),
    usos: Number(linha.usos || 0),
    reservas_ativas: Number(linha.reservas_ativas || 0),
    faturamento_centavos: Number(linha.faturamento_centavos || 0),
    ativo: Boolean(Number(linha.ativo)),
    vencido: Boolean(Number(linha.vencido)),
    esgotado: Boolean(Number(linha.esgotado)),
    criado_por: linha.criado_por,
    criado_em: isoUtc(linha.criado_em),
    desativado_por: linha.desativado_por || null,
    desativado_em: isoUtc(linha.desativado_em),
  }
}

const CAMPOS_CUPOM = `
  c.id,
  c.codigo,
  c.tipo,
  c.valor,
  c.valido_ate,
  c.limite_usos,
  c.ativo,
  c.criado_por,
  c.criado_em,
  c.desativado_por,
  c.desativado_em,
  (SELECT COUNT(*) FROM compras p WHERE p.cupom = c.codigo LIMIT 1) AS usos,
  (SELECT COUNT(*) FROM cupom_reservas r
    WHERE r.cupom_id = c.id AND r.expira_em > datetime('now') LIMIT 1
  ) AS reservas_ativas,
  (SELECT COALESCE(SUM(p.valor_centavos), 0) FROM compras p
    WHERE p.cupom = c.codigo LIMIT 1
  ) AS faturamento_centavos,
  CASE WHEN c.valido_ate < datetime('now') THEN 1 ELSE 0 END AS vencido,
  CASE WHEN
    (SELECT COUNT(*) FROM compras p WHERE p.cupom = c.codigo LIMIT 1) +
    (SELECT COUNT(*) FROM cupom_reservas r
      WHERE r.cupom_id = c.id AND r.expira_em > datetime('now') LIMIT 1
    ) >= c.limite_usos
  THEN 1 ELSE 0 END AS esgotado`

export async function listarCupons(db) {
  const resultado = await db.prepare(`
    SELECT ${CAMPOS_CUPOM}
      FROM cupons c
     ORDER BY c.ativo DESC, c.criado_em DESC, c.id DESC
     LIMIT 200`).all()
  return resultados(resultado).map(cupomDaLinha)
}

export async function buscarCupomPorId(db, id) {
  const linha = await db.prepare(`
    SELECT ${CAMPOS_CUPOM}
      FROM cupons c
     WHERE c.id = ?
     LIMIT 1`).bind(id).first()
  return linha ? cupomDaLinha(linha) : null
}

export async function criarCupom(db, dados, criadoPor) {
  const resultado = await db.prepare(`
    INSERT INTO cupons (codigo, tipo, valor, valido_ate, limite_usos, criado_por)
    VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(
      dados.codigo,
      dados.tipo,
      dados.valor,
      dados.valido_ate,
      dados.limite_usos,
      criadoPor
    )
    .run()
  const id = Number(resultado?.meta?.last_row_id)
  return Number.isSafeInteger(id) ? buscarCupomPorId(db, id) : null
}

export async function desativarCupom(db, id, desativadoPor) {
  await db.prepare(`
    UPDATE cupons
       SET ativo = 0,
           desativado_por = COALESCE(desativado_por, ?),
           desativado_em = COALESCE(desativado_em, datetime('now'))
     WHERE id = ?`)
    .bind(desativadoPor, id)
    .run()
  return buscarCupomPorId(db, id)
}

export async function consultarCupomValido(db, codigo, precoBaseCentavos) {
  const normalizado = normalizarCodigoCupom(codigo)
  if (!db || !CODIGO_RE.test(normalizado)) return null
  const linha = await db.prepare(`
    SELECT c.id, c.codigo, c.tipo, c.valor
      FROM cupons c
     WHERE c.codigo = ?
       AND c.ativo = 1
       AND c.valido_ate >= datetime('now')
       AND (
         (SELECT COUNT(*) FROM compras p WHERE p.cupom = c.codigo LIMIT 1) +
         (SELECT COUNT(*) FROM cupom_reservas r
           WHERE r.cupom_id = c.id AND r.expira_em > datetime('now') LIMIT 1)
       ) < c.limite_usos
     LIMIT 1`).bind(normalizado).first()
  if (!linha) return null
  const precoCentavos = calcularPrecoCupom(precoBaseCentavos, linha.tipo, Number(linha.valor))
  if (precoCentavos === null) return null
  return { id: Number(linha.id), codigo: linha.codigo, preco_centavos: precoCentavos }
}

// O INSERT e a contagem pertencem à mesma instrução. O D1 serializa a escrita:
// se duas pessoas disputarem a última vaga, somente a primeira terá changes=1.
export async function reservarCupom(db, { cupomId, referencia, precoCentavos }) {
  const resultado = await db.prepare(`
    INSERT INTO cupom_reservas (referencia, cupom_id, preco_centavos, expira_em)
    SELECT ?, c.id, ?, datetime('now', '+35 minutes')
      FROM cupons c
     WHERE c.id = ?
       AND c.ativo = 1
       AND c.valido_ate >= datetime('now')
       AND (
         (SELECT COUNT(*) FROM compras p WHERE p.cupom = c.codigo LIMIT 1) +
         (SELECT COUNT(*) FROM cupom_reservas r
           WHERE r.cupom_id = c.id AND r.expira_em > datetime('now') LIMIT 1)
       ) < c.limite_usos`)
    .bind(referencia, precoCentavos, cupomId)
    .run()
  return Boolean(resultado?.meta?.changes)
}

export async function cancelarReservaCupom(db, referencia) {
  if (!db || !referencia) return
  await db.prepare('DELETE FROM cupom_reservas WHERE referencia = ?')
    .bind(referencia)
    .run()
}

// Núcleo separado para testar a idempotência com um banco local. A função
// pública registrarCompra, em lib/clientes.js, entrega o binding D1 daqui.
export async function registrarCompraNoBanco(db, {
  clienteId,
  sessionId,
  paymentIntent,
  valor,
  moeda,
  forma,
  cupom,
  referencia,
}) {
  if (!db) return false
  const codigo = normalizarCodigoCupom(cupom) || null
  const resultado = await db.prepare(`
    INSERT OR IGNORE INTO compras
      (cliente_id, stripe_session_id, stripe_payment_intent, valor_centavos, moeda, forma_pagamento, cupom)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      clienteId,
      sessionId,
      paymentIntent || null,
      Number(valor || 0),
      moeda || 'brl',
      forma || null,
      codigo
    )
    .run()

  // Também limpa numa repetição: se a primeira chamada gravou a compra e caiu
  // antes deste DELETE, a segunda termina o serviço sem contar uso novamente.
  if (referencia) await cancelarReservaCupom(db, referencia)
  return Boolean(resultado?.meta?.changes)
}
