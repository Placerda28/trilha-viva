import { readdirSync, readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

// Banco em memória com TODAS as migrações, na ordem, igual ao D1 de produção.
export function criarBanco() {
  const banco = new DatabaseSync(':memory:')
  const arquivos = readdirSync('migrations').filter((n) => n.endsWith('.sql')).sort()
  for (const nome of arquivos) banco.exec(readFileSync(`migrations/${nome}`, 'utf8'))
  return banco
}

export class D1Local {
  constructor(banco) {
    this.banco = banco
    this.consultas = 0
    this.lotes = 0
  }

  prepare(sql) {
    this.consultas += 1
    const preparada = this.banco.prepare(sql)
    let valores = []
    return {
      bind(...novos) {
        valores = novos
        return this
      },
      async all() {
        return { results: preparada.all(...valores) }
      },
      async first() {
        return preparada.get(...valores) || null
      },
      async run() {
        const r = preparada.run(...valores)
        return { meta: { changes: Number(r.changes) } }
      },
    }
  }

  async batch(lista) {
    this.lotes += 1
    return Promise.all(lista.map((s) => s.all()))
  }
}
