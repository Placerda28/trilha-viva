// Conta as consultas ao D1 de UMA invocação do Worker (plano grátis: 50). O robô embrulha env.DB uma vez
// em executarRodada; cada statement preparado conta 1 (os de um db.batch já foram contados ao preparar).
export const LIMITE_D1 = 50
export const MARGEM = 4
const CONTADOR = Symbol.for('tv.consultas')

export function contarConsultas(db) {
  if (!db || db[CONTADOR]) return db
  const c = { gasto: 0 }
  return new Proxy(db, {
    get(alvo, prop) {
      if (prop === CONTADOR) return () => c.gasto
      if (prop === 'prepare') return (sql) => { c.gasto += 1; return alvo.prepare(sql) }
      const valor = Reflect.get(alvo, prop)
      return typeof valor === 'function' ? valor.bind(alvo) : valor
    },
  })
}

// Quanto já foi gasto neste banco (0 se ele não é contado, como em chamadas diretas das etapas).
export const consultasGastas = (db) => db?.[CONTADOR]?.() ?? 0
