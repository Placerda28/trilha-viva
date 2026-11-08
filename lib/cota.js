import { getDB, umaLinha, executar } from '@/lib/d1'

// Quantas músicas cada comprador pode baixar por dia. Decisão do Paulo.
//
// Para que serve: o acesso é vitalício e o acervo inteiro passa de 270 GB.
// Sem limite, uma conta repassada esvazia o acervo numa noite. A 30 por dia,
// levar o acervo todo exige mais de 25 dias seguidos — e nesse tempo o registro
// de downloads deixa o abuso à vista antes do estrago.
//
// Não atrapalha quem comprou de verdade: 30 músicas por dia é muito mais do
// que qualquer banda ensaia numa semana.
export const POR_DIA = 30

// O dia vira à meia-noite de Brasília, não de Londres — senão a cota do
// comprador zeraria às 21h, no meio do ensaio.
function inicioDoDiaBrasilia() {
  const agora = new Date()
  const brasilia = new Date(agora.getTime() - 3 * 3600000)
  const dia = brasilia.toISOString().slice(0, 10)
  return dia + ' 03:00:00'
}

export async function usoDeHoje(clienteId) {
  const db = getDB()
  if (!db) return { usados: 0, restam: POR_DIA, limite: POR_DIA }
  const r = await umaLinha(
    db,
    'SELECT COUNT(*) AS n FROM downloads WHERE cliente_id = ? AND criado_em >= ?',
    clienteId,
    inicioDoDiaBrasilia()
  )
  const usados = Number(r?.n || 0)
  return { usados, restam: Math.max(0, POR_DIA - usados), limite: POR_DIA }
}

// Ocupa uma vaga da cota ANTES de gerar o link, numa instrução só: a contagem
// e a gravação acontecem juntas no D1. Ler a cota e gravar depois deixava 200
// pedidos em paralelo passarem todos (auditoria de 07/11/2026, item M2).
// Devolve { ok, id }; sem banco (build, dev sem wrangler) segue liberado.
export async function reservarDownload({ clienteId, arquivo, slug, ip }, db = getDB()) {
  if (!db) return { ok: true, id: null }
  const r = await umaLinha(
    db,
    `INSERT INTO downloads (cliente_id, arquivo, slug, ip)
     SELECT ?, ?, ?, ?
     WHERE (SELECT COUNT(*) FROM downloads WHERE cliente_id = ? AND criado_em >= ?) < ?
     RETURNING id`,
    clienteId,
    String(arquivo || '').slice(0, 400),
    String(slug || '').slice(0, 200),
    String(ip || '').slice(0, 60),
    clienteId,
    inicioDoDiaBrasilia(),
    POR_DIA
  )
  return r ? { ok: true, id: r.id } : { ok: false, id: null }
}

// O link não saiu: devolve a vaga, para a falha do B2 não gastar a cota.
export async function desfazerDownload(id, db = getDB()) {
  if (!id) return
  await executar(db, 'DELETE FROM downloads WHERE id = ?', id)
}

// Quando a cota volta, em texto pronto para a tela.
export function quandoVolta() {
  const agora = new Date()
  const brasilia = new Date(agora.getTime() - 3 * 3600000)
  const horas = 23 - brasilia.getUTCHours()
  const minutos = 60 - brasilia.getUTCMinutes()
  if (horas >= 1) return 'em ' + horas + (horas === 1 ? ' hora' : ' horas')
  return 'em ' + minutos + (minutos === 1 ? ' minuto' : ' minutos')
}
