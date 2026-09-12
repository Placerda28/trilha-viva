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

export async function registrarDownload({ clienteId, arquivo, slug, ip }) {
  const db = getDB()
  await executar(
    db,
    'INSERT INTO downloads (cliente_id, arquivo, slug, ip) VALUES (?, ?, ?, ?)',
    clienteId,
    String(arquivo || '').slice(0, 400),
    String(slug || '').slice(0, 200),
    String(ip || '').slice(0, 60)
  )
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
