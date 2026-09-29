import { isoUtc, paginaValida } from './clientes.js'

const POR_PAGINA = 50
const HORA_MS = 3600000
const DIA_MS = 24 * HORA_MS
const DIAS_POR_PERIODO = { hoje: 1, '7d': 7, '30d': 30 }

function textoUtc(data) {
  return data.toISOString().slice(0, 19).replace('T', ' ')
}

export function periodoCarrinhos(valor, agora = new Date()) {
  const periodo = String(valor || '7d')
  const dias = DIAS_POR_PERIODO[periodo]
  const instante = agora instanceof Date ? agora : new Date(agora)
  if (!dias || Number.isNaN(instante.getTime())) return null

  // Subtrair três horas permite ler ano, mês e dia de Brasília com os getters
  // UTC, sem depender do fuso configurado na máquina ou no Worker.
  const brasilia = new Date(instante.getTime() - 3 * HORA_MS)
  const meiaNoiteLocal = Date.UTC(
    brasilia.getUTCFullYear(),
    brasilia.getUTCMonth(),
    brasilia.getUTCDate()
  )
  const inicioUtc = new Date(meiaNoiteLocal - (dias - 1) * DIA_MS + 3 * HORA_MS)
  const fimUtc = new Date(meiaNoiteLocal + DIA_MS + 3 * HORA_MS)

  return {
    periodo,
    inicioUtc: textoUtc(inicioUtc),
    fimUtc: textoUtc(fimUtc),
  }
}

function linhas(resultado) {
  return Array.isArray(resultado?.results) ? resultado.results : []
}

export function carrinhoGestaoDaLinha(linha) {
  return {
    nome: linha.nome || null,
    email: linha.email,
    criado_em: isoUtc(linha.criado_em),
    status: linha.status,
    email_enviado_em: isoUtc(linha.email_enviado_em),
    pago_em: isoUtc(linha.pago_em),
  }
}

export async function consultarCarrinhosGestao(db, { periodo, pagina, agora } = {}) {
  const faixa = periodoCarrinhos(periodo, agora)
  if (!faixa) return null

  const numeroPagina = paginaValida(pagina)
  const offset = (numeroPagina - 1) * POR_PAGINA
  const [totaisLinha, paginaResultado] = await Promise.all([
    db.prepare(`
      SELECT
        SUM(CASE WHEN status = 'aberto' THEN 1 ELSE 0 END) AS abertos,
        SUM(CASE WHEN email_enviado_em IS NOT NULL THEN 1 ELSE 0 END) AS lembrados,
        SUM(CASE
          WHEN email_enviado_em IS NOT NULL AND pago_em > email_enviado_em THEN 1
          ELSE 0
        END) AS recuperados
      FROM carrinhos
      WHERE criado_em >= ? AND criado_em < ?
      LIMIT 1`).bind(faixa.inicioUtc, faixa.fimUtc).first(),
    // Pedir um item adicional evita uma terceira consulta só para descobrir
    // se existe próxima página.
    db.prepare(`
      SELECT nome, email, criado_em, status, email_enviado_em, pago_em
        FROM carrinhos
       WHERE criado_em >= ? AND criado_em < ?
       ORDER BY criado_em DESC, id DESC
       LIMIT ? OFFSET ?`).bind(faixa.inicioUtc, faixa.fimUtc, POR_PAGINA + 1, offset).all(),
  ])

  const todas = linhas(paginaResultado)
  const lembrados = Number(totaisLinha?.lembrados || 0)
  const recuperados = Number(totaisLinha?.recuperados || 0)
  return {
    totais: {
      abertos: Number(totaisLinha?.abertos || 0),
      lembrados,
      recuperados,
      taxa: lembrados ? recuperados / lembrados : 0,
    },
    itens: todas.slice(0, POR_PAGINA).map(carrinhoGestaoDaLinha),
    pagina: numeroPagina,
    temMais: todas.length > POR_PAGINA,
  }
}
