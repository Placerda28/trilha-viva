// Conta as consultas ao D1 de UMA invocação do Worker (plano grátis: 50). O robô embrulha env.DB uma vez
// em executarRodada; cada statement preparado conta 1 (os de um db.batch já foram contados ao preparar).
// Todas as etapas dividem o mesmo orçamento (LIMITE_D1 - MARGEM), na ordem e-mail, leads, WhatsApp, acesso, afiliados.
// Antes de cada item, a etapa pergunta `cabe(db, custo)`; se não cabe, o item fica para a rodada seguinte
// (o cron roda a cada 10 min) e a etapa avisa com `adiar`, que alimenta o registro `robo_limite`.
export const LIMITE_D1 = 50
export const MARGEM = 4
const CONTADOR = Symbol.for('tv.consultas')
const ADIADOS = Symbol.for('tv.adiados')

export function contarConsultas(db) {
  if (!db || db[CONTADOR]) return db
  const c = { gasto: 0, adiados: {} }
  return new Proxy(db, {
    get(alvo, prop) {
      if (prop === CONTADOR) return () => c.gasto
      if (prop === ADIADOS) return c.adiados
      if (prop === 'prepare') return (sql) => { c.gasto += 1; return alvo.prepare(sql) }
      const valor = Reflect.get(alvo, prop)
      return typeof valor === 'function' ? valor.bind(alvo) : valor
    },
  })
}

// Quanto já foi gasto neste banco (0 se ele não é contado, como em chamadas diretas das etapas).
export const consultasGastas = (db) => db?.[CONTADOR]?.() ?? 0

// Consultas que ainda cabem na rodada (banco não contado: sem limite, como nas chamadas diretas das etapas).
export const restante = (db) => (db?.[CONTADOR] ? LIMITE_D1 - MARGEM - consultasGastas(db) : Infinity)
export const cabe = (db, custo) => restante(db) >= custo

// Anota que `n` itens da etapa ficaram para a próxima rodada.
export function adiar(db, etapa, n = 1) {
  const a = db?.[ADIADOS]
  if (a && n > 0) a[etapa] = (a[etapa] || 0) + n
}
export const adiados = (db) => ({ ...(db?.[ADIADOS] || {}) })
