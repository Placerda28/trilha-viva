import { D1Local, criarBanco } from '../gestao/_d1local.mjs'
import { gravarComissaoBase } from '../../lib/afiliados/comissao.js'

export const NOV = new Date('2026-11-10T15:00:00Z') // aprovação das vendas de teste
export const FECHA = new Date('2026-12-08T12:00:00Z') // dia do fechamento

export function novoDb() {
  return new D1Local(criarBanco())
}

let seq = 0
// Cria cliente + cupom + afiliado (com Pix, se pedido). Devolve ids.
export function novoAfiliado(db, { pix = true, nivelFixoId = null, status = 'ativo' } = {}) {
  seq += 1
  const cli = db.banco.prepare('INSERT INTO clientes (email) VALUES (?) RETURNING id').get(`a${seq}@t.com`)
  const cup = db.banco
    .prepare("INSERT INTO cupons (codigo, tipo, valor, valido_ate, limite_usos, criado_por) VALUES (?, 'valor', 1000, '2027-01-01', 1000, 't') RETURNING id")
    .get(`AFI${seq}XX`)
  const a = db.banco
    .prepare('INSERT INTO afiliados (cliente_id, cupom_id, status, nivel_fixo_id, nome, cpf) VALUES (?, ?, ?, ?, ?, ?) RETURNING id')
    .get(cli.id, cup.id, status, nivelFixoId, `Afiliado ${seq}`, '00000000000')
  if (pix) comPix(db, { id: Number(a.id) })
  return { id: Number(a.id), clienteId: Number(cli.id) }
}

export function comPix(db, af) {
  db.banco
    .prepare("INSERT INTO afiliados_pix (afiliado_id, tipo_chave, chave, titular_nome, titular_cpf) VALUES (?, 'cpf', '00000000000', 'Nome', '00000000000')")
    .run(af.id)
  return af
}

// Cria uma compra e a comissão base dela, aprovada em `quando`.
export async function novaVenda(db, af, quando = NOV) {
  seq += 1
  const c = db.banco
    .prepare("INSERT INTO compras (cliente_id, stripe_session_id, valor_centavos, status, afiliado_id) VALUES (?, ?, 7990, 'pago', ?) RETURNING id")
    .get(af.clienteId, `mp_${seq}`, af.id)
  const compraId = Number(c.id)
  await gravarComissaoBase(db, { afiliadoId: af.id, compraId, aprovadoEm: quando })
  return compraId
}

export async function vendas(db, af, n, quando = NOV) {
  const ids = []
  for (let i = 0; i < n; i++) ids.push(await novaVenda(db, af, quando))
  return ids
}

export const contar = (db, sql, ...args) => Number(db.banco.prepare(sql).get(...args).n)
